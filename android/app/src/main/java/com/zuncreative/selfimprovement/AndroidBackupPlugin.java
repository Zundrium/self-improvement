package com.zuncreative.selfimprovement;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.net.Uri;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "AndroidBackup")
public class AndroidBackupPlugin extends Plugin {
    private static final String DRIVE_AUTHORITY = "com.google.android.apps.docs.storage";
    private static final String MIME_TYPE = "application/json";
    private static final String PREFERENCES = "self-improvement-backup";
    private static final String TREE_URI = "tree-uri";
    private static final String LAST_SUCCESS_AT = "last-success-at";
    private static final String LAST_FAILURE_AT = "last-failure-at";
    private static final String LAST_FAILURE_MESSAGE = "last-failure-message";
    private static final String EXPORT_CANCELLED = "EXPORT_CANCELLED";

    @PluginMethod
    public void configure(PluginCall call) {
        try {
            Uri treeUri = validTreeUri(required(call, "treeUri"));
            persistPermission(treeUri);
            DocumentFile root = verifyWritableTree(treeUri);
            rotateBackups(new BackupDestination(treeUri, root));
            saveDestination(treeUri);
            call.resolve(status());
        } catch (Exception exception) {
            call.reject(destinationMessage(exception), "INVALID_DRIVE_FOLDER");
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void writeBackup(PluginCall call) {
        try {
            BackupInput input = backupInput(call);
            BackupRecord backup = writeManagedBackup(input);
            String lastSuccessAt = saveSuccess();
            call.resolve(writeResult(backup.name(), lastSuccessAt));
        } catch (Exception exception) {
            saveFailure(Instant.now(), "Google Drive backup could not be written.");
            call.reject("Google Drive backup could not be written.", "BACKUP_WRITE_FAILED");
        }
    }

    @PluginMethod
    public void exportFile(PluginCall call) {
        try {
            BackupInput input = backupInput(call);
            Intent intent = exportIntent(BackupFilePolicy.fileName(input.createdAt()));
            startActivityForResult(call, intent, "exportFileResult");
        } catch (Exception exception) {
            call.reject("The backup file could not be exported.", "EXPORT_FAILED");
        }
    }

    @ActivityCallback
    private void exportFileResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            call.reject("Backup export canceled.", EXPORT_CANCELLED);
            return;
        }
        try {
            exportToSelectedUri(call, result.getData());
        } catch (Exception exception) {
            call.reject("The backup file could not be exported.", "EXPORT_FAILED");
        }
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        try {
            Uri uri = readableContentUri(required(call, "uri"));
            int maxBytes = positiveLimit(call.getInt("maxBytes"));
            JSObject result = new JSObject();
            result.put("contents", readContents(uri, maxBytes));
            call.resolve(result);
        } catch (Exception exception) {
            call.reject(exception.getMessage(), "BACKUP_READ_FAILED");
        }
    }

    @PluginMethod
    public void recordFailure(PluginCall call) {
        try {
            Instant failedAt = Instant.parse(required(call, "failedAt"));
            saveFailure(failedAt, safeMessage(required(call, "message")));
            call.resolve();
        } catch (Exception exception) {
            call.reject("Backup failure could not be recorded.", "METADATA_WRITE_FAILED");
        }
    }

    private BackupRecord writeManagedBackup(BackupInput input) throws Exception {
        BackupDestination destination = writableDestination();
        String name = BackupFilePolicy.fileName(input.createdAt());
        DocumentFile file = destination.root().createFile(MIME_TYPE, name);
        if (file == null) throw new BackupException("Backup file could not be created.");
        String actualName = file.getName();
        if (!name.equals(actualName)) {
            file.delete();
            throw new BackupException("Backup file name could not be preserved.");
        }
        BackupRecord backup = backupRecord(file, name);
        try {
            writeContents(file.getUri(), input.contents());
            rotateBackups(destination);
            return backup;
        } catch (Exception exception) {
            file.delete();
            throw exception;
        }
    }

    private void rotateBackups(BackupDestination destination) throws Exception {
        for (BackupRecord excess : BackupFilePolicy.excess(backupFiles(destination))) {
            if (!deleteBackup(excess)) throw new BackupException("Backup rotation failed.");
        }
    }

