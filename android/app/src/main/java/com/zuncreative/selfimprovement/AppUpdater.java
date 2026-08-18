package com.zuncreative.selfimprovement;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.provider.Settings;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

final class AppUpdater {
    private static final String RELEASE_URL = "https://self.zund.cc/api/android-update";
    private static final String APK_MIME_TYPE = "application/vnd.android.package-archive";
    private static final String APK_FILE_NAME = "self-improvement-update.apk";
    private static final String PREFERENCES = "app_updater";
    private static final String DOWNLOAD_ID = "download_id";
    private static final String ACCEPTED_TAG = "accepted_tag";
    private static final String ACCEPTED_URL = "accepted_url";
    private static final String ACCEPTED_AT = "accepted_at";
    private static final long NO_DOWNLOAD = -1;
    private static final long ACCEPTED_UPDATE_LIFETIME_MS = 15 * 60 * 1000;
    private static final int INSTALL_PERMISSION_REQUEST = 401;

    private final Activity activity;
    private final DownloadManager downloadManager;
    private final SharedPreferences preferences;
    private final ExecutorService updateChecker = Executors.newSingleThreadExecutor();
    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            handleCompletedBroadcast(intent);
        }
    };
    private boolean receiverRegistered;

    AppUpdater(Activity activity) {
        this.activity = activity;
        downloadManager = activity.getSystemService(DownloadManager.class);
        preferences = activity.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    void checkForUpdate() {
        if (isDebuggable() || hasPendingUpdate()) return;
        updateChecker.execute(this::loadAvailableUpdate);
    }

    void start() {
        registerReceiver();
        resumeAcceptedUpdate();
        handlePendingDownload();
    }

    void stop() {
        if (!receiverRegistered) return;
        activity.unregisterReceiver(downloadReceiver);
        receiverRegistered = false;
    }

    void destroy() {
        updateChecker.shutdownNow();
    }

    void handleActivityResult(int requestCode) {
        if (requestCode != INSTALL_PERMISSION_REQUEST) return;
        if (canInstallPackages()) resumeUpdate();
        else cancelPendingUpdate();
    }

    private void loadAvailableUpdate() {
        try {
            Release release = fetchLatestRelease();
            if (release == null || !isNewer(release)) return;
            activity.runOnUiThread(() -> showUpdate(release));
        } catch (Exception ignored) {
        }
    }

    private Release fetchLatestRelease() throws Exception {
        HttpURLConnection connection = openReleaseConnection();
        try {
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) return null;
            try (InputStream input = connection.getInputStream()) {
                return parseRelease(new JSONObject(readBody(input)));
            }
        } finally {
            connection.disconnect();
        }
    }

    private String readBody(InputStream input) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8));
        StringBuilder body = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) body.append(line);
        return body.toString();
    }

    private HttpURLConnection openReleaseConnection() throws Exception {
        HttpURLConnection connection =
                (HttpURLConnection) URI.create(RELEASE_URL).toURL().openConnection();
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(5000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", activity.getPackageName());
        return connection;
    }

    private Release parseRelease(JSONObject releaseJson) {
        String tag = releaseJson.optString("tag_name", "");
        String url = releaseJson.optString("apk_url", "");
        return isTrustedDownload(url) ? new Release(tag, url) : null;
    }

    private boolean isTrustedDownload(String url) {
        try {
            URI uri = URI.create(url);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && "self.zund.cc".equalsIgnoreCase(uri.getHost())
                    && "/api/android-update/download".equals(uri.getPath());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean isNewer(Release release) {
        return SemanticVersion.isNewer(release.tag(), installedVersion());
    }

    private String installedVersion() {
        try {
            return activity.getPackageManager()
                    .getPackageInfo(activity.getPackageName(), 0)
                    .versionName;
        } catch (PackageManager.NameNotFoundException exception) {
            return null;
        }
    }

    private boolean isDebuggable() {
        int flags = activity.getApplicationInfo().flags;
        return (flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void showUpdate(Release release) {
        if (activity.isFinishing() || activity.isDestroyed() || hasPendingUpdate()) return;
        new AlertDialog.Builder(activity)
                .setTitle(R.string.update_available_title)
                .setMessage(activity.getString(R.string.update_available_message, release.tag()))
                .setNegativeButton(R.string.update_not_now, null)
                .setPositiveButton(R.string.update_install, (dialog, which) -> acceptUpdate(release))
                .show();
    }

    private void acceptUpdate(Release release) {
        saveAcceptedUpdate(release);
        if (canInstallPackages()) downloadAcceptedUpdate();
        else requestInstallPermission();
    }

    private boolean canInstallPackages() {
        return activity.getPackageManager().canRequestPackageInstalls();
    }

    private void requestInstallPermission() {
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
        intent.setData(Uri.parse("package:" + activity.getPackageName()));
        try {
            activity.startActivityForResult(intent, INSTALL_PERMISSION_REQUEST);
        } catch (ActivityNotFoundException exception) {
            cancelPendingUpdate();
        }
    }

    private void resumeUpdate() {
        if (acceptedUpdate() != null) downloadAcceptedUpdate();
        else handlePendingDownload();
    }

    private void resumeAcceptedUpdate() {
        if (acceptedUpdate() != null && canInstallPackages()) downloadAcceptedUpdate();
    }

    private void downloadAcceptedUpdate() {
        Release release = acceptedUpdate();
        if (release == null) return;
        clearAcceptedUpdate();
        enqueueDownload(release);
    }

    private void enqueueDownload(Release release) {
        File destination = apkFile();
        if (destination == null) {
            showDownloadFailure();
            return;
        }
        destination.delete();
        try {
            long downloadId = downloadManager.enqueue(downloadRequest(release));
            preferences.edit().putLong(DOWNLOAD_ID, downloadId).apply();
        } catch (IllegalArgumentException | SecurityException exception) {
            showDownloadFailure();
        }
    }

    private DownloadManager.Request downloadRequest(Release release) {
        return new DownloadManager.Request(Uri.parse(release.apkUrl()))
                .setTitle(activity.getString(R.string.update_download_title, release.tag()))
                .setMimeType(APK_MIME_TYPE)
                .setAllowedOverRoaming(false)
                .setNotificationVisibility(
                        DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalFilesDir(
                        activity, Environment.DIRECTORY_DOWNLOADS, APK_FILE_NAME);
    }

    private void registerReceiver() {
        if (receiverRegistered) return;
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        ContextCompat.registerReceiver(
                activity, downloadReceiver, filter, ContextCompat.RECEIVER_EXPORTED);
        receiverRegistered = true;
    }

    private void handleCompletedBroadcast(Intent intent) {
        if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
        long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, NO_DOWNLOAD);
        if (completedId == pendingDownloadId()) handlePendingDownload();
    }

    private void handlePendingDownload() {
        long downloadId = pendingDownloadId();
        if (downloadId == NO_DOWNLOAD) return;
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        try (Cursor cursor = downloadManager.query(query)) {
            if (!cursor.moveToFirst()) cancelPendingUpdate();
            else handleDownloadStatus(cursor);
        } catch (RuntimeException exception) {
            cancelPendingUpdate();
        }
    }

    private void handleDownloadStatus(Cursor cursor) {
        int column = cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS);
        int status = cursor.getInt(column);
        if (status == DownloadManager.STATUS_SUCCESSFUL) installDownloadedApk();
        else if (status == DownloadManager.STATUS_FAILED) {
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
                    activity, activity.getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_INSTALL_PACKAGE, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
            clearPendingDownload();
        } catch (RuntimeException exception) {
            cancelPendingUpdate();
            showDownloadFailure();
        }
    }

    private File apkFile() {
        File directory = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        return directory == null ? null : new File(directory, APK_FILE_NAME);
    }

    private long pendingDownloadId() {
        return preferences.getLong(DOWNLOAD_ID, NO_DOWNLOAD);
    }

    private boolean hasPendingUpdate() {
        return pendingDownloadId() != NO_DOWNLOAD || acceptedUpdate() != null;
    }

    private void saveAcceptedUpdate(Release release) {
        preferences.edit()
                .putString(ACCEPTED_TAG, release.tag())
                .putString(ACCEPTED_URL, release.apkUrl())
                .putLong(ACCEPTED_AT, System.currentTimeMillis())
                .apply();
    }

    private Release acceptedUpdate() {
        long acceptedAt = preferences.getLong(ACCEPTED_AT, 0);
        if (acceptedAt == 0) return null;
        if (System.currentTimeMillis() - acceptedAt > ACCEPTED_UPDATE_LIFETIME_MS) {
            clearAcceptedUpdate();
            return null;
        }
        String tag = preferences.getString(ACCEPTED_TAG, null);
        String url = preferences.getString(ACCEPTED_URL, null);
        return tag == null || url == null ? null : new Release(tag, url);
    }

    private void clearAcceptedUpdate() {
        preferences.edit()
                .remove(ACCEPTED_TAG)
                .remove(ACCEPTED_URL)
                .remove(ACCEPTED_AT)
                .apply();
    }

    private void clearPendingDownload() {
        preferences.edit().remove(DOWNLOAD_ID).apply();
    }

    private void cancelPendingUpdate() {
        long downloadId = pendingDownloadId();
        if (downloadId != NO_DOWNLOAD) downloadManager.remove(downloadId);
        clearPendingDownload();
        clearAcceptedUpdate();
        File apk = apkFile();
        if (apk != null) apk.delete();
    }

    private void showDownloadFailure() {
        Toast.makeText(activity, R.string.update_download_failed, Toast.LENGTH_LONG).show();
    }

    private record Release(String tag, String apkUrl) {}
}
