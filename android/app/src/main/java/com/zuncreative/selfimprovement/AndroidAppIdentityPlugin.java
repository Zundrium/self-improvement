package com.zuncreative.selfimprovement;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;

@CapacitorPlugin(name = "AndroidAppIdentity")
public class AndroidAppIdentityPlugin extends Plugin {
    private static final int ICON_SIZE = 96;

    @PluginMethod
    public void resolve(PluginCall call) {
        JSObject applications = new JSObject();
        JSArray packageNames = call.getArray("packageNames", new JSArray());
        boolean includeIcons = call.getBoolean("includeIcons", true);
        for (int index = 0; index < packageNames.length(); index++) {
            addApplication(applications, packageNames.optString(index), includeIcons);
        }
        JSObject result = new JSObject();
        result.put("applications", applications);
        call.resolve(result);
    }

    private void addApplication(JSObject applications, String packageName, boolean includeIcons) {
        ApplicationInfo applicationInfo = applicationInfo(packageName);
        if (applicationInfo == null) return;
        applications.put(packageName, application(applicationInfo, includeIcons));
    }

    private ApplicationInfo applicationInfo(String packageName) {
        if (packageName == null || packageName.trim().isEmpty()) return null;
        try {
            return getContext().getPackageManager().getApplicationInfo(packageName, 0);
        } catch (PackageManager.NameNotFoundException exception) {
            return null;
        }
    }

    private JSObject application(ApplicationInfo applicationInfo, boolean includeIcons) {
        JSObject application = new JSObject();
        String label = applicationLabel(applicationInfo);
        if (label != null) application.put("label", label);
        String icon = includeIcons ? applicationIcon(applicationInfo) : null;
        if (icon != null) application.put("icon", icon);
        return application;
    }

    private String applicationLabel(ApplicationInfo applicationInfo) {
        CharSequence label = applicationInfo.loadLabel(getContext().getPackageManager());
        return label == null ? null : label.toString();
    }

    private String applicationIcon(ApplicationInfo applicationInfo) {
        Drawable drawable = applicationInfo.loadIcon(getContext().getPackageManager());
        if (drawable == null) return null;
        return iconData(bitmap(drawable));
    }

    private Bitmap bitmap(Drawable drawable) {
        Bitmap bitmap = Bitmap.createBitmap(ICON_SIZE, ICON_SIZE, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, ICON_SIZE, ICON_SIZE);
        drawable.draw(canvas);
        return bitmap;
    }

    private String iconData(Bitmap bitmap) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, output);
        return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
    }
}
