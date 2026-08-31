package com.zuncreative.selfimprovement;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "AndroidUsageEvents")
public class AndroidUsageEventsPlugin extends Plugin {
    private static final long STATE_LOOKBACK_MILLISECONDS = 24 * 60 * 60 * 1000L;
    private static final long MAX_QUERY_INTERVAL_MILLISECONDS = 7 * 24 * 60 * 60 * 1000L;
    private static final int MAX_ACTIVITY_INTERVALS = 5_000;
    private static final int MAX_SCREEN_INTERACTIVE_EVENTS = 2_000;
    private static final int MAX_FOREGROUND_APPS = MAX_ACTIVITY_INTERVALS;

    @PluginMethod
    public void queryEvents(PluginCall call) {
        Long beginTime = call.getLong("beginTime");
        Long endTime = call.getLong("endTime");
        if (beginTime == null || endTime == null || beginTime < 0 || endTime <= beginTime) {
            call.reject("A valid usage event interval is required");
            return;
        }
        if (endTime - beginTime > MAX_QUERY_INTERVAL_MILLISECONDS) {
            call.reject("Usage event intervals are limited to seven days");
            return;
        }
        UsageStatsManager manager = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
        if (manager == null) {
            call.reject("Android usage events are unavailable");
            return;
        }
        try {
            call.resolve(readEvents(manager, beginTime, endTime));
        } catch (UsageEventsLimitException exception) {
            call.reject(exception.getMessage());
        } catch (Exception exception) {
            call.reject("Android usage events could not be read", exception);
        }
    }

    private JSObject readEvents(UsageStatsManager manager, long beginTime, long endTime) {
        long queryStart = Math.max(0, beginTime - STATE_LOOKBACK_MILLISECONDS);
        UsageEvents events = manager.queryEvents(queryStart, endTime);
        if (events == null) throw new IllegalStateException("Android usage events are unavailable while the device is locked");
        JSArray intervals = new JSArray();
        JSArray interactiveEvents = new JSArray();
        Map<String, Long> foregroundStarts = new HashMap<>();
        UsageEvents.Event event = new UsageEvents.Event();
        while (events.hasNextEvent()) {
            events.getNextEvent(event);
            collectEvent(event, beginTime, endTime, foregroundStarts, intervals, interactiveEvents);
        }
        closeForegroundApps(foregroundStarts, beginTime, endTime, intervals);
        JSObject result = new JSObject();
        result.put("activityIntervals", intervals);
        result.put("screenInteractive", interactiveEvents);
        return result;
    }

    private void collectEvent(
        UsageEvents.Event event,
        long beginTime,
        long endTime,
        Map<String, Long> foregroundStarts,
        JSArray intervals,
        JSArray interactiveEvents
    ) {
        int eventType = event.getEventType();
        long timestamp = event.getTimeStamp();
        String packageName = event.getPackageName();
        if (isForeground(eventType) && packageName != null) {
            if (!foregroundStarts.containsKey(packageName) && foregroundStarts.size() >= MAX_FOREGROUND_APPS) {
                throw new UsageEventsLimitException();
            }
            foregroundStarts.putIfAbsent(packageName, timestamp);
        } else if (isBackground(eventType) && packageName != null) {
            Long start = foregroundStarts.remove(packageName);
            if (start != null) addInterval(intervals, packageName, start, timestamp, beginTime, endTime);
        } else if (eventType == UsageEvents.Event.SCREEN_INTERACTIVE && timestamp >= beginTime && timestamp < endTime) {
            if (interactiveEvents.length() >= MAX_SCREEN_INTERACTIVE_EVENTS) {
                throw new UsageEventsLimitException();
            }
            interactiveEvents.put(timestamp);
        }
    }

    private boolean isForeground(int eventType) {
        return eventType == UsageEvents.Event.ACTIVITY_RESUMED || eventType == UsageEvents.Event.MOVE_TO_FOREGROUND;
    }

    private boolean isBackground(int eventType) {
        return eventType == UsageEvents.Event.ACTIVITY_PAUSED || eventType == UsageEvents.Event.MOVE_TO_BACKGROUND;
    }

    private void closeForegroundApps(
        Map<String, Long> foregroundStarts,
        long beginTime,
        long endTime,
        JSArray intervals
    ) {
        for (Map.Entry<String, Long> entry : foregroundStarts.entrySet()) {
            addInterval(intervals, entry.getKey(), entry.getValue(), endTime, beginTime, endTime);
        }
    }

    private void addInterval(
        JSArray intervals,
        String packageName,
        long rawStart,
        long rawEnd,
        long beginTime,
        long endTime
    ) {
        long start = Math.max(rawStart, beginTime);
        long end = Math.min(rawEnd, endTime);
        if (end <= start) return;
        if (intervals.length() >= MAX_ACTIVITY_INTERVALS) throw new UsageEventsLimitException();
        JSObject interval = new JSObject();
        interval.put("packageName", packageName);
        interval.put("startTime", start);
        interval.put("endTime", end);
        intervals.put(interval);
    }

    private static final class UsageEventsLimitException extends RuntimeException {
        UsageEventsLimitException() {
            super("Android usage event results exceed the safe sync limit");
        }
    }
}
