package com.zuncreative.selfimprovement;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class GitHubReleaseTest {
    private static final String VERSION = "v0.22.0";

    @Test
    public void acceptsTheExpectedApkForThisProjectsRelease() {
        assertTrue(GitHubRelease.isTrustedApkUrl(releaseUrl(VERSION), VERSION));
    }

    @Test
    public void rejectsUnexpectedRepositoriesVersionsAndNames() {
        assertFalse(
                GitHubRelease.isTrustedApkUrl(
                        "https://github.com/other/project/releases/download/v0.22.0/update.apk",
                        VERSION));
        assertFalse(GitHubRelease.isTrustedApkUrl(releaseUrl("v0.21.0"), VERSION));
        assertFalse(
                GitHubRelease.isTrustedApkUrl(
                        "https://github.com/Zundrium/self-improvement/releases/download/v0.22.0/update.apk",
                        VERSION));
    }

    @Test
    public void rejectsInvalidValues() {
        assertFalse(GitHubRelease.isTrustedApkUrl("not a URL", VERSION));
        assertFalse(GitHubRelease.isTrustedApkUrl(null, VERSION));
        assertFalse(GitHubRelease.isTrustedApkUrl(releaseUrl(VERSION), null));
    }

    private static String releaseUrl(String version) {
        return "https://github.com/Zundrium/self-improvement/releases/download/"
                + version
                + "/self-improvement-"
                + version
                + ".apk";
    }
}
