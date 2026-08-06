# Schengen Days Calculator

App gratuita, senza server, per calcolare i giorni trascorsi nell'area
Schengen secondo la regola dei 90 giorni su 180. Tutti i dati restano
salvati solo nel browser (localStorage): nessun account, nessun database.

## Eseguirla in locale

Serve [Node.js](https://nodejs.org) (versione 18 o superiore).

```bash
npm install
npm run dev
```

Poi apri l'indirizzo mostrato in terminale (di solito `http://localhost:5173`).

## Pubblicarla gratis su GitHub Pages

1. Crea una repository su GitHub, ad esempio `schengen-days`.
2. Se il nome della repo è diverso, aggiorna `base` in `vite.config.ts`.
3. Carica il progetto:
   ```bash
   git init
   git add .
   git commit -m "Prima versione"
   git branch -M main
   git remote add origin https://github.com/<tuo-utente>/schengen-days.git
   git push -u origin main
   ```
4. Pubblica:
   ```bash
   npm install
   npm run build
   npm run deploy
   ```
5. Su GitHub, in **Settings → Pages**, seleziona il branch `gh-pages`.
   Dopo qualche minuto l'app sarà online su:
   `https://<tuo-utente>.github.io/schengen-days/`

## Struttura

```
src/
  components/
    Header.tsx
    TripForm.tsx
    TripList.tsx
    Summary.tsx
  utils/
    calculator.ts       # motore di calcolo 90/180
    useLocalTrips.ts    # persistenza in localStorage
  App.tsx
  main.tsx
  style.css
```

## Versione attuale: 2.0 (PWA + multilingua)

- Calendario grafico mensile, modifica/eliminazione viaggio
- Simulazione di un futuro ingresso
- Installabile come app (PWA), con funzionamento offline
- **8 lingue**: italiano, inglese, cinese, arabo, spagnolo, francese,
  portoghese, russo, hindi — selezionabili dal menu in alto, con
  un'opzione "Lingua di sistema" che segue automaticamente quella del
  dispositivo, e supporto RTL per l'arabo
- **Note di viaggio e bandiera del paese** per ogni viaggio registrato
- **Backup manuale**: esporta tutti i viaggi in un file .json e
  reimportali in qualsiasi momento (utile prima di cancellare i dati
  del browser, cambiare telefono, o semplicemente per sicurezza)

### Come installarla

Dopo aver pubblicato l'app (vedi sotto):

- **Android/Chrome**: apri il sito, tocca il menu (⋮) → "Aggiungi a
  schermata Home" o "Installa app"
- **iPhone/Safari**: apri il sito, tocca l'icona di condivisione →
  "Aggiungi a Home"
- **Desktop (Chrome/Edge)**: apri il sito, clicca l'icona di
  installazione nella barra degli indirizzi

## Pubblicarla anche su Cloudflare Pages o Netlify (gratis, senza il tuo username nel link)

Il progetto è già pronto per entrambi, senza modifiche: `vite.config.ts`
rileva da solo su quale piattaforma sta girando.

### Cloudflare Pages

1. Crea un account gratuito su [pages.cloudflare.com](https://pages.cloudflare.com)
2. "Create a project" → "Connect to Git" → autorizza GitHub e scegli la repository `schengen-days`
3. Nelle impostazioni di build:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Clicca "Save and Deploy"
5. Dopo 1-2 minuti l'app sarà online su un indirizzo tipo
   `https://schengen-days.pages.dev` (o simile, Cloudflare potrebbe
   aggiungere un suffisso se il nome è già preso)

### Netlify

1. Crea un account gratuito su [netlify.com](https://netlify.com)
2. "Add new site" → "Import an existing project" → collega GitHub e
   scegli `schengen-days`
3. Nelle impostazioni di build:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Clicca "Deploy"
5. L'indirizzo sarà tipo `https://schengen-days.netlify.app` (puoi
   rinominarlo dalle impostazioni del sito se il nome è libero)

Con entrambe, da qui in poi ogni `git push` aggiorna il sito da solo
(non serve più `npm run deploy`, quello serve solo per GitHub Pages).

## Trasformarla in un'app Android

La strada più semplice, dato che l'app è già una PWA con manifest e
service worker: **PWABuilder**.

1. Vai su [pwabuilder.com](https://www.pwabuilder.com)
2. Inserisci l'indirizzo del tuo sito pubblicato
3. PWABuilder analizza l'app e genera un pacchetto Android (**.aab**
   o **.apk**) pronto
4. Puoi installarlo direttamente sul telefono (file .apk, abilitando
   "origini sconosciute" nelle impostazioni Android), oppure
   pubblicarlo sul Google Play Store (richiede un account sviluppatore
   Google, con un contributo una tantum di 25$)

## Roadmap

- **2.1** — account, sync cloud, notifiche (richiede un backend
  esterno come Firebase o Supabase — vedi discussione nel progetto)