    private List<BackupRecord> backupFiles(BackupDestination destination) {
        List<BackupRecord> backups = new ArrayList<>();
        for (DocumentFile file : destination.root().listFiles()) {
            String name = file.getName();
            if (!file.isFile() || !BackupFilePolicy.isBackupName(name)) continue;
            backups.add(backupRecord(file, name));
        }
        return backups;
    }

    private BackupRecord backupRecord(DocumentFile file, String name) {
        return new BackupRecord(file.getUri().toString(), name, BackupFilePolicy.createdAt(name));
    }

    private boolean deleteBackup(BackupRecord backup) {
        Uri uri = Uri.parse(backup.uri());
        if (!DRIVE_AUTHORITY.equals(uri.getAuthority())) return false;
        if (!BackupFilePolicy.isBackupName(backup.name())) return false;
        DocumentFile file = DocumentFile.fromSingleUri(getContext(), uri);
        return file == null || !file.exists() || file.delete();
    }

    private void exportToSelectedUri(PluginCall call, Intent data) throws Exception {
        if (data == null || data.getData() == null) throw new BackupException("No export file selected.");
        BackupInput input = backupInput(call);
        writeContents(data.getData(), input.contents());
        JSObject result = new JSObject();
        result.put("fileName", BackupFilePolicy.fileName(input.createdAt()));
        call.resolve(result);
    }

