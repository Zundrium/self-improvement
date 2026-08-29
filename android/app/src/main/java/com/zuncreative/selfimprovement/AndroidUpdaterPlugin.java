package com.zuncreative.selfimprovement;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.provider.Settings;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "AndroidUpdater")
public class AndroidUpdaterPlugin extends Plugin {
    private static final String RELEASE_URL =
            "https://api.github.com/repos/Zundrium/self-improvement/releases/latest";
    private static final String APK_MIME_TYPE = "application/vnd.android.package-archive";
    private static final String APK_FILE_NAME = "self-improvement-update.apk";
    private static final String PREFERENCES = "android-updater";
    private static final String DOWNLOAD_ID = "download-id";
    private static final String ACCEPTED_VERSION = "accepted-version";
    private static final String ACCEPTED_URL = "accepted-url";
    private static final String ACCEPTED_AT = "accepted-at";
    private static final long NO_DOWNLOAD = -1;
    private static final long ACCEPTED_UPDATE_LIFETIME_MS = 15 * 60 * 1000;

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            handleCompletedDownload(intent);
        }
    };
    private boolean receiverRegistered;

    @Override
    public void load() {
        super.load();
        registerDownloadReceiver();
    }

    @Override
    protected void handleOnStart() {
        resumeUpdate();
    }

    @Override
    protected void handleOnResume() {
        resumeUpdate();
    }

    @Override
    protected void handleOnDestroy() {
        unregisterDownloadReceiver();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void checkLatestRelease(PluginCall call) {
        if (isDebuggable()) {
            call.resolve(unavailableMetadata());
            return;
        }
        execute(() -> loadLatestRelease(call));
    }

    @PluginMethod
    public void install(PluginCall call) {
        Release release = releaseFrom(call);
        if (release == null || !SemanticVersion.isNewer(release.version(), installedVersion())) {
            call.reject("A newer GitHub APK update is required.", "INVALID_UPDATE");
            return;
        }
        if (hasPendingUpdate()) {
            call.reject("An update is already being installed.", "UPDATE_IN_PROGRESS");
            return;
        }
        getActivity().runOnUiThread(() -> showInstallConfirmation(call, release));
    }

    private void loadLatestRelease(PluginCall call) {
        try {
            call.resolve(releaseMetadata(fetchLatestRelease()));
        } catch (Exception exception) {
            call.reject("The latest GitHub release could not be checked.", "UPDATE_CHECK_FAILED", exception);
        }
    }

    private Release fetchLatestRelease() throws Exception {
        HttpURLConnection connection = openReleaseConnection();
        try {
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                throw new UpdateException("GitHub did not return a release.");
            }
            try (InputStream input = connection.getInputStream()) {
                return releaseFrom(new JSONObject(readBody(input)));
            }
        } finally {
            connection.disconnect();
        }
    }

    private HttpURLConnection openReleaseConnection() throws Exception {
        HttpURLConnection connection =
                (HttpURLConnection) URI.create(RELEASE_URL).toURL().openConnection();
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(5000);
        connection.setRequestProperty("Accept", "application/vnd.github+json");
        connection.setRequestProperty("X-GitHub-Api-Version", "2022-11-28");
        connection.setRequestProperty("User-Agent", getContext().getPackageName());
        return connection;
    }

    private String readBody(InputStream input) throws Exception {
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        }
        return body.toString();
    }

    private Release releaseFrom(JSONObject releaseJson) throws Exception {
        String version = releaseJson.optString("tag_name", "");
        String downloadUrl = apkDownloadUrl(releaseJson.optJSONArray("assets"), version);
        if (!GitHubRelease.isTrustedApkUrl(downloadUrl, version)) {
            throw new UpdateException("The GitHub release has no trusted APK asset.");
        }
        return new Release(version, downloadUrl);
    }

    private String apkDownloadUrl(JSONArray assets, String version) {
        if (assets == null) return "";
        for (int index = 0; index < assets.length(); index++) {
            JSONObject asset = assets.optJSONObject(index);
            if (asset == null) continue;
            String url = asset.optString("browser_download_url", "");
            if (GitHubRelease.isTrustedApkUrl(url, version)) return url;
        }
        return "";
    }

    private Release releaseFrom(PluginCall call) {
        String version = call.getString("version");
        String downloadUrl = call.getString("downloadUrl");
        if (!GitHubRelease.isTrustedApkUrl(downloadUrl, version)) return null;
        return new Release(version, downloadUrl);
    }

    private JSObject releaseMetadata(Release release) {
        JSObject metadata = unavailableMetadata();
        metadata.put("available", SemanticVersion.isNewer(release.version(), installedVersion()));
        metadata.put("version", release.version());
        metadata.put("downloadUrl", release.downloadUrl());
        return metadata;
    }

    private JSObject unavailableMetadata() {
        JSObject metadata = new JSObject();
        metadata.put("available", false);
        metadata.put("currentVersion", installedVersion());
        metadata.put("version", "");
        metadata.put("downloadUrl", "");
        return metadata;
    }

    private boolean isDebuggable() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void showInstallConfirmation(PluginCall call, Release release) {
        if (getActivity().isFinishing() || getActivity().isDestroyed()) {
            call.reject("The update confirmation is unavailable.", "UPDATE_UNAVAILABLE");
            return;
        }
        new AlertDialog.Builder(getActivity())
                .setTitle(R.string.update_available_title)
                .setMessage(getContext().getString(R.string.update_available_message, release.version()))
                .setNegativeButton(R.string.update_not_now, (dialog, which) -> call.resolve())
                .setPositiveButton(R.string.update_install, (dialog, which) -> acceptUpdate(call, release))
                .setOnCancelListener(dialog -> call.resolve())
                .show();
    }

    private void acceptUpdate(PluginCall call, Release release) {
        saveAcceptedUpdate(release);
        if (canInstallPackages()) {
            if (downloadAcceptedUpdate()) call.resolve();
            else call.reject("The update could not be downloaded.", "UPDATE_DOWNLOAD_FAILED");
            return;
        }
        if (requestInstallPermission()) call.resolve();
        else call.reject("App installation permission is unavailable.", "UPDATE_PERMISSION_UNAVAILABLE");
    }

    private boolean canInstallPackages() {
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    private boolean requestInstallPermission() {
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        try {
            getActivity().startActivity(intent);
            return true;
        } catch (ActivityNotFoundException exception) {
            cancelPendingUpdate();
            return false;
        }
    }

    private void resumeUpdate() {
        Release accepted = acceptedUpdate();
        if (accepted != null && canInstallPackages()) downloadAcceptedUpdate();
        else if (accepted != null) clearAcceptedUpdate();
        handlePendingDownload();
    }

    private boolean downloadAcceptedUpdate() {
        Release release = acceptedUpdate();
        if (release == null) return false;
        clearAcceptedUpdate();
        return enqueueDownload(release);
    }

    private boolean enqueueDownload(Release release) {
        File destination = apkFile();
        DownloadManager manager = downloadManager();
        if (destination == null || manager == null) return showDownloadFailure();
        destination.delete();
        try {
            long downloadId = manager.enqueue(downloadRequest(release));
            preferences().edit().putLong(DOWNLOAD_ID, downloadId).apply();
            return true;
        } catch (IllegalArgumentException | SecurityException exception) {
            return showDownloadFailure();
        }
    }

    private DownloadManager.Request downloadRequest(Release release) {
        return new DownloadManager.Request(Uri.parse(release.downloadUrl()))
                .setTitle(getContext().getString(R.string.update_download_title, release.version()))
                .setMimeType(APK_MIME_TYPE)
                .setAllowedOverRoaming(false)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalFilesDir(
                        getContext(), Environment.DIRECTORY_DOWNLOADS, APK_FILE_NAME);
    }

    private void registerDownloadReceiver() {
        if (receiverRegistered) return;
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        ContextCompat.registerReceiver(
                getContext(), downloadReceiver, filter, ContextCompat.RECEIVER_EXPORTED);
        receiverRegistered = true;
    }

    private void unregisterDownloadReceiver() {
        if (!receiverRegistered) return;
        getContext().unregisterReceiver(downloadReceiver);
        receiverRegistered = false;
    }

    private void handleCompletedDownload(Intent intent) {
        if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
        long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, NO_DOWNLOAD);
        if (completedId == pendingDownloadId()) handlePendingDownload();
    }

    private void handlePendingDownload() {
        long downloadId = pendingDownloadId();
        DownloadManager manager = downloadManager();
        if (downloadId == NO_DOWNLOAD || manager == null) return;
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        try (Cursor cursor = manager.query(query)) {
            if (!cursor.moveToFirst()) cancelPendingUpdate();
            else handleDownloadStatus(cursor);
        } catch (RuntimeException exception) {
            cancelPendingUpdate();
        }
    }

    private void handleDownloadStatus(Cursor cursor) {
        int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
        if (status == DownloadManager.STATUS_SUCCESSFUL) installDownloadedApk();
        if (status == DownloadManager.STATUS_FAILED) {
            cancelPendingUpdate();
            showDownloadFailure();
        }
    }

    private void installDownloadedApk() {
        if (!canInstallPackages()) {
            requestInstallPermission();
            return;
        }
        File apk = apkFile();
        if (apk == null || !apk.isFile()) {
            cancelPendingUpdate();
            showDownloadFailure();
            return;
        }
        launchPackageInstaller(apk);
    }

    private void launchPackageInstaller(File apk) {
        try {
            Uri uri = FileProvider.getUriForFile(
                    getContext(), getContext().getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_INSTALL_PACKAGE, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(intent);
            clearPendingDownload();
        } catch (RuntimeException exception) {
            cancelPendingUpdate();
            showDownloadFailure();
        }
    }

    private File apkFile() {
        File directory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        return directory == null ? null : new File(directory, APK_FILE_NAME);
    }

    private DownloadManager downloadManager() {
        return getContext().getSystemService(DownloadManager.class);
    }

    private boolean hasPendingUpdate() {
        return pendingDownloadId() != NO_DOWNLOAD || acceptedUpdate() != null;
    }

    private long pendingDownloadId() {
        return preferences().getLong(DOWNLOAD_ID, NO_DOWNLOAD);
    }

    private void saveAcceptedUpdate(Release release) {
        preferences()
                .edit()
                .putString(ACCEPTED_VERSION, release.version())
                .putString(ACCEPTED_URL, release.downloadUrl())
                .putLong(ACCEPTED_AT, System.currentTimeMillis())
                .apply();
    }

    private Release acceptedUpdate() {
        long acceptedAt = preferences().getLong(ACCEPTED_AT, 0);
        if (acceptedAt == 0 || System.currentTimeMillis() - acceptedAt > ACCEPTED_UPDATE_LIFETIME_MS) {
            clearAcceptedUpdate();
            return null;
        }
        String version = preferences().getString(ACCEPTED_VERSION, null);
        String downloadUrl = preferences().getString(ACCEPTED_URL, null);
        if (!GitHubRelease.isTrustedApkUrl(downloadUrl, version)) {
            clearAcceptedUpdate();
            return null;
        }
        return new Release(version, downloadUrl);
    }

    private void clearAcceptedUpdate() {
        preferences()
                .edit()
                .remove(ACCEPTED_VERSION)
                .remove(ACCEPTED_URL)
                .remove(ACCEPTED_AT)
                .apply();
    }

    private void clearPendingDownload() {
        preferences().edit().remove(DOWNLOAD_ID).apply();
    }

    private void cancelPendingUpdate() {
        DownloadManager manager = downloadManager();
        long downloadId = pendingDownloadId();
        if (manager != null && downloadId != NO_DOWNLOAD) manager.remove(downloadId);
        clearPendingDownload();
        clearAcceptedUpdate();
        File apk = apkFile();
        if (apk != null) apk.delete();
    }

    private boolean showDownloadFailure() {
        Toast.makeText(getContext(), R.string.update_download_failed, Toast.LENGTH_LONG).show();
        return false;
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    private record Release(String version, String downloadUrl) {}

    private static final class UpdateException extends Exception {
        UpdateException(String message) {
            super(message);
        }
    }
}
