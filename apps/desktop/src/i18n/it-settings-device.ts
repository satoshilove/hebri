import type { TranslationOverrides } from './define-locale'

export const itSettingsDevice = {
  settings: {
    uninstallSection: {
      dangerZone: 'Operazioni irreversibili',
      checkingInstalled: 'Verifica dei componenti installati…',
      uninstallHermes: 'Disinstalla Hebri',
      chooseHowMuch:
        'Scegli cosa rimuovere. L’app si chiude per completare l’operazione; puoi riaprire il programma di installazione in qualsiasi momento.',
      confirmUninstall: 'Conferma la disinstallazione',
      confirmBody: what => `Questa operazione rimuove ${what}. Non può essere annullata.`,
      appLabel: 'App:',
      couldNotStart: 'Impossibile avviare la disinstallazione.',
      uninstalling: 'Disinstallazione…',
      yesUninstall: 'Sì, disinstalla',
      options: {
        gui: {
          title: 'Disinstalla solo l’interfaccia della chat',
          description: 'Rimuovi questa app desktop. L’agente Hebri, la configurazione e le chat vengono conservati.',
          consequence: 'l’interfaccia desktop della chat (questa app e i suoi dati)'
        },
        lite: {
          title: 'Disinstalla interfaccia e agente, conserva i miei dati',
          description:
            'Rimuovi l’app e l’agente Hebri, conservando configurazione, chat e dati riservati per una futura reinstallazione.',
          consequence:
            'l’interfaccia della chat e l’agente Hebri (configurazione, chat e dati riservati vengono conservati)'
        },
        full: {
          title: 'Disinstalla tutto',
          description:
            'Rimuovi app, agente e tutti i dati utente: configurazione, chat, attività pianificate, dati riservati e registri.',
          consequence:
            'TUTTO: interfaccia della chat, agente Hebri e tutti i dati di configurazione, chat, dati riservati e registri'
        }
      }
    },
    poolLimits: {
      warmBotBackendsAria: 'Motori dei compagni mantenuti pronti',
      warmBotBackendsTitle: 'Motori dei compagni mantenuti pronti',
      backendIdleTimeoutAria: 'Tempo massimo di inattività del motore in millisecondi',
      backendIdleTimeoutTitle: 'Tempo massimo di inattività del motore'
    },
    customEndpoints: {
      active: 'Attivo',
      apiKeySet: 'Chiave API impostata',
      use: 'Usa',
      editTitle: 'Modifica endpoint',
      addTitle: 'Aggiungi endpoint',
      fields: {
        providerId: 'Identificativo del fornitore',
        endpointUrl: 'URL dell’endpoint',
        defaultModel: 'Modello predefinito',
        context: 'Contesto',
        apiKey: 'Chiave API',
        apiKeyNewPlaceholder: 'Lascia vuoto per mantenere la chiave attuale',
        apiKeyPlaceholder: 'Facoltativa',
        useNewChats: 'Usa per le nuove chat',
        discoverModels: 'Rileva modelli'
      },
      test: 'Verifica',
      newEndpoint: 'Nuovo endpoint',
      apiMode: 'Modalità API',
      autoDetect: 'Rilevamento automatico',
      couldNotLoad: 'Impossibile caricare gli endpoint personalizzati',
      endpointSaved: 'Endpoint personalizzato salvato.',
      saveFailed: 'Salvataggio non riuscito',
      endpointReachable: 'L’endpoint è raggiungibile.',
      endpointReachableTransport: transport => `L’endpoint è raggiungibile (percorso ${transport} disponibile).`,
      endpointReachableModels: (reachable, count) => `${reachable} Modelli trovati: ${count}.`,
      endpointValidationFailed: 'Convalida dell’endpoint non riuscita.',
      validationFailed: 'Convalida non riuscita',
      activationFailed: 'Attivazione non riuscita',
      deleteConfirm: name => `Eliminare ${name}?`,
      deleteFailed: 'Eliminazione non riuscita',
      deleteEndpoint: 'Elimina endpoint',
      emptyDescription: 'Aggiungi qui sotto un endpoint compatibile con OpenAI.',
      emptyTitle: 'Nessun endpoint personalizzato',
      namePlaceholder: 'Axet Proxy'
    },
    computerUse: {
      intro:
        'Consenti a Hebri di esaminare e usare le app desktop quando lo richiedi esplicitamente. Questo accesso al computer locale è separato dall’automazione del browser e dai gateway di messaggistica esterni.',
      consentTitle: 'Il controllo resta a te',
      consentDesc:
        'L’installazione del driver non avvia il controllo autonomo. Hebri può usarlo solo durante un’attività che richiama il controllo del computer; restano valide le richieste di autorizzazione del sistema operativo.',
      readinessTitle: 'Stato dei permessi e del driver',
      backendTitle: 'Motore di controllo del computer',
      backendDesc: 'Installa o seleziona il driver locale per acquisizioni dello schermo, clic e pressioni dei tasti.',
      accessibility: 'Accessibilità',
      screenRecording: 'Registrazione dello schermo',
      driverHealth: 'Stato del driver'
    },
    about: {
      heading: 'Hebri Desktop',
      version: value => `Versione ${value}`,
      versionUnavailable: 'Versione non disponibile',
      bundleOutOfSync: 'Versione dell’app non aggiornata',
      bundleOutOfSyncDesc:
        'Il motore di Hebri è stato aggiornato, ma l’app desktop usa ancora una versione precedente. Le nuove funzioni dell’interfaccia, come il pannello Compagni, non saranno disponibili fino all’aggiornamento. Avvia l’aggiornamento qui sotto per ricompilare l’app. Se l’avviso resta, reinstalla dall’ultimo programma di installazione desktop.',
      bundleOutOfSyncAction: 'Scarica il programma di installazione',
      bundleSwapPending: 'Riavvia per completare l’aggiornamento',
      bundleSwapPendingDesc:
        'L’app aggiornata è già installata: basta riavviare Hebri per caricarla. Chat e impostazioni vengono conservate.',
      updates: 'Aggiornamenti',
      checkNow: 'Controlla ora',
      checking: 'Verifica…',
      seeWhatsNew: 'Scopri le novità',
      releaseNotes: 'Note della versione',
      onLatest: 'Stai usando la versione più recente.',
      installing: 'È in corso l’installazione di un aggiornamento.',
      cantUpdate: 'Questa versione non può aggiornarsi dall’app.',
      cantReach: 'Impossibile raggiungere il server degli aggiornamenti.',
      tapCheck: 'Premi “Controlla ora” per cercare aggiornamenti.',
      updateReady: count => `È pronto un aggiornamento con ${count} ${count === 1 ? 'modifica' : 'modifiche'}.`,
      updateReadyUnknown: 'È pronto un nuovo aggiornamento.',
      lastChecked: age => `Ultimo controllo: ${age}`,
      justNowSuffix: ' · poco fa',
      automaticUpdates: 'Aggiornamenti automatici',
      automaticUpdatesDesc:
        'Hebri cerca automaticamente gli aggiornamenti in secondo piano e ti avvisa quando sono pronti.',
      branchCommit: (branch, commit) => `Ramo ${branch} · Revisione ${commit}`,
      never: 'mai',
      justNow: 'poco fa',
      minAgo: count => `${count} min fa`,
      hoursAgo: count => `${count} ${count === 1 ? 'ora' : 'ore'} fa`,
      daysAgo: count => `${count} ${count === 1 ? 'giorno' : 'giorni'} fa`
    },
    hudModifier: {
      title: 'Premi per richiamare il pannello HUD',
      description:
        'Premi e rilascia ⌘ + Option su Mac oppure Ctrl + Alt su Windows/Linux per portare il pannello HUD in primo piano da qualsiasi app. Disattivato per impostazione predefinita; vale solo per questo dispositivo.',
      permission:
        'Autorizza Hebri in Impostazioni di Sistema → Privacy e sicurezza → Monitoraggio input, poi riprova. Questo gesto non registra i tasti né acquisisce lo schermo.',
      unavailable:
        'Il servizio del gesto HUD non è riuscito ad avviarsi o si è arrestato inaspettatamente. Riprova o riavvia Hebri. La scorciatoia HUD esistente continua a funzionare dentro Hebri.',
      missingHelper:
        'Questa installazione di Hebri non contiene il servizio del gesto HUD. Aggiorna o reinstalla Hebri, poi riprova.',
      unsupportedSession:
        'Questa sessione desktop non supporta i gesti globali con i tasti modificatori. Su Linux serve X11; Wayland non è supportato.'
    },
    screenshot: {
      enabledTitle: 'Scorciatoia per acquisire lo schermo',
      enabledDesc:
        'Premi insieme i due tasti Command da qualsiasi app per acquisire la finestra in primo piano e allegarla alla bozza attuale di Hebri. L’immagine non viene mai inviata automaticamente. Disattivato per impostazione predefinita; vale solo per questo Mac. La finestra può contenere dati riservati: controlla l’allegato prima di inviarlo.',
      statusTitle: 'Stato della scorciatoia di acquisizione',
      checking: 'Verifica della scorciatoia di acquisizione…',
      disabled: 'La scorciatoia di acquisizione è disattivata.',
      starting: 'Avvio del rilevamento della scorciatoia. Non è ancora pronto.',
      ready: 'La scorciatoia è pronta. Le immagini vengono allegate alla bozza attuale senza inviarla.',
      inputPermission:
        'Il permesso Monitoraggio input consente a Hebri di rilevare i due tasti Command mentre è attiva un’altra app. Autorizza Hebri in Impostazioni di Sistema → Privacy e sicurezza → Monitoraggio input, poi torna qui e riprova.',
      screenPermission:
        'Il permesso Registrazione schermo consente a Hebri di acquisire la finestra in primo piano quando usi questa scorciatoia. Autorizza Hebri in Impostazioni di Sistema → Privacy e sicurezza → Registrazione schermo, poi torna qui e riprova. Riavvia Hebri se macOS lo richiede.',
      openSettings: 'Apri Impostazioni di Sistema',
      unavailable: 'La scorciatoia di acquisizione non è disponibile. Riprova oppure disattivala.',
      errorTitle: 'Errore della scorciatoia di acquisizione',
      loadFailed: 'Impossibile leggere lo stato della scorciatoia. Riprova per verificare l’impostazione attuale.',
      saveFailed:
        'Impossibile confermare la modifica della scorciatoia. Riprova per verificare l’impostazione attuale.',
      permissionFailed:
        'Impossibile aprire Impostazioni di Sistema. Apri manualmente Privacy e sicurezza, poi riprova.',
      captureFailed: 'Impossibile acquisire la finestra in primo piano. Nessuna immagine è stata allegata o inviata.',
      contextChanged: 'La bozza attuale è cambiata durante l’acquisizione. L’immagine non è stata allegata né inviata.'
    },
    quickEntry: {
      enabledTitle: 'Inserimento rapido',
      enabledDesc:
        'Richiama un piccolo campo di scrittura da qualsiasi app con una scorciatoia globale e invia una richiesta senza aprire Hebri.',
      shortcutTitle: 'Scorciatoia per l’inserimento rapido',
      shortcutDesc: 'Richiede almeno un tasto modificatore, ad esempio CommandOrControl+Shift+Space.',
      active: 'La scorciatoia è attiva.',
      takenBy: 'Un’altra app usa già questa scorciatoia: scegline una diversa.',
      invalidShortcut: 'Scorciatoia non valida. Includi almeno un tasto modificatore.'
    },
    credentials: {
      pasteKey: 'Incolla la chiave',
      pasteLabelKey: label => `Incolla la chiave ${label}`,
      optional: 'Facoltativo',
      enterValueFirst: 'Inserisci prima un valore.',
      saving: 'Salvataggio'
    },
    envActions: {
      manageInKeys: 'Gestisci in Chiavi API',
      revealValue: 'Mostra valore'
    },
    sessions: {
      loading: 'Caricamento delle sessioni archiviate…',
      archivedTitle: 'Sessioni archiviate',
      archivedIntro:
        'Le chat archiviate sono nascoste dalla barra laterale, ma conservano tutti i messaggi. Per archiviare una chat nella barra laterale, fai clic tenendo premuti Alt/⌥+Maiusc/⇧.',
      emptyArchivedTitle: 'Nessuna chat archiviata',
      emptyArchivedDesc: 'Archivia una chat per nasconderla dalla barra laterale e conservarla qui.',
      unarchive: 'Ripristina dall’archivio',
      deletePermanently: 'Elimina definitivamente',
      messages: count => `${count} ${count === 1 ? 'messaggio' : 'messaggi'}`,
      restored: 'Ripristinata',
      deleteConfirm: title => `Eliminare definitivamente “${title}”? L’operazione è irreversibile.`,
      autoArchiveTitle: 'Archivia automaticamente le chat inattive',
      autoArchiveDesc:
        'Archivia automaticamente le chat che non usi da tempo. Le chat fissate non vengono mai archiviate e nulla viene eliminato: le chat archiviate vengono semplicemente spostate qui.',
      autoArchiveDaysLabel: 'Archivia dopo',
      autoArchiveDaysUnit: 'giorni di inattività',
      autoArchiveFailed: 'Impossibile aggiornare l’archiviazione automatica',
      defaultDirTitle: 'Cartella predefinita dei progetti',
      defaultDirDesc:
        'Le nuove sessioni iniziano in questa cartella, a meno che non ne scegli un’altra. Lascia non impostato per usare la cartella personale.',
      defaultDirUpdated:
        'Cartella predefinita dei progetti aggiornata: avvia una nuova chat (Ctrl/⌘+N) per applicare la modifica',
      defaultsTo: label => `Valore predefinito: ${label}.`,
      failedLoad: 'Impossibile caricare le sessioni archiviate',
      unarchiveFailed: 'Ripristino dall’archivio non riuscito',
      deleteFailed: 'Eliminazione non riuscita',
      updateDirFailed: 'Impossibile aggiornare la cartella predefinita',
      clearDirFailed: 'Impossibile rimuovere la cartella predefinita'
    }
  }
} satisfies TranslationOverrides
