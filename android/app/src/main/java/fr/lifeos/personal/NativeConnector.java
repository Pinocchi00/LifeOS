package fr.lifeos.personal;

import android.content.SharedPreferences;
import android.os.SystemClock;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import okhttp3.Call;
import okhttp3.ConnectionSpec;
import okhttp3.CookieJar;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.json.JSONObject;

/** Dedicated HTTPS client. Only the origin is persisted; bearer never crosses the bridge. */
final class NativeConnector {
    private final SharedPreferences preferences;
    private final OkHttpClient client;
    private final Map<String, Job> jobs = new HashMap<>();
    private String origin;
    private String token;
    private long until;
    private long generation;
    private boolean closed;

    static OkHttpClient client() {
        return new OkHttpClient.Builder()
            .cookieJar(CookieJar.NO_COOKIES).cache(null).proxy(Proxy.NO_PROXY)
            .followRedirects(false).followSslRedirects(false).retryOnConnectionFailure(false)
            .connectionSpecs(Collections.singletonList(ConnectionSpec.MODERN_TLS))
            .protocols(Collections.singletonList(Protocol.HTTP_1_1))
            .connectTimeout(8, TimeUnit.SECONDS).writeTimeout(8, TimeUnit.SECONDS)
            .readTimeout(65, TimeUnit.SECONDS)
            .addNetworkInterceptor(chain -> {
                AtomicBoolean sent = chain.request().tag(AtomicBoolean.class);
                if (sent == null || !sent.compareAndSet(false, true)) throw new IOException("No retry");
                return chain.proceed(chain.request());
            }).build();
    }
    NativeConnector(SharedPreferences preferences) { this(preferences, client()); }
    // Package-private injection is used by instrumented tests only; no bridge TLS option exists.
    NativeConnector(SharedPreferences preferences, OkHttpClient client) {
        this.preferences = preferences;
        this.client = client;
        try { origin = canonicalOrigin(preferences.getString("origin", "")); }
        catch (Exception ignored) { origin = ""; }
    }
    static String canonicalOrigin(String input) {
        if (input == null || input.isEmpty()) return "";
        if (input.length() > 2048) throw new IllegalArgumentException();
        HttpUrl url = HttpUrl.get(input);
        if (!url.isHttps() || !url.username().isEmpty() || !url.password().isEmpty() ||
            url.query() != null || url.fragment() != null || url.host().endsWith(".") ||
            !url.encodedPath().equals("/") || !url.toString().equals(input + "/"))
            throw new IllegalArgumentException();
        return input;
    }
    private void expire() {
        if (token != null && SystemClock.elapsedRealtime() >= until) { token = null; generation++; }
    }
    synchronized JSONObject info() throws Exception {
        expire(); return new JSONObject().put("origin", origin).put("sessionActive", token != null);
    }
    synchronized JSONObject configure(String value) throws Exception {
        String next = canonicalOrigin(value);
        expire();
        if (!jobs.isEmpty() || (token != null && !next.equals(origin)))
            throw new IllegalStateException("Déconnectez ou oubliez d’abord cet accès.");
        if (!preferences.edit().putString("origin", next).commit()) throw new IOException();
        origin = next; return info();
    }
    synchronized JSONObject forget() throws Exception {
        generation++; token = null;
        for (Job job : jobs.values()) job.call.cancel();
        if (!preferences.edit().remove("origin").commit()) throw new IOException();
        origin = ""; return info();
    }
    static final class Job {
        final Call call; final String id; final String path; final long generation;
        Job(Call call, String id, String path, long generation) {
            this.call=call; this.id=id; this.path=path; this.generation=generation;
        }
    }
    synchronized Job begin(String id, String path, String body, int duration) throws Exception {
        expire();
        boolean get = "status".equals(path) || "ai/status".equals(path);
        boolean post = "pair".equals(path) || "logout".equals(path) || "github/read".equals(path) ||
            "ai/prepare".equals(path) || "ai/execute".equals(path);
        if (closed || origin.isEmpty() || id == null || !id.matches("[a-zA-Z0-9-]{1,80}") || jobs.containsKey(id) ||
            jobs.size() >= 2 || (!get && !post) || get != (body == null) ||
            duration < 1000 || duration > 65000 || (body != null && body.getBytes(StandardCharsets.UTF_8).length > 32000))
            throw new IllegalArgumentException("Adresse HTTPS et opération autorisée requises.");
        if ("pair".equals(path) && (token != null || !jobs.isEmpty()))
            throw new IllegalStateException("Appairage déjà actif ou en cours.");
        Request.Builder request = new Request.Builder().url(origin + "/api/connector/" + path)
            .header("X-LifeOS-Request", "1").header("X-LifeOS-Client", "android")
            .header("Cache-Control", "no-store").header("Accept", "application/json")
            .tag(AtomicBoolean.class, new AtomicBoolean(false));
        if (token != null && !"pair".equals(path)) request.header("Authorization", "Bearer " + token);
        if (post) request.post(RequestBody.create(body.getBytes(StandardCharsets.UTF_8), MediaType.get("application/json")));
        Call call = client.newCall(request.build());
        call.timeout().timeout(duration, TimeUnit.MILLISECONDS);
        Job job = new Job(call, id, path, generation); jobs.put(id, job); return job;
    }
    static final class ProtocolException extends IOException { }
    JSONObject execute(Job job) throws Exception {
        try (Response response = job.call.execute()) {
            if (!"android-v1".equals(response.header("X-LifeOS-Transport"))) throw new ProtocolException();
            if (response.code() >= 300 && response.code() < 400 || response.body() == null ||
                response.body().contentType() == null ||
                !"application".equals(response.body().contentType().type()) ||
                !"json".equals(response.body().contentType().subtype())) throw new IOException();
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (InputStream stream = response.body().byteStream()) {
                byte[] buffer = new byte[8192]; int count;
                while ((count = stream.read(buffer)) != -1) {
                    if (bytes.size() + count > 1024 * 1024) throw new IOException();
                    bytes.write(buffer, 0, count);
                }
            }
            JSONObject value = new JSONObject(bytes.toString(StandardCharsets.UTF_8.name()));
            synchronized (this) {
                if (job.call.isCanceled() || generation != job.generation) throw new IOException();
                if ("pair".equals(job.path) && response.code() == 200) {
                    String next = value.optString("nativeSession", "");
                    if (!next.matches("[a-f0-9]{64}") || value.optInt("version") != 1 ||
                        !value.optBoolean("paired")) throw new IOException();
                    if (value.length()!=5 || !(value.opt("githubConfigured") instanceof Boolean) ||
                        !value.optString("expiresAt", "").matches("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z")) throw new IOException();
                    token=next; until=SystemClock.elapsedRealtime()+3600000;
                }
                value.remove("nativeSession");
                if (token != null && value.toString().contains(token)) throw new IOException();
                if (response.code() == 401) token=null;
                return new JSONObject().put("status", response.code()).put("value", value);
            }
        } finally {
            synchronized (this) {
                jobs.remove(job.id);
                if ("logout".equals(job.path) && generation == job.generation) {
                    token=null; generation++;
                    for (Job other : jobs.values()) other.call.cancel();
                }
            }
        }
    }
    synchronized void cancel(String id) { Job job=jobs.get(id); if (job != null) job.call.cancel(); }
    synchronized void invalidate() { generation++; token=null; closed=true; }
    synchronized void close() {
        invalidate();
        for (Job job : jobs.values()) job.call.cancel();
        client.connectionPool().evictAll();
    }
}
