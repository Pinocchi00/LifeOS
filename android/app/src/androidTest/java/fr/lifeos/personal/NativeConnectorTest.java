package fr.lifeos.personal;

import static org.junit.Assert.*;
import android.content.Context;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.UiDevice;
import java.io.File;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.util.concurrent.atomic.AtomicInteger;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import okhttp3.OkHttpClient;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** CI-only: TLS trust is injected from this test APK, never from app configuration. */
@RunWith(AndroidJUnit4.class)
public class NativeConnectorTest extends NativeSmokeTest {
    private void closeDialog() throws Exception {
        js("document.querySelector('dialog [aria-label=Fermer]').click()");
        waitFor("!document.querySelector('dialog[open]')");
    }
    private void center() throws Exception {
        js("Array.from(document.querySelectorAll('nav button')).find(b=>b.getClientRects().length && b.textContent.trim()==='Projets').click()");
        waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.getClientRects().length && b.textContent.includes('Missions IA'))");
        js("Array.from(document.querySelectorAll('button')).find(b=>b.getClientRects().length && b.textContent.includes('Missions IA')).click()");
    }
    @Test public void nativeHttpsConnector() throws Exception {
        waitFor("document.querySelector('h1')?.textContent.includes('Faites de la place')");
        Context context=activity.getActivity();
        LifeosConnectorPlugin plugin=(LifeosConnectorPlugin) activity.getActivity().getBridge().getPlugin("LifeosConnector").getInstance();
        assertEquals("",plugin.connector.info().getString("origin"));
        // Web fetch must never transport connector requests in the native client.
        js("window.smokeNativeWebCalls=0;window.smokeOriginalFetch=window.fetch;window.fetch=(...args)=>{window.smokeNativeWebCalls++;return window.smokeOriginalFetch(...args)}");
        center();click("Nouvelle mission");
        waitFor("document.querySelector('form input[name=title]')");
        fill("form input[name=title]","Mission HTTPS Android");
        fill("textarea[name=objective]","Préparer une proposition explicite");
        fill("textarea[name=criteria]","Vérifier les faits manuellement");
        click("Enregistrer la mission");waitFor("!document.querySelector('dialog[open]')");
        js("document.querySelector('[aria-label=\"GitHub pour Mission HTTPS Android\"]').click()");
        click("Relier un lien GitHub");waitFor("document.querySelector('input[name=url]')");
        fill("input[name=url]","https://github.com/example/private/pull/42");click("Relier ce lien");
        waitFor("document.querySelector('.github-link')");click("Privé, par mon serveur");
        waitFor("document.querySelector('.native-connector-settings input')");
        fill(".native-connector-settings input","http://127.0.0.1:4182");click("Mémoriser cette adresse");
        waitFor("document.querySelector('.native-connector-settings [role=alert]')");
        assertEquals("",plugin.connector.info().getString("origin"));
        fill(".native-connector-settings input","https://127.0.0.1:4182");click("Mémoriser cette adresse");
        waitFor("document.body.innerText.includes('Adresse enregistrée')");
        click("Vérifier ce serveur HTTPS");
        waitFor("document.querySelector('.github-access [role=alert]')?.textContent.includes('certificat refusé')");
        js("document.querySelector('.github-access [role=alert]').scrollIntoView({block:'center'})");
        capture("native-https-cert-refused.png");

        KeyStore trust=KeyStore.getInstance(KeyStore.getDefaultType());trust.load(null);
        try(InputStream cert=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("fixture-cert.pem")) {
            trust.setCertificateEntry("fixture-only",CertificateFactory.getInstance("X.509").generateCertificate(cert));
        }
        TrustManagerFactory managers=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());managers.init(trust);
        X509TrustManager manager=(X509TrustManager)managers.getTrustManagers()[0];
        SSLContext tls=SSLContext.getInstance("TLS");tls.init(null,new javax.net.ssl.TrustManager[]{manager},null);
        AtomicInteger requests=new AtomicInteger();AtomicInteger executions=new AtomicInteger();
        OkHttpClient client=NativeConnector.client().newBuilder().sslSocketFactory(tls.getSocketFactory(),manager)
            .addNetworkInterceptor(chain->{requests.incrementAndGet();if(chain.request().url().encodedPath().endsWith("/execute"))executions.incrementAndGet();return chain.proceed(chain.request());}).build();
        plugin.connector.close();
        plugin.connector=new NativeConnector(context.getSharedPreferences("lifeos-connector",0),client);
        assertEquals(0,requests.get());
        // Capture actual bridge results; a session secret must never be in them.
        js("window.smokeBridgeResults=[];window.smokeNativePromise=window.Capacitor.nativePromise;window.Capacitor.nativePromise=(name,method,options)=>window.smokeNativePromise(name,method,options).then(r=>{if(name==='LifeosConnector')window.smokeBridgeResults.push(JSON.stringify(r));return r})");
        click("Vérifier ce serveur HTTPS");
        waitFor("document.querySelector('.github-pair input')");
        fill(".github-pair input","native-https-fixture-code");click("Appairer cet appareil au serveur");
        waitFor("document.querySelector('.github-session')?.textContent.includes('Session appairée')");
        assertEquals(2,requests.get());
        assertTrue(plugin.connector.info().getBoolean("sessionActive"));
        assertEquals(1,context.getSharedPreferences("lifeos-connector",0).getAll().size());
        NativeConnector restarted=new NativeConnector(context.getSharedPreferences("lifeos-connector",0));
        assertFalse(restarted.info().getBoolean("sessionActive"));restarted.close();
        js("Array.from(document.querySelectorAll('.github-link button')).find(b=>b.textContent.includes('Vérifier et garder')).click()");
        waitFor("document.querySelector('.github-link')?.textContent.includes('Référence privée HTTPS fictive')");
        assertEquals(3,requests.get());
        js("document.querySelector('.github-link').scrollIntoView({block:'center'})");
        capture("native-https-github.png");closeDialog();
        js("document.querySelector('[aria-label=\"API OpenAI pour Mission HTTPS Android\"]').click()");
        waitFor("document.querySelector('.ai-panel') && document.querySelector('.native-connector-settings input')?.value==='https://127.0.0.1:4182'");
        assertEquals(3,requests.get());
        click("Vérifier l’accès IA du serveur");
        waitFor("document.querySelector('.ai-access')?.textContent.includes('0 / 2 essais')");
        assertEquals(4,requests.get());
        fill(".ai-panel textarea","Analyser uniquement ce texte Android explicite.");
        click("Préparer l’aperçu sans envoyer à OpenAI");
        waitFor("document.querySelector('.ai-approval')");
        assertEquals(0,executions.get());
        assertEquals("true",js("Array.from(document.querySelectorAll('.ai-approval button')).find(b=>b.textContent.includes('Autoriser et envoyer')).disabled"));
        js("document.querySelector('.ai-approval input[type=checkbox]').scrollIntoView({block:'center'})");capture("native-https-consent.png");
        js("document.querySelector('.ai-approval input[type=checkbox]').click()");
        click("Autoriser et envoyer à OpenAI");
        waitFor("document.querySelector('.ai-draft pre')?.textContent.includes('Proposition HTTPS fictive')");
        assertEquals(1,executions.get());
        click("Conserver comme compte-rendu non vérifié");
        waitFor("document.querySelector('.ai-draft')?.textContent.includes('Brouillon conservé')");
        click("Déconnecter le serveur");
        waitFor("document.querySelector('.ai-pair input')");
        assertFalse(plugin.connector.info().getBoolean("sessionActive"));
        assertEquals("true",js("!window.smokeBridgeResults.join('').includes('nativeSession') && !window.smokeBridgeResults.join('').includes('Bearer ')"));
        assertEquals("0",js("window.smokeNativeWebCalls"));
        click("Oublier cet accès sur l’appareil");
        waitFor("document.querySelector('.native-connector-settings input')?.value===''");
        assertTrue(context.getSharedPreferences("lifeos-connector",0).getAll().isEmpty());
        closeDialog();

        js("document.querySelector('[aria-label=\"Ouvrir les sauvegardes\"]').click()");click("Exporter mes données");
        File exports=new File(context.getCacheDir(),"lifeos-exports");
        long end=SystemClock.elapsedRealtime()+15000;File[] files;
        do { files=exports.listFiles((dir,name)->name.endsWith(".json"));if(files!=null&&files.length>0)break;SystemClock.sleep(100); } while(SystemClock.elapsedRealtime()<end);
        assertNotNull(files);assertTrue(files.length>0);
        String raw=new String(Files.readAllBytes(files[0].toPath()),StandardCharsets.UTF_8);
        JSONObject data=new JSONObject(raw).getJSONObject("data");
        assertEquals(6,data.getInt("version"));assertEquals("todo",data.getJSONArray("missions").getJSONObject(0).getString("status"));
        assertTrue(raw.contains("BROUILLON IA — NON VÉRIFIÉ"));assertTrue(raw.contains("Référence privée HTTPS fictive"));
        for(String secret:new String[]{"nativeSession","native-https-fixture-code","fixture-github-token","fixture-openai-key","https://127.0.0.1:4182"})assertFalse(secret,raw.contains(secret));
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
        waitFor("!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Exporter mes données'))?.disabled");
        closeDialog();int before=requests.get();
        js("window.smokeBeforeTlsReload=true");
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activity.getActivity().getBridge().getWebView().reload());
        waitFor("window.smokeBeforeTlsReload===undefined && document.querySelector('h1')?.textContent.includes('Faites de la place')");
        center();js("document.querySelector('[aria-label=\"GitHub pour Mission HTTPS Android\"]').click()");
        waitFor("document.querySelector('.github-link')?.textContent.includes('Référence privée HTTPS fictive')");
        assertEquals(before,requests.get());
        assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth"));
        js("document.querySelector('.github-link').scrollIntoView({block:'center'})");
        capture("native-https-offline.png");
    }
}
