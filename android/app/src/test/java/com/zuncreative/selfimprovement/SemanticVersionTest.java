package com.zuncreative.selfimprovement;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class SemanticVersionTest {
    @Test
    public void detectsNewerVersions() {
        assertTrue(SemanticVersion.isNewer("v0.1.2", "0.1.1"));
        assertTrue(SemanticVersion.isNewer("v0.1.10", "0.1.9"));
        assertTrue(SemanticVersion.isNewer("v1.0", "0.99.99"));
    }

    @Test
    public void rejectsSameOrOlderVersions() {
        assertFalse(SemanticVersion.isNewer("v0.1.1", "0.1.1"));
        assertFalse(SemanticVersion.isNewer("v0.1.0", "0.1.1"));
        assertFalse(SemanticVersion.isNewer("v1.0.0", "1"));
    }

    @Test
    public void rejectsInvalidVersions() {
        assertFalse(SemanticVersion.isNewer("latest", "0.1.1"));
        assertFalse(SemanticVersion.isNewer("v0..2", "0.1.1"));
        assertFalse(SemanticVersion.isNewer(null, "0.1.1"));
    }
}
