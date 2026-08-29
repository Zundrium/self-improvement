package com.zuncreative.selfimprovement;

import java.net.URI;

final class GitHubRelease {
    private static final String DOWNLOAD_PATH = "/Zundrium/self-improvement/releases/download/";

    private GitHubRelease() {}

    static boolean isTrustedApkUrl(String value, String version) {
        if (value == null || version == null) return false;
        try {
            URI uri = URI.create(value);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && "github.com".equalsIgnoreCase(uri.getHost())
                    && expectedPath(version).equals(uri.getPath());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String expectedPath(String version) {
        return DOWNLOAD_PATH + version + "/self-improvement-" + version + ".apk";
    }
}
