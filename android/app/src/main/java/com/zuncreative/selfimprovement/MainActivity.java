package com.zuncreative.selfimprovement;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidAppIdentityPlugin.class);
        registerPlugin(AndroidBackupPlugin.class);
        registerPlugin(AndroidSettingsPlugin.class);
        registerPlugin(AndroidUsageEventsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
