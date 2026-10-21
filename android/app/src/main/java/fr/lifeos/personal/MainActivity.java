package fr.lifeos.personal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(LifeosConnectorPlugin.class);
        super.onCreate(state);
    }
}
