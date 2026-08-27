package com.zuncreative.selfimprovement;

import java.time.Instant;

final class BackupRecord {
    private final String uri;
    private final String name;
    private final Instant createdAt;

    BackupRecord(String uri, String name, Instant createdAt) {
        this.uri = uri;
        this.name = name;
        this.createdAt = createdAt;
    }

    String uri() {
        return uri;
    }

    String name() {
        return name;
    }

    Instant createdAt() {
        return createdAt;
    }
}