    private Intent exportIntent(String fileName) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(MIME_TYPE);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        return intent;
    }

    private BackupInput backupInput(PluginCall call) throws Exception {
        String contents = required(call, "contents");
        Instant createdAt = Instant.parse(required(call, "createdAt"));
        return new BackupInput(contents, createdAt);
    }

    private void writeContents(Uri uri, String contents) throws Exception {
        OutputStream output = resolver().openOutputStream(uri, "wt");
        if (output == null) throw new BackupException("Backup output could not be opened.");
        try (OutputStreamWriter writer = new OutputStreamWriter(output, StandardCharsets.UTF_8)) {
            writer.write(contents);
        }
    }

    private String readContents(Uri uri, int maxBytes) throws Exception {
        InputStream input = resolver().openInputStream(uri);
        if (input == null) throw new BackupException("The selected backup could not be opened.");
        try (input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            int count;
            while ((count = input.read(buffer)) != -1) {
                total += count;
                if (total > maxBytes) throw new BackupException("The backup file is too large.");
                output.write(buffer, 0, count);
            }
            return new String(output.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    private Uri readableContentUri(String value) throws Exception {
        Uri uri = Uri.parse(value);
        if (!ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) {
            throw new BackupException("The selected backup could not be read.");
        }
        return uri;
    }

    private int positiveLimit(Integer value) throws Exception {
        if (value == null || value <= 0) throw new BackupException("A file size limit is required.");
        return value;
    }

    private BackupDestination writableDestination() throws Exception {
        String storedUri = preferences().getString(TREE_URI, null);
        if (storedUri == null) throw new BackupException("No Google Drive folder is configured.");
        Uri treeUri = validTreeUri(storedUri);
        if (!hasPersistedPermission(treeUri)) throw new BackupException("Folder access has expired.");
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
        if (root == null || !root.isDirectory() || !root.canRead() || !root.canWrite()) {
            throw new BackupException("The Google Drive folder is not readable and writable.");
        }
        return new BackupDestination(treeUri, root);
    }

    private DocumentFile verifyWritableTree(Uri treeUri) throws Exception {
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
        if (root == null || !root.isDirectory() || !root.canRead() || !root.canWrite()) {
            throw new BackupException("Choose a readable and writable folder in Google Drive.");
        }
        return root;
    }

    private Uri validTreeUri(String value) throws Exception {
        Uri uri = Uri.parse(value);
        boolean valid = ContentResolver.SCHEME_CONTENT.equals(uri.getScheme());
        valid = valid && DRIVE_AUTHORITY.equals(uri.getAuthority());
        valid = valid && DocumentsContract.isTreeUri(uri);
        if (!valid) throw new BackupException("Choose a folder in Google Drive.");
        return uri;
    }

    private void persistPermission(Uri uri) {
        int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
        resolver().takePersistableUriPermission(uri, flags);
    }

    private void saveDestination(Uri treeUri) throws Exception {
        String previous = preferences().getString(TREE_URI, null);
        if (treeUri.toString().equals(previous)) return;
        boolean saved = preferences()
            .edit()
            .putString(TREE_URI, treeUri.toString())
            .remove(LAST_SUCCESS_AT)
            .remove(LAST_FAILURE_AT)
            .remove(LAST_FAILURE_MESSAGE)
            .commit();
        if (!saved) throw new BackupException("Google Drive folder could not be saved.");
        releasePreviousPermission(previous);
    }

    private void releasePreviousPermission(String previous) {
        if (previous == null) return;
        try {
            resolver().releasePersistableUriPermission(
                Uri.parse(previous),
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );
        } catch (Exception exception) {
            return;
        }
    }

    private JSObject status() {
        SharedPreferences preferences = preferences();
        JSObject status = new JSObject();
        status.put("configured", configured(preferences.getString(TREE_URI, null)));
        putIfPresent(status, "lastSuccessAt", preferences.getString(LAST_SUCCESS_AT, null));
        putIfPresent(status, "lastFailureAt", preferences.getString(LAST_FAILURE_AT, null));
        putIfPresent(status, "lastFailureMessage", preferences.getString(LAST_FAILURE_MESSAGE, null));
        return status;
    }

    private boolean configured(String value) {
        if (value == null) return false;
        try {
            return hasPersistedPermission(validTreeUri(value));
        } catch (Exception exception) {
            return false;
        }
    }

    private boolean hasPersistedPermission(Uri treeUri) {
        for (UriPermission permission : resolver().getPersistedUriPermissions()) {
            if (
                treeUri.equals(permission.getUri()) &&
                permission.isReadPermission() &&
                permission.isWritePermission()
            ) return true;
        }
        return false;
    }

    private String saveSuccess() throws Exception {
        String succeededAt = Instant.now().toString();
        boolean saved = preferences()
            .edit()
            .putString(LAST_SUCCESS_AT, succeededAt)
            .remove(LAST_FAILURE_AT)
            .remove(LAST_FAILURE_MESSAGE)
            .commit();
        if (!saved) throw new BackupException("Backup success could not be recorded.");
        return succeededAt;
    }

    private void saveFailure(Instant failedAt, String message) {
        preferences()
            .edit()
            .putString(LAST_FAILURE_AT, failedAt.toString())
            .putString(LAST_FAILURE_MESSAGE, safeMessage(message))
            .commit();
    }

    private JSObject writeResult(String fileName, String lastSuccessAt) {
        JSObject result = new JSObject();
        result.put("fileName", fileName);
        result.put("lastSuccessAt", lastSuccessAt);
        return result;
    }

    private void putIfPresent(JSObject object, String key, String value) {
        if (value != null) object.put(key, value);
    }

    private String required(PluginCall call, String key) throws Exception {
        String value = call.getString(key);
        if (value == null || value.isEmpty()) throw new BackupException(key + " is required.");
        return value;
    }

    private String safeMessage(String message) {
        String fallback = "Google Drive backup failed.";
        if (message == null || message.trim().isEmpty()) return fallback;
        return message.substring(0, Math.min(message.length(), 200));
    }

    private String destinationMessage(Exception exception) {
        if (exception instanceof BackupException) return exception.getMessage();
        return "Google Drive folder access could not be saved.";
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    private ContentResolver resolver() {
        return getContext().getContentResolver();
    }

    private static final class BackupInput {
        private final String contents;
        private final Instant createdAt;

        BackupInput(String contents, Instant createdAt) {
            this.contents = contents;
            this.createdAt = createdAt;
        }

        String contents() {
            return contents;
        }

        Instant createdAt() {
            return createdAt;
        }
    }

    private static final class BackupDestination {
        private final Uri treeUri;
        private final DocumentFile root;

        BackupDestination(Uri treeUri, DocumentFile root) {
            this.treeUri = treeUri;
            this.root = root;
        }

        Uri treeUri() {
            return treeUri;
        }

        DocumentFile root() {
            return root;
        }
    }

    private static final class BackupException extends Exception {
        BackupException(String message) {
            super(message);
        }
    }
}
