package com.zuncreative.selfimprovement;

import java.math.BigInteger;

final class SemanticVersion {
    private SemanticVersion() {}

    static boolean isNewer(String candidate, String installed) {
        BigInteger[] candidateParts = parse(candidate);
        BigInteger[] installedParts = parse(installed);
        if (candidateParts == null || installedParts == null) return false;
        return compare(candidateParts, installedParts) > 0;
    }

    private static BigInteger[] parse(String version) {
        if (version == null) return null;
        String core = version.trim().replaceFirst("^[vV]", "").split("[-+]", 2)[0];
        if (core.isEmpty()) return null;
        String[] parts = core.split("\\.", -1);
        BigInteger[] numbers = new BigInteger[parts.length];
        for (int index = 0; index < parts.length; index++) {
            if (!parts[index].matches("\\d+")) return null;
            numbers[index] = new BigInteger(parts[index]);
        }
        return numbers;
    }

    private static int compare(BigInteger[] first, BigInteger[] second) {
        int length = Math.max(first.length, second.length);
        for (int index = 0; index < length; index++) {
            int result = part(first, index).compareTo(part(second, index));
            if (result != 0) return result;
        }
        return 0;
    }

    private static BigInteger part(BigInteger[] parts, int index) {
        return index < parts.length ? parts[index] : BigInteger.ZERO;
    }
}
