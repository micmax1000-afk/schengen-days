# Guida futura: passare da TWA a Capacitor

Da usare **dopo** che l'app è già stata pubblicata con successo su Google
Play tramite TWA/PWABuilder. Questo passaggio la trasforma in un
aggiornamento (stesso pacchetto, nuova tecnologia sotto il cofano),
eliminando in modo definitivo il problema della barra dell'indirizzo su
tutti i dispositivi.

## Perché farlo

- Capacitor incorpora un WebView proprio nell'app: **nessuna dipendenza
  da Chrome** o da verifiche del browser (niente più Digital Asset Links)
- La barra dell'indirizzo sparisce **su ogni dispositivo**, senza eccezioni
- Il requisito dei 12 tester/14 giorni è una tantum: **non va rifatto**
  per un aggiornamento della stessa app

## Cosa serve prima di iniziare

1. **Node.js** (già installato)
2. **Android Studio** — scaricalo da developer.android.com/studio
   (include automaticamente Java/JDK e Android SDK)
3. La `signing.keystore` originale e la sua password (quella già
   registrata su Google Play) — **indispensabile**, senza quella non
   puoi pubblicare un aggiornamento della stessa app
4. Il `package_name` esatto già in uso: `schengendayscalculator.micmax1000_afk.twa`

## Passaggi

### 1. Installa Capacitor nel progetto esistente

Nella cartella del progetto `schengen-days`:
```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap init
```
Durante `cap init`, quando chiede l'App ID, inserisci esattamente:
`schengendayscalculator.micmax1000_afk.twa`

### 2. Aggiungi la piattaforma Android

```bash
npx cap add android
```
Questo crea una cartella `android/` con un vero progetto Android Studio.

### 3. Collega la build web a Capacitor

Nel file `capacitor.config.ts` generato, verifica che punti alla cartella
di build:
```ts
webDir: 'dist'
```

Poi, ogni volta che modifichi il codice:
```bash
npm run build
npx cap sync android
```

### 4. Apri in Android Studio e configura la firma

```bash
npx cap open android
```

In Android Studio:
- Vai su **Build → Generate Signed Bundle / APK**
- Scegli **Android App Bundle**
- Nella schermata della chiave, seleziona **"Choose existing"** e carica
  la tua `signing.keystore` originale (con la password che hai già)
- **Non generare mai una chiave nuova** — deve essere la stessa di sempre

### 5. Aggiorna il numero di versione

In `android/app/build.gradle`, incrementa:
```
versionCode 2   // deve essere più alto dell'ultimo pubblicato
versionName "2.0.0"
```

### 6. Genera il nuovo .aab e pubblicalo come aggiornamento

- Compila il bundle firmato (stessi passaggi del punto 4)
- Su Play Console, vai sulla release esistente (test chiuso o produzione,
  a seconda di dove sei arrivato) → carica il nuovo `.aab`
- Google lo riconoscerà come **aggiornamento** della stessa app, grazie
  a package name e chiave di firma identici

### 7. Verifica finale

Installa l'aggiornamento e apri l'app: non dovrebbe più comparire alcuna
barra dell'indirizzo, su nessun browser o dispositivo.

## Attenzione

- **Non perdere `signing.keystore`** durante questo passaggio — copiala
  di nuovo in un posto sicuro prima di iniziare
- Se qualcosa va storto e generi per errore una chiave diversa, Google
  **rifiuterà** l'aggiornamento (tratterebbe l'app come un'app diversa)
- Puoi tenere il progetto TWA/PWABuilder da parte come backup finché non
  sei sicuro che la versione Capacitor funzioni bene
