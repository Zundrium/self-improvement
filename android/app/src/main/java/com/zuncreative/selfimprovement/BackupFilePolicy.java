package com.zuncreative.selfimprovement;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

final class BackupFilePolicy {
    static final String PREFIX = "self-improvement-backup-";
    static final int MAX_BACKUPS = 5;
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter
        .ofPattern("uuuu-MM-dd'T'HH-mm-ss-SSS'Z'")
        .withZone(ZoneOffset.UTC);
    private static final Pattern BACKUP_NAME = Pattern.compile(
        "^self-improvement-backup-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z\\.json$"
    );

    private BackupFilePolicy() {}

    static String fileName(Instant createdAt) {
        return PREFIX + TIMESTAMP.format(createdAt) + ".json";
    }

    static boolean isBackupName(String name) {
        if (name == null || !BACKUP_NAME.matcher(name).matches()) return false;
        try {
            createdAt(name);
            return true;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    static Instant createdAt(String name) {
        String timestamp = name.substring(PREFIX.length(), name.length() - ".json".length());
        return LocalDateTime.parse(timestamp, TIMESTAMP).toInstant(ZoneOffset.UTC);
    }

    static List<BackupRecord> excess(List<BackupRecord> records) {
        List<BackupRecord> sorted = sorted(records);
        if (sorted.size() <= MAX_BACKUPS) return new ArrayList<>();
        return new ArrayList<>(sorted.subList(MAX_BACKUPS, sorted.size()));
    }

    private static List<BackupRecord> sorted(List<BackupRecord> records) {
        List<BackupRecord> sorted = new ArrayList<>(records);
        sorted.sort(
            Comparator.comparing(BackupRecord::createdAt)
                .reversed()
                .thenComparing(BackupRecord::name, Comparator.reverseOrder())
        );
        return sorted;
    }
}
