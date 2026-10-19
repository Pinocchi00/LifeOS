# TLS de test uniquement

`fixture-cert.pem` et `fixture-key.pem` sont une paire artificielle publique, générée exclusivement pour les tests locaux. Aucun certificat utilisateur ou identifiant fournisseur. La clé n’a aucune confidentialité ; ne jamais déployer cette paire, l’installer comme autorité de confiance ou l’utiliser pour des données réelles.

Certificat auto-signé RSA 2 048 bits, SAN `localhost` et `127.0.0.1`, non autorité. Émis le 19 octobre 2026, expire le 18 octobre 2028 ; à régénérer avant expiration. Les tests Node vérifient sa confiance explicite, le nom et les dates. Playwright exempte uniquement son empreinte de clé publique SPKI dans le navigateur de test ; le contrôle de disponibilité de son serveur HTTPS accepte également cette fixture. Aucune exemption TLS n’est ajoutée au code de production ou à l’APK.
