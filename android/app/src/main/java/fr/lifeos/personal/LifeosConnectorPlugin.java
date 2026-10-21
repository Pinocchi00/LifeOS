package fr.lifeos.personal;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "LifeosConnector")
public class LifeosConnectorPlugin extends Plugin {
    volatile NativeConnector connector;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    @Override public void load() {
        connector = new NativeConnector(getContext().getSharedPreferences("lifeos-connector", 0));
    }
    @PluginMethod public void info(PluginCall call) {
        try { call.resolve(JSObject.fromJSONObject(connector.info())); }
        catch (Exception ignored) { call.reject("Réglage du serveur indisponible."); }
    }
    @PluginMethod public void configure(PluginCall call) {
        try { call.resolve(JSObject.fromJSONObject(connector.configure(call.getString("origin")))); }
        catch (Exception ignored) { call.reject("Utilisez une origine HTTPS seule, sans barre finale. Déconnectez ou oubliez l’accès avant de changer de serveur."); }
    }
    @PluginMethod public void forget(PluginCall call) {
        try { call.resolve(JSObject.fromJSONObject(connector.forget())); }
        catch (Exception ignored) { call.reject("Réglage non effacé. Réessayez explicitement."); }
    }
    @PluginMethod public void request(PluginCall call) {
        try {
            NativeConnector current=connector;
            NativeConnector.Job job=current.begin(call.getString("id"), call.getString("path"),
                call.getString("body"), call.getInt("durationMs", 18000));
            executor.execute(() -> {
                try { call.resolve(JSObject.fromJSONObject(current.execute(job))); }
                catch (NativeConnector.ProtocolException ignored) { call.reject("Serveur non compatible avec Android. Installez LifeOS 0.14 ou plus récent sur le serveur, puis vérifiez à nouveau."); }
                catch (Exception ignored) {
                    String message="Serveur HTTPS inaccessible, certificat refusé ou opération annulée. Aucun réessai automatique.";
                    if ("ai/execute".equals(job.path)) message+=" Un envoi IA peut avoir été facturé.";
                    call.reject(message);
                }
            });
        } catch (Exception ignored) { call.reject("Configurez une origine HTTPS et terminez l’opération en cours avant de réessayer."); }
    }
    @PluginMethod public void cancel(PluginCall call) { connector.cancel(call.getString("id")); call.resolve(); }
    @Override protected void handleOnDestroy() {
        NativeConnector current=connector;
        current.invalidate();
        // TLS socket closure can write a close_notify record; never do it on the UI thread.
        Thread cleanup=new Thread(() -> {
            try { current.close(); } finally { executor.shutdownNow(); }
        }, "LifeOS-connector-close");
        cleanup.start();
    }
}
