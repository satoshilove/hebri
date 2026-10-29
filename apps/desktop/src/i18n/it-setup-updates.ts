import type { TranslationOverrides } from './define-locale'

export const itSetupUpdates = {
  updates: {
    releaseInstalled: 'Aggiornamento installato',
    quitToInstall: 'Esci e installa',
    releaseReady: 'Download completato',
    releaseReadyBody:
      'Salva il lavoro, esci completamente da Hebri per installare l’aggiornamento, poi riapri Hebri. L’app in esecuzione non è ancora cambiata. Su Windows, segui la procedura di installazione visibile e attendi che termini prima di riaprire.',
    releaseVerifying: 'Verifica del download…',
    releaseDownloadBody: 'Download dell’aggiornamento di Hebri desktop. Il lavoro in corso rimane aperto.',
    releaseDownloadFooter: 'Il download verrà verificato prima di essere pronto per l’installazione.',
    availableBodyBackend: 'È pronta per l’installazione una versione più recente del backend Hebri collegato.',
    availableBodyNoChangelog:
      'È pronta una versione più recente. Le note di rilascio non sono disponibili per questo tipo di installazione.',
    manualBody:
      'Hai installato Hebri dalla riga di comando, quindi anche gli aggiornamenti si eseguono lì. Incolla questo comando nel terminale:',
    guiSkewBody:
      'Il backend è stato aggiornato, ma il pacchetto dell’app desktop non è cambiato. Aggiorna o reinstalla Hebri desktop (AppImage, .deb o .rpm) per allineare le versioni.',
    applyingBody:
      'Il programma di aggiornamento di Hebri si apre in una finestra separata e riapre automaticamente Hebri al termine. Non riaprire Hebri manualmente durante l’aggiornamento.',
    applyingBodyBackend:
      'Il backend remoto sta applicando l’aggiornamento e verrà riavviato. Hebri si ricollegherà automaticamente quando sarà disponibile.',
    applyingClose: 'Questa finestra si chiuderà durante l’aggiornamento, poi Hebri si riaprirà automaticamente.',
    errorBody: 'Nessun dato è andato perso. Puoi riprovare ora.',
    blockerTitle: 'Chiudere le anteprime locali per aggiornare Hebri?',
    blockerBody:
      'Hebri deve interrompere queste anteprime locali prima dell’aggiornamento. I file non verranno modificati né eliminati.',
    foreignBlockerTitle: 'Chiudi gli altri processi per aggiornare Hebri',
    foreignBlockerBody:
      'Hebri non può chiudere automaticamente questi processi in modo sicuro. Chiudi l’app, il terminale o il servizio a cui appartiene ciascuno, poi riprova l’aggiornamento.',
    mixedBlockerBody:
      'Hebri può chiudere le anteprime locali elencate qui sotto. Gli altri processi devono essere chiusi manualmente prima di continuare l’aggiornamento.',
    closePreviewsAndUpdate: 'Chiudi anteprime e aggiorna',
    closePreviewsAndCheckAgain: 'Chiudi anteprime e ricontrolla',
    localPreview: 'Anteprima locale',
    pidLabel: pid => `PID ${pid}`,
    clientAlsoBehindMessage:
      'Il backend è aggiornato, ma l’app desktop usa ancora una versione precedente. Aggiornala per ricevere le ultime correzioni.',
    everythingDispatched: 'Aggiornamento avviato',
    everythingRowFailed: 'Aggiornamento non riuscito',
    everythingFanoutFailedTitle: 'Impossibile aggiornare le altre istanze',
    applyStatus: {
      preparing: 'Aggiornamento del backend…',
      pulling: 'Aggiornamento del backend…',
      restarting: 'Riavvio del backend per caricare l’aggiornamento…',
      notAvailable: 'Aggiornamento non disponibile per questo backend.',
      failed: 'Aggiornamento del backend non riuscito.',
      noReturn:
        'Il backend non è tornato online. L’aggiornamento potrebbe non essere stato completato: controlla il computer del backend.'
    }
  },
  onboarding: {
    preparingInstall: 'Hebri sta completando l’installazione. Al primo avvio richiede solitamente meno di un minuto.',
    featuredPitch: 'Un abbonamento, oltre 300 modelli avanzati: il modo consigliato di usare Hebri',
    fireworksPitch: 'API diretta ai modelli avanzati ospitati da Fireworks',
    openRouterPitch: 'Una chiave, centinaia di modelli: una buona scelta predefinita',
    apiKeyOptions: {
      fireworks: {
        short: 'API diretta ai modelli',
        description: 'Accesso diretto ai modelli ospitati da Fireworks AI.'
      },
      openrouter: {
        short: 'una chiave, tanti modelli',
        description:
          'Ospita centinaia di modelli accessibili con un’unica chiave. Una buona scelta per le nuove installazioni.'
      },
      openai: {
        short: 'modelli GPT',
        description: 'Accesso diretto ai modelli OpenAI.'
      },
      gemini: {
        short: 'modelli Gemini',
        description: 'Accesso diretto ai modelli Google Gemini.'
      },
      xai: {
        short: 'modelli Grok',
        description: 'Accesso diretto ai modelli xAI Grok.'
      },
      local: {
        short: 'ospitato autonomamente',
        description:
          'Collega Hebri a un endpoint locale o ospitato autonomamente, compatibile con OpenAI (vLLM, llama.cpp, Ollama, ecc.).'
      }
    },
    localApiKeyPlaceholder: 'Chiave API (facoltativa: solo se richiesta dall’endpoint)',
    flowSubtitles: {
      pkce: 'Apre il browser per l’accesso, poi continua qui',
      device_code: 'Apre una pagina di verifica nel browser: Hebri si collega automaticamente',
      external: 'Accedi una volta nel terminale, poi torna alla chat'
    },
    signInExpired:
      'La pagina di accesso è scaduta prima del completamento. Riprova e completa il passaggio nel browser entro pochi minuti, oppure usa una chiave API.',
    signInDidNotFinish: provider =>
      `L’accesso con ${provider} non è stato completato. Controlla la connessione Internet e riprova oppure scegli un altro fornitore.`,
    externalPending: provider =>
      `${provider} effettua l’accesso tramite la propria CLI. Esegui questo comando nel terminale, poi torna qui e scegli «Ho effettuato l’accesso»:`,
    pro: 'Pro'
  },
  freeTier: {
    providerRowTitle: 'Nous · piano gratuito',
    providerRowPitch: 'Accedi con un account Nous per sbloccare più modelli e strumenti.',
    readyTitle: 'Hebri è pronto.',
    readyCaption: 'Gratuito · connettori inclusi',
    signInInstead: 'Accedi invece con un account Nous',
    stripTitle: 'L’inferenza e i connettori gratuiti di Nous sono ora disponibili.',
    stripBody: 'Apri la scelta del modello per provarli oppure accedi con un account Nous.',
    openModelPicker: 'Apri la scelta del modello',
    dismiss: 'Chiudi',
    providerName: 'Nous',
    statusLabel: model => `Nous · ${model}`,
    signInHeading: 'Accedi con un account Nous per sbloccare più modelli e strumenti.',
    settingUp: 'Configurazione dell’inferenza gratuita…',
    codeBody: 'Inserisci questo codice nel browser per completare l’accesso.',
    copyLink: 'Copia link',
    doNotShare: 'Non condividere questo codice.',
    waiting: 'In attesa dell’accesso…',
    finishingHeading: 'Completamento dell’accesso…',
    finishingBody: 'Approvato nel browser. Recupero dei token dell’account.',
    signedInAs: email => `Accesso effettuato come ${email}`,
    signedIn: 'Accesso effettuato.',
    completedBody: 'Il tuo account ora gestisce l’inferenza e gli strumenti.',
    startAgain: 'Ricomincia',
    didNotComplete: 'Accesso non completato',
    rejectedBody: 'Stai ancora usando il servizio gratuito Nous. Puoi accedere quando vuoi.',
    supersededBody: 'Un nuovo codice di accesso ha sostituito questo. Usa il più recente oppure ricomincia.',
    timedOutHeading: 'Il link di accesso è scaduto',
    timedOutBody: 'Ricomincia quando vuoi. Stai ancora usando il servizio gratuito Nous.',
    retiredBody:
      'La sessione è terminata prima del completamento dell’accesso. Hebri ne avvierà una nuova; potrai quindi accedere di nuovo quando vuoi.',
    errorBody: 'L’accesso non è stato completato. Riprova quando vuoi.',
    busyHeading: 'Ci siamo quasi',
    busyBody: wait =>
      `Hebri non è riuscito a completare l’accesso perché il servizio Nous è occupato. Riprova tra ${wait}. Nel frattempo la sessione rimane disponibile.`,
    unreachableBody:
      'Hebri non è riuscito a raggiungere il servizio Nous per completare l’accesso. Controlla la connessione Internet e riprova. La sessione rimane disponibile.',
    alreadySignedInHeading: 'Accesso già effettuato.',
    alreadySignedInBody: 'Questa istanza di Hebri ha già effettuato l’accesso a un account Nous.',
    setupFailed: {
      gateClosed:
        'Questa versione di Hebri non può avviarsi senza un account Nous. Accedi o creane uno: è gratuito e richiede solo un minuto.',
      paused:
        'L’uso di Hebri senza accesso è momentaneamente sospeso. Hebri continuerà a controllare. L’accesso è gratuito e ti permette di iniziare subito.',
      rateLimited: wait =>
        `Molte persone stanno iniziando proprio ora, quindi Hebri riproverà tra ${wait}. L’accesso è gratuito e permette di evitare l’attesa.`,
      unreachable:
        'Hebri non è riuscito a raggiungere il servizio Nous. Controlla la connessione Internet e premi «Riprova», oppure collega un altro fornitore per il momento.',
      serverError:
        'Il servizio Nous ha avuto un problema. Premi «Riprova» tra poco oppure collega un altro fornitore per il momento.',
      powRequired:
        'Il server Nous ha richiesto una prova di lavoro, ma il tuo agente non la supporta ancora. Accedi o crea un account Nous gratuito per continuare.',
      locked:
        'Questa sessione non può continuare senza l’accesso. Accedi o crea un account Nous gratuito per proseguire.',
      generic:
        'Hebri non è riuscito a configurare l’accesso gratuito senza autenticazione. Puoi accedere gratuitamente oppure collegare un altro fornitore.',
      signInBelow: 'L’accesso è gratuito. Scegli Nous qui sotto.',
      retrying: 'Nuovo tentativo…'
    }
  }
} satisfies TranslationOverrides
