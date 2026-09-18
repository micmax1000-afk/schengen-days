# Configurare la firma dell'app per la build via GitHub Actions

Da fare **una sola volta**, dopo aver lanciato `npx cap add android` in locale
(passaggio leggero, non richiede molta RAM).

## 1. Modifica android/app/build.gradle

Apri `android/app/build.gradle` e aggiungi, PRIMA del blocco `android {`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Poi, DENTRO il blocco `android { ... }`, aggiungi (se non c'è già una
sezione `signingConfigs`):

```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file("../${keystoreProperties['storeFile']}")
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

## 2. Aggiungi keystore.properties al .gitignore

IMPORTANTE: questo file contiene solo un riferimento al percorso, non
password vere (quelle restano nei secret di GitHub), ma è comunque
buona pratica non versionarlo:

```
echo "android/keystore.properties" >> .gitignore
echo "android/app/signing.keystore" >> .gitignore
```

## 3. Configura i secret su GitHub

Sulla repository GitHub, vai su **Settings → Secrets and variables →
Actions → New repository secret**, e aggiungi questi 4 secret:

| Nome | Valore |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Il contenuto di `signing.keystore` convertito in base64 (vedi comando sotto) |
| `ANDROID_KEYSTORE_PASSWORD` | La password della keystore (quella in `signing-key-info.txt`) |
| `ANDROID_KEY_ALIAS` | L'alias della chiave (di solito visibile in `signing-key-info.txt`) |
| `ANDROID_KEY_PASSWORD` | La password della chiave (spesso identica a quella della keystore) |

### Comando per convertire la keystore in base64 (su Ubuntu):

```bash
base64 -w 0 signing.keystore
```

Copia tutto l'output (una lunga stringa senza spazi) e incollalo come
valore del secret `ANDROID_KEYSTORE_BASE64`.

## 4. Avvia la build

Su GitHub: scheda **Actions** → workflow **"Compila app Android
(Capacitor)"** → **"Run workflow"** → **"Run workflow"** di conferma.

Dopo qualche minuto, nella pagina del workflow completato, in fondo
trovi la sezione **"Artifacts"** con il file `schengen-days-android-release`
da scaricare: è il tuo `.aab` firmato, pronto per Play Console.
