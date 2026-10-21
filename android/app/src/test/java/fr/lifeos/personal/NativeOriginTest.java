package fr.lifeos.personal;
import static org.junit.Assert.*;
import org.junit.Test;

public class NativeOriginTest {
    @Test public void acceptsOnlyCanonicalHttpsOrigins() {
        assertEquals("https://lifeos.example:8443", NativeConnector.canonicalOrigin("https://lifeos.example:8443"));
        assertEquals("",NativeConnector.canonicalOrigin(""));
        for (String value : new String[]{"http://example.com","https://example.com/","https://example.com/path",
            "https://u:p@example.com","https://example.com?q=x","https://example.com#x","https://Example.com",
            "https://example.com:443","https://example.com.","https://example.com/%2e%2e/"}) {
            try { NativeConnector.canonicalOrigin(value); fail(value); }
            catch (IllegalArgumentException expected) { /* refused before any connection */ }
        }
    }
}
