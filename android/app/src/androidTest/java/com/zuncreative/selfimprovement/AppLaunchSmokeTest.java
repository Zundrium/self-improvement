package com.zuncreative.selfimprovement;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Context;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppLaunchSmokeTest {
    @Test public void appIdentityAndLaunchIntentAreAvailable() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.zuncreative.selfimprovement", context.getPackageName());
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        assertNotNull(launch);
        assertEquals(MainActivity.class.getName(), launch.getComponent().getClassName());
    }
}
