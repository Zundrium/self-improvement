package com.zuncreative.selfimprovement;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private AppUpdater appUpdater;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidSettingsPlugin.class);
        super.onCreate(savedInstanceState);
        appUpdater = new AppUpdater(this);
        appUpdater.checkForUpdate();
    }

    @Override
    public void onStart() {
        super.onStart();
        appUpdater.start();
    }

    @Override
    public void onStop() {
        appUpdater.stop();
        super.onStop();
    }

    @Override
    public void onDestroy() {
        appUpdater.destroy();
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        appUpdater.handleActivityResult(requestCode);
    }
}
