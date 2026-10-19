package fr.lifeos.personal;

import static org.junit.Assert.*;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.app.Activity;
import android.app.Instrumentation.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.test.espresso.intent.Intents;
import static androidx.test.espresso.intent.Intents.intending;
import static androidx.test.espresso.intent.matcher.IntentMatchers.hasAction;
import static org.hamcrest.Matchers.anyOf;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.ActivityTestRule;
import androidx.test.uiautomator.UiDevice;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Runs in an isolated emulator installed by CI; never uses an existing profile. */
@RunWith(AndroidJUnit4.class)
public class NativeSmokeTest {
    @Rule public ActivityTestRule<MainActivity> activity = new ActivityTestRule<>(MainActivity.class);

    private String js(String code) throws Exception {
        AtomicReference<String> value = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            WebView web = activity.getActivity().getBridge().getWebView();
            web.evaluateJavascript(code, result -> { value.set(result); done.countDown(); });
        });
        assertTrue("JavaScript callback timed out", done.await(10, TimeUnit.SECONDS));
        return value.get();
    }
    private void waitFor(String predicate) throws Exception {
        long end = SystemClock.elapsedRealtime() + 20000;
        while (SystemClock.elapsedRealtime() < end) {
            if ("true".equals(js("(()=>{try{return !!(" + predicate + ")}catch(e){return false}})()"))) return;
            SystemClock.sleep(150);
        }
        fail("Condition: " + predicate + "\nPage: " + js("document.body.innerText.slice(0,5000)"));
    }
    private void click(String text) throws Exception {
        String selector = "Array.from(document.querySelectorAll('button')).find(b=>b.getClientRects().length && b.textContent.trim()===" + JSONObject.quote(text) + ")";
        waitFor(selector + " && !" + selector + ".disabled");
        js(selector + ".click()");
    }
    private void fill(String selector, String value) throws Exception {
        js("(()=>{const el=document.querySelector(" + JSONObject.quote(selector) + ");"
            + "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el," + JSONObject.quote(value) + ");"
            + "el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.blur();})()");
    }
    @Test public void nativeOfflinePersistenceBackExportAndNotifications() throws Exception {
        waitFor("document.querySelector('h1')?.textContent.includes('Faites de la place')");
        assertEquals("\"android\"", js("window.Capacitor.getPlatform()"));
        js("navigator.serviceWorker.getRegistrations().then(r=>window.smokeWorkerCount=r.length)");
        waitFor("window.smokeWorkerCount===0");
        Context context = activity.getActivity();
        if (Build.VERSION.SDK_INT >= 33)
            assertNotEquals("No unsolicited notification permission", PackageManager.PERMISSION_GRANTED,
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS));

        click("Nouvelle tâche");
        waitFor("document.querySelector('form input[name=title]')");
        fill("form input[name=title]", "Essai Android local");
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
        SystemClock.sleep(500);
        if (!"true".equals(js("document.body.innerText.includes('Garder vos modifications')")))
            UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
        waitFor("document.body.innerText.includes('Garder vos modifications')");
        click("Continuer la modification");
        click("Enregistrer la tâche");
        waitFor("!document.querySelector('dialog[open]')");
        waitFor("document.body.innerText.includes('Essai Android local')");
        // Network is disabled by the workflow before launch. Reload really uses
        // bundled assets and IndexedDB; there is no Vite server or service worker.
        js("window.smokeBeforeReload=true");
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> activity.getActivity().getBridge().getWebView().reload());
        waitFor("window.smokeBeforeReload===undefined && document.body.innerText.includes('Essai Android local')");
        click("Explorer");
        waitFor("document.querySelector('[aria-label=\"Rubriques Explorer\"]')");
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
        waitFor("document.querySelector('h1')?.textContent.includes('Faites de la place')");

        js("document.querySelector('[aria-label=\"Ouvrir les sauvegardes\"]').click()");
        waitFor("document.body.innerText.includes('Votre rendez-vous quotidien')");
        click("Exporter mes données");
        File exports = new File(context.getCacheDir(), "lifeos-exports");
        long until = SystemClock.elapsedRealtime() + 15000;
        while ((!exports.isDirectory() || exports.listFiles().length == 0) && SystemClock.elapsedRealtime() < until) SystemClock.sleep(150);
        File[] files = exports.listFiles((dir, name) -> name.endsWith(".json"));
        assertNotNull(files); assertTrue(files.length > 0);
        JSONObject backup = new JSONObject(new String(Files.readAllBytes(files[0].toPath()), StandardCharsets.UTF_8));
        assertEquals("LifeOS", backup.getString("application"));
        assertEquals("Essai Android local", backup.getJSONObject("data").getJSONArray("tasks").getJSONObject(0).getString("title"));
        // Verify the real system chooser is present, then cancel without claiming
        // that a destination saved the file.
        UiDevice device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
        assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(
            androidx.test.uiautomator.By.pkg("android")), 10000));
        device.pressBack();
        waitFor("!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Exporter mes données'))?.disabled");

        // Return a real FileProvider URI through the Android file picker result.
        // The app still reads/validates the file and asks for replacement.
        js("document.querySelector('dialog [aria-label=Fermer]').click()");
        waitFor("!document.querySelector('dialog[open]')");
        click("Nouvelle tâche");
        waitFor("document.querySelector('form input[name=title]')");
        fill("form input[name=title]", "À retirer par restauration");
        click("Enregistrer la tâche");
        waitFor("!document.querySelector('dialog[open]')");
        js("document.querySelector('[aria-label=\"Ouvrir les sauvegardes\"]').click()");
        waitFor("document.querySelector('input[type=file]')");
        Intents.init();
        try {
            Intent result = new Intent().setData(FileProvider.getUriForFile(context,
                context.getPackageName() + ".fileprovider", files[0])).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intending(anyOf(hasAction(Intent.ACTION_GET_CONTENT), hasAction(Intent.ACTION_OPEN_DOCUMENT), hasAction(Intent.ACTION_CHOOSER)))
                .respondWith(new ActivityResult(Activity.RESULT_OK, result));
            js("document.querySelector('input[type=file]').scrollIntoView({block:'center'})");
            JSONObject position = new JSONObject(js("(()=>{const r=document.querySelector('input[type=file]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,scale:devicePixelRatio}})()"));
            int[] location = new int[2];
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> activity.getActivity().getBridge().getWebView().getLocationOnScreen(location));
            device.click(location[0] + (int)(position.getDouble("x") * position.getDouble("scale")),
                location[1] + (int)(position.getDouble("y") * position.getDouble("scale")));
            waitFor("document.body.innerText.includes('Remplacer les données actuelles')");
            click("Confirmer le remplacement");
            waitFor("!document.querySelector('dialog[open]')");
            waitFor("document.body.innerText.includes('Essai Android local') && !document.body.innerText.includes('À retirer par restauration')");
        } finally { Intents.release(); }

        js("document.querySelector('[aria-label=\"Ouvrir les sauvegardes\"]').click()");
        waitFor("document.body.innerText.includes('Votre rendez-vous quotidien')");

        if (Build.VERSION.SDK_INT >= 33)
            InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(context.getPackageName(), Manifest.permission.POST_NOTIFICATIONS);
        // Grant is test-only. Production requests it after Activer/Tester.
        fill("input[type=time]", "18:35");
        click("Activer le rappel");
        waitFor("document.body.innerText.includes('programmé vers 18:35')");
        js("window.Capacitor.nativePromise('LocalNotifications','getPending',{}).then(r=>window.smokePending=r.notifications)");
        waitFor("window.smokePending?.some(n=>n.id===7301 && n.isExactNotification===false)");
        click("Tester dans une minute");
        waitFor("document.body.innerText.includes('Un essai est en attente')");
        // Force a short test alarm using the same native API, then observe an
        // actual delivered notification; inexact Android timing has a margin.
        js("window.Capacitor.nativePromise('LocalNotifications','schedule',{notifications:[{id:7302,title:'Essai natif LifeOS',body:'Essai',channelId:'lifeos-rendezvous',isExactNotification:false,schedule:{at:new Date(Date.now()+1000).toISOString()}}]}).then(()=>window.smokeScheduled=true)");
        waitFor("window.smokeScheduled===true");
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        until = SystemClock.elapsedRealtime() + 70000;
        boolean delivered = false;
        while (SystemClock.elapsedRealtime() < until) {
            for (android.service.notification.StatusBarNotification n : manager.getActiveNotifications())
                if (n.getId() == 7302) delivered = true;
            if (delivered) break;
            SystemClock.sleep(500);
        }
        assertTrue("Native test notification delivered", delivered);
        click("Désactiver les rappels");
        waitFor("document.body.innerText.includes('Rappel quotidien et essai annulés')");
        js("window.Capacitor.nativePromise('LocalNotifications','getPending',{}).then(r=>window.smokeAfter=r.notifications)");
        waitFor("window.smokeAfter?.every(n=>n.id!==7301 && n.id!==7302)");
    }
}
