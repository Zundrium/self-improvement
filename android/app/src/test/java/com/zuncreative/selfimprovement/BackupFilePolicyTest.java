package com.zuncreative.selfimprovement;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public class BackupFilePolicyTest {
    @Test
    public void createsDeterministicUtcFileName() {
        String name = BackupFilePolicy.fileName(Instant.parse("2026-03-21T12:34:56.789Z"));

        assertEquals("self-improvement-backup-2026-03-21T12-34-56-789Z.json", name);
        assertEquals(Instant.parse("2026-03-21T12:34:56.789Z"), BackupFilePolicy.createdAt(name));
        assertTrue(BackupFilePolicy.isBackupName(name));
        assertFalse(BackupFilePolicy.isBackupName("another-file.json"));
        assertFalse(
            BackupFilePolicy.isBackupName("self-improvement-backup-2026-99-21T12-34-56-789Z.json")
        );
    }

    @Test
    public void retainsOnlyFiveNewestManagedBackups() {
        List<BackupRecord> records = records(7);

        List<BackupRecord> excess = BackupFilePolicy.excess(records);

        assertEquals(5, records.size() - excess.size());
        assertEquals(List.of("uri-1", "uri-0"), uris(excess));
    }

    private List<BackupRecord> records(int count) {
        List<BackupRecord> records = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            Instant instant = Instant.parse("2026-03-21T12:34:56.000Z").plusSeconds(index);
            records.add(
                new BackupRecord("uri-" + index, BackupFilePolicy.fileName(instant), instant)
            );
        }
        return records;
    }

    private List<String> uris(List<BackupRecord> records) {
        return records.stream().map(BackupRecord::uri).toList();
    }
}
