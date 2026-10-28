import { mergeTranslations } from '@hermes/shared/i18n'

import { additionalIt } from './additional-it'
import { defineLocale, type TranslationOverrides } from './define-locale'
import { introIt } from './intro-it'
import { italianSupplements } from './it-supplements'

// Italian desktop overlay. Shared wording follows web/src/i18n/it.ts.
// Additional desktop copy is organized by feature in the Italian supplements.
const itBase = {
  additional: additionalIt,
  intro: introIt,
  browserAccess: {
    useInChat: 'Consenti a questo agente di usare la scheda',
    title: 'Consentire l’accesso al browser in background?',
    body: 'Per 10 minuti, questa chat e i suoi agenti delegati possono leggere, acquisire immagini e utilizzare questa scheda sul sito indicato sopra, anche mentre usi un’altra chat. Questo non autorizza acquisti, operazioni finanziarie o altre azioni rilevanti. Puoi revocare l’accesso con il pulsante sopra il browser. Chiudere la scheda, cambiare profilo o lasciare il sito revoca l’accesso.',
    allow: 'Consenti per 10 minuti',
    stop: 'Revoca accesso al browser in background'
  },
  connectors: {
    connect: 'Collega',
    connected: 'Collegato',
    setupCancel: 'Annulla',
    title: 'Collega le tue app',
    skip: 'Non ora',
    cancel: 'Interrompi attesa',
    retry: 'Riprova',
    grant: 'Ricollega',
    checking: 'Verifica delle app…',
    notConnected: 'Non collegato',
    skipped: 'Saltato',
    disabled: 'Non disponibile',
    failed: 'Impossibile collegarsi',
    needsAuth: 'Accesso scaduto',
    opening: 'Apertura della pagina di accesso…',
    waiting: 'In attesa del browser…',
    timeout: 'In attesa dell’autorizzazione.',
    refresh: 'Aggiorna stato',
    connectError: 'Impossibile avviare l’autorizzazione. Riprova.',
    unavailable: 'I connettori non sono disponibili per questa sessione.',
    ownerMissing: 'Riapri questa conversazione per gestirne i collegamenti.',
    search: 'Cerca un’app',
    empty: 'Nessuna app corrispondente',
    disclaimer: 'Il collegamento è facoltativo. Autorizza solo le app che vuoi far utilizzare a Hebri.',
    execution: 'Strumenti dei connettori',
    openInBrowser: 'Apri nel browser',
    authorizedToolsUnavailable: 'Autorizzato. Strumenti non disponibili.',
    required: 'Obbligatorio',
    connectErrorFor: app => `Impossibile avviare l’autorizzazione per ${app}.`,
    setup: server => `Configura ${server}`
  },
  connectorsPage: {
    segment: {
      all: 'Tutti',
      connected: 'Collegato'
    },
    group: {
      connected: 'Collegato'
    },
    card: {
      state: {
        connected: 'Collegato',
        serverError: 'Errore',
        serverOff: 'Disattivato',
        accessExpired: 'Accesso scaduto',
        connecting: 'Connessione in corso',
        couldNotConnect: 'Impossibile collegarsi',
        serverOn: 'Attivo'
      },
      verb: {
        connect: 'Collega',
        install: 'Installa',
        openLogs: 'Apri registri',
        reconnect: 'Ricollega',
        stopWaiting: 'Interrompi attesa',
        tryAgain: 'Riprova'
      }
    },
    page: {
      retry: 'Riprova',
      noMatchTitle: 'Nessuna app corrispondente',
      signIn: 'Accedi'
    },
    add: {
      name: 'Nome',
      authNone: 'Nessuno'
    },
    dialog: {
      disconnect: 'Disconnetti',
      advanced: 'Avanzate'
    },
    tools: {
      summaryOther: 'Altro',
      retry: 'Riprova',
      saving: 'Salvataggio...',
      remove: 'Rimuovi'
    }
  },
  sessionImport: {
    all: 'Tutti',
    title: 'Continua da un’altra app',
    subtitle: 'Importa una conversazione in Hebri e riprendi da dove eri rimasto.',
    action: 'Importa sessione',
    readingFrom: 'Origine',
    connectedComputer: 'il computer collegato',
    destination: 'Importa in',
    search: 'Cerca tra le sessioni caricate',
    scanning: 'Ricerca delle conversazioni',
    empty: 'Nessuna conversazione trovata',
    noMatches: 'Nessuna conversazione corrispondente',
    more: 'Carica altre sessioni',
    messages: 'messaggi',
    previewLoading: 'Apertura anteprima',
    previewError: 'Anteprima non disponibile',
    you: 'Tu',
    importing: 'Importazione…',
    open: 'Apri in Hebri',
    continue: 'Continua in Hebri',
    importError: 'Impossibile importare questa conversazione.'
  },
  common: {
    apply: 'Applica',
    save: 'Salva',
    saving: 'Salvataggio…',
    cancel: 'Annulla',
    clear: 'Cancella',
    close: 'Chiudi',
    collapse: 'Comprimi',
    confirm: 'Conferma',
    connect: 'Collega',
    copied: 'Copiato',
    copy: 'Copia',
    delete: 'Elimina',
    done: 'Fatto',
    error: 'Errore',
    expand: 'Espandi',
    failed: 'Non riuscito',
    loading: 'Caricamento…',
    notSet: 'Non impostato',
    refresh: 'Aggiorna',
    replace: 'Sostituisci',
    retry: 'Riprova',
    set: 'Imposta',
    off: 'Disattivato',
    back: 'Indietro',
    change: 'Cambia',
    choose: 'Scegli',
    connecting: 'Connessione in corso',
    continue: 'Continua',
    bots: 'Compagni',
    copyFailed: 'Copia non riuscita',
    docs: 'Documentazione',
    formatJson: 'Formatta JSON',
    free: 'Gratis',
    remove: 'Rimuovi',
    run: 'Esegui',
    send: 'Invia',
    skip: 'Salta',
    update: 'Aggiorna',
    on: 'Attivo',
    tryHint: term => `Prova “${term}”`
  },
  fileMenu: {
    delete: 'Elimina',
    renameTitle: 'Rinomina',
    copyPath: 'Copia percorso',
    rename: 'Rinomina…'
  },
  boot: {
    failure: {
      retry: 'Riprova',
      title: 'Impossibile avviare Hebri',
      description:
        'Il servizio in background di Hebri non si è avviato. Prova una delle opzioni di ripristino qui sotto. Le chat e le impostazioni non verranno eliminate.',
      details: 'Dettagli',
      repairInstall: 'Ripara installazione',
      useLocalGateway: 'Usa gateway locale',
      gatewaySettings: 'Impostazioni gateway',
      back: 'Indietro',
      openLogs: 'Apri registri',
      repairHint: 'La riparazione esegue nuovamente l’installazione e può richiedere alcuni minuti.',
      hideRecentLogs: 'Nascondi registri recenti',
      showRecentLogs: 'Mostra registri recenti'
    },
    ready: 'Hebri Desktop è pronto',
    steps: {
      connectingGateway: 'Connessione al gateway desktop',
      loadingSettings: 'Caricamento delle impostazioni di Hebri',
      loadingSessions: 'Caricamento delle sessioni recenti',
      retryingRemoteBackend: 'Riconnessione al servizio remoto di Hebri…',
      startingDesktopConnection: 'Avvio della connessione desktop',
      startingHermesDesktop: 'Avvio di Hebri Desktop…'
    },
    errors: {
      backgroundExitedDuringStartup: 'Hebri si è arrestato subito dopo l’avvio.',
      backendStopped: 'Il servizio in background di Hebri si è arrestato',
      restartHermes: 'Riavvia Hebri',
      openLogs: 'Apri registri',
      desktopBootFailed: 'Impossibile avviare Hebri',
      gatewayConnectionLost: 'Hebri ha perso la connessione',
      reconnectNow: 'Ricollega ora',
      connectionSettings: 'Impostazioni di connessione',
      gatewaySignInRequired: 'La sessione remota di Hebri è scaduta',
      gatewaySignInRequiredDetail: 'Accedi di nuovo per ricollegarti. Le chat e le impostazioni sono al sicuro.',
      signInAgain: 'Accedi di nuovo',
      ipcBridgeUnavailable:
        'Hebri Desktop non riesce a comunicare con il proprio servizio in background. Riavvia l’app.'
    },
    causes: {
      exitedEarly: 'Il servizio in background di Hebri si è arrestato subito dopo l’avvio.',
      timedOut: 'Il servizio in background di Hebri non ha risposto in tempo.',
      permission: 'Hebri non riesce a scrivere nella cartella dei dati: autorizzazioni insufficienti.',
      diskFull: 'Il disco è pieno. Impossibile avviare Hebri.',
      portInUse: 'Un altro programma sta usando la porta di rete necessaria a Hebri.',
      installMissing: 'Mancano alcuni file di Hebri. Seleziona Ripara installazione per ripristinarli.'
    },
    desktopBootFailedWithMessage: message => `Avvio non riuscito: ${message}`
  },
  notifications: {
    hide: 'Nascondi',
    show: 'Mostra',
    updateHermes: 'Aggiorna Hebri',
    mcp: {
      disable: 'Disabilita',
      signIn: 'Accedi'
    },
    region: 'Notifiche',
    details: 'Dettagli',
    actions: {
      restartHermes: 'Riavvia Hebri'
    }
  },
  sendDiagnostics: {
    cancel: 'Annulla',
    close: 'Chiudi',
    links: {
      discord: 'Discord'
    }
  },
  titlebar: {
    search: 'Cerca',
    hideSidebar: 'Nascondi barra laterale',
    showSidebar: 'Mostra barra laterale',
    searchTitle: 'Cerca sessioni, viste e azioni',
    swapSidebarSides: 'Scambia le barre laterali',
    hideRightSidebar: 'Nascondi barra laterale destra',
    showRightSidebar: 'Mostra barra laterale destra',
    muteHaptics: 'Disattiva feedback aptico',
    unmuteHaptics: 'Attiva feedback aptico',
    openSettings: 'Apri impostazioni',
    openWeb: 'Apri il browser',
    openStarmap: 'Apri il grafo della memoria',
    enterHud: 'Modalità HUD',
    exitHud: 'Esci dalla modalità HUD',
    resetHudLayout: 'Ripristina dimensioni e posizione dell’HUD',
    layoutEditor: 'Editor della disposizione',
    unreadSessions: count => (count === 1 ? '1 sessione non letta' : `${count} sessioni non lette`),
    layoutEditorTitle: mod => `Editor della disposizione — ${mod}-clic per ripristinare`
  },
  keybinds: {
    categories: {
      profiles: 'Profili',
      navigation: 'Navigazione'
    },
    actions: {
      'nav.settings': 'Apri impostazioni',
      'session.new': 'Nuova sessione',
      'session.focusSearch': 'Cerca sessioni',
      'view.flipPanes': 'Scambia le barre laterali',
      'composer.send': 'Invia messaggio'
    }
  },
  language: {
    switchTo: 'Cambia lingua',
    label: 'Lingua',
    description: 'Scegli la lingua dell’interfaccia desktop.',
    saving: 'Salvataggio della lingua…',
    saveError: 'Impossibile aggiornare la lingua',
    searchPlaceholder: 'Cerca una lingua…',
    noResults: 'Nessuna lingua trovata'
  },
  settings: {
    subpages: {
      appearanceTheme: 'Tema',
      appearanceTypography: 'Caratteri',
      appearanceWindowLayout: 'Finestra e disposizione',
      appearanceChatDisplay: 'Visualizzazione della chat',
      appearancePet: 'Mascotte',
      appearanceGeneral: 'Generale',
      modelMain: 'Modello principale',
      modelAuxiliary: 'Modelli ausiliari',
      modelMoa: 'Combinazione di agenti',
      modelFallbacks: 'Modelli di riserva',
      chatBehavior: 'Comportamento',
      chatAttachments: 'Allegati',
      workspaceProjects: 'Progetti e ricerca',
      workspaceShell: 'Ambiente della shell',
      workspaceFiles: 'File ed esecuzione',
      safetyApprovals: 'Approvazioni',
      safetyPrivacy: 'Privacy e rete',
      safetyCheckpoints: 'Punti di ripristino',
      browserProfile: 'Profilo del browser',
      browserNetwork: 'URL locali e privati',
      memoryPersistent: 'Memoria persistente',
      memoryContext: 'Contesto e compressione',
      voiceConversation: 'Conversazione vocale',
      voiceTranscription: 'Trascrizione vocale',
      voiceSpeech: 'Sintesi vocale',
      advancedRuntime: 'Limiti dell’agente',
      advancedTools: 'Accesso agli strumenti',
      advancedTerminal: 'Motore del terminale',
      advancedOutput: 'Limiti dei risultati',
      advancedDelegation: 'Agenti secondari',
      advancedDesktop: 'Desktop e avvio',
      gatewayConnection: 'Questa finestra',
      gatewayHebriDevices: 'Dispositivi Hebri',
      gatewayDevices: 'Connessioni salvate',
      gatewayManagedUpdates: 'Aggiornamenti remoti',
      gatewayManagedUpdatesUnavailable:
        'Gli aggiornamenti remoti richiedono una versione desktop che supporti gli aggiornamenti gestiti tramite SSH.',
      gatewayManagedUpdatesEmpty:
        'Aggiungi una connessione SSH in Connessioni salvate per gestirne gli aggiornamenti qui.',
      keyboardShortcuts: 'Scorciatoie da tastiera',
      hudGesture: 'Gesto per il pannello HUD',
      screenCapture: 'Acquisizione dello schermo',
      notificationAlerts: 'Avvisi sul desktop',
      notificationSounds: 'Suoni',
      archivedSessions: 'Archivio e conservazione',
      defaultDirectory: 'Cartella predefinita dei progetti',
      vaultCredentials: 'Credenziali salvate',
      vaultSources: 'Gestori di password',
      appUpdates: 'Versione e aggiornamenti',
      uninstall: 'Disinstalla',
      billingOverview: 'Panoramica',
      billingPlans: 'Piani'
    },
    resetToDefaults: 'Ripristina valori predefiniti',
    nav: {
      sessions: 'Sessioni',
      providers: 'Fornitori',
      providerAccounts: 'Account',
      providerApiKeys: 'Chiavi API',
      providerCustomEndpoints: 'Endpoint personalizzati',
      providerLocalModels: 'Modelli locali',
      gateway: 'Gateway',
      computerControl: 'Controllo del computer',
      apiKeys: 'Strumenti e chiavi',
      keybinds: 'Scorciatoie da tastiera',
      keysTools: 'Strumenti',
      keysSettings: 'Impostazioni',
      mcp: 'MCP',
      archivedChats: 'Chat archiviate',
      about: 'Informazioni',
      billing: 'Fatturazione',
      notifications: 'Notifiche',
      vault: 'Password e accessi'
    },
    plugins: {
      rescan: 'Riscansiona',
      enable: 'Abilita',
      disable: 'Disabilita',
      installModal: {
        install: 'Installa'
      }
    },
    vault: {
      add: 'Aggiungi',
      adding: 'Salvataggio…',
      addConfirm: 'Salva',
      kinds: {
        login: 'Accedi'
      },
      identifierTypes: {
        email: 'Email'
      },
      optional: '(facoltativo)',
      deleteConfirm: 'Elimina',
      sources: {
        statusOff: 'Disattivato',
        statusUnlocked: 'Sbloccato'
      },
      title: 'Password e accessi'
    },
    notifications: {
      testTitle: 'Hebri',
      title: 'Notifiche',
      completionSoundPreview: 'Anteprima'
    },
    sections: {
      model: 'Modello',
      chat: 'Chat',
      workspace: 'Spazio di lavoro',
      voice: 'Voce',
      appearance: 'Aspetto',
      safety: 'Sicurezza',
      memory: 'Memoria e contesto',
      advanced: 'Avanzate'
    },
    modeOptions: {
      light: { label: 'Chiara', description: 'Interfaccia desktop luminosa' },
      dark: { label: 'Scura', description: 'Spazio di lavoro con meno abbagliamento' },
      system: {
        label: 'Sistema',
        description: 'Segui l’aspetto del sistema operativo'
      }
    },
    appearance: {
      title: 'Aspetto',
      intro: 'Solo per il desktop. La modalità regola la luminosità; il tema definisce i colori e lo stile della chat.',
      colorMode: 'Modalità colore',
      colorModeDesc: 'Scegli una modalità fissa oppure usa le impostazioni del sistema.',
      toolViewTitle: 'Visualizzazione degli strumenti',
      toolViewDesc:
        'La vista Semplice nasconde i dati grezzi; la vista Tecnica mostra tutti i dati in ingresso e in uscita.',
      hideCodeDiffsTitle: 'Nascondi le differenze nel codice',
      hideCodeDiffsDesc:
        'Mostra le modifiche ai file come righe degli strumenti, con il numero di righe aggiunte e rimosse, senza il codice.',
      hideThreadTimelineTitle: 'Nascondi le barre cronologiche',
      hideThreadTimelineDesc: 'Nascondi le barre di navigazione sul bordo destro di ogni conversazione.',
      reasoningCollapsedTitle: 'Comprimi il ragionamento per impostazione predefinita',
      reasoningCollapsedDesc: 'Mantieni disponibile il ragionamento in corso, ma espandilo solo quando lo apri.',
      uiScaleTitle: 'Dimensione dell’interfaccia',
      uiScaleDesc: percent =>
        `Ridimensiona testo e controlli in tutta l’app. Puoi anche usare Cmd/Ctrl con +, - e 0. Valore attuale: ${percent}%.`,
      sessionDensityTitle: 'Densità dell’elenco delle sessioni',
      sessionDensityDesc: 'Scegli quanti dettagli mostrare sotto i titoli delle sessioni nella barra laterale.',
      sessionDensityCompact: 'Compatta',
      sessionDensityComfortable: 'Comoda',
      sessionDensityDetailed: 'Dettagliata',
      tabStripTitle: 'Barra delle schede',
      tabStripDesc:
        'Mostra le schede sopra un’area. In modalità automatica vengono nascoste quando c’è un solo riquadro, a meno che non sia aperta un’altra chat o area.',
      tabStripAuto: 'Automatica',
      tabStripAlways: 'Sempre',
      tabStripNever: 'Mai',
      appActionsTitle: 'Comandi dell’app',
      appActionsDesc:
        'Posizione di Impostazioni, Web, Disposizione e HUD nella barra del titolo. A destra lascia spazio alle schede sulla sinistra.',
      appActionsLeft: 'A sinistra',
      appActionsRight: 'A destra',
      terminalFontTitle: 'Carattere del terminale',
      terminalFontDesc:
        'Scegli un carattere installato per i terminali desktop. I Nerd Font supportano Powerlevel10k e le icone della shell; lascia vuoto per usare JetBrains Mono incluso nell’app.',
      terminalFontPlaceholder: 'MesloLGS NF o un elenco di caratteri CSS',
      terminalFontPreview: 'Anteprima dei glifi',
      terminalFontReset: 'Usa il carattere predefinito',
      chatFontTitle: 'Carattere della chat',
      chatFontDesc:
        'Scegli un carattere installato per la chat e il resto dell’app, ad esempio OpenDyslexic per migliorare la leggibilità. Lascia vuoto per usare il carattere del tema.',
      chatFontPlaceholder: 'OpenDyslexic o un elenco di caratteri CSS',
      chatFontPreview: 'Anteprima',
      chatFontSample: 'La volpe salta tra i fiori del giardino. È già un bel giorno! 0123456789',
      chatFontReset: 'Usa il carattere del tema',
      translucencyTitle: 'Trasparenza della finestra',
      translucencyDesc:
        'Mostra il desktop attraverso l’intera finestra, testo compreso. Si regola separatamente per la modalità chiara e scura.',
      translucencyGlassDesc:
        'Vetro opaco: il desktop appare sfocato, mentre il testo resta nitido. Si regola separatamente per la modalità chiara e scura.',
      translucencyModeClear: 'Trasparente',
      translucencyModeGlass: 'Vetro',
      translucencyTintTitle: 'Tinta',
      translucencyFadeTitle: 'Dissolvenza',
      translucencyFrostTitle: 'Satinatura',
      translucencyFrost: {
        'under-window': 'Intensa',
        popover: 'Morbida',
        titlebar: 'Luminosa',
        header: 'Riflesso'
      },
      translucencyScopeTitle: 'Area',
      translucencyScope: { window: 'Intera finestra', sidebar: 'Solo barra laterale' },
      backdropTitle: 'Sfondo della chat',
      backdropDesc: 'L’immagine tenue della statua dietro la conversazione.',
      userBubbleTitle: 'Bolla dei messaggi',
      userBubbleDesc: 'Regola la trasparenza dei tuoi messaggi. A 0 sono opachi; a 100 rimane solo il contorno.',
      textDirectionTitle: 'Direzione del testo',
      textDirectionDesc:
        'Scegli la direzione dei messaggi e del campo di scrittura. La modalità automatica segue la prima lettera di ogni paragrafo; imposta una direzione se il testo misto non si allinea correttamente. Il codice resta sempre da sinistra a destra.',
      textDirection: { auto: 'Automatica', rtl: 'Da destra a sinistra', ltr: 'Da sinistra a destra' },
      introSplashTitle: 'Schermata iniziale',
      introSplashDesc: 'Il nome dell’app e il suggerimento mostrati in una chat vuota.',
      reactionsTitle: 'Reazioni ai messaggi',
      reactionsDesc: 'Reagisci ai messaggi con emoji, come in iMessage. Anche Hebri può reagire ai tuoi.',
      tipsTitle: 'Suggerimenti nell’app',
      tipsDesc:
        'Suggerimenti occasionali dell’app e di Hebri. Ciascuno appare una sola volta. Si disattivano automaticamente dopo i primi 30 giorni; puoi riattivarli.',
      tipsReset: count => `Mostra di nuovo ${count} ${count === 1 ? 'suggerimento' : 'suggerimenti'}`,
      toursTitle: 'Visite guidate',
      toursDesc:
        'Consenti a Hebri di evidenziare ogni passaggio mentre ti guida nell’app. Si disattivano automaticamente dopo i primi 30 giorni; puoi riattivarle.',
      composerPopoutTitle: 'Campo di scrittura mobile',
      composerPopoutDesc:
        'Consenti di trascinare il campo di scrittura fuori dalla sua posizione. Disattiva per mantenerlo bloccato in basso.',
      vibeHeartsTitle: 'Cuori animati',
      vibeHeartsDesc:
        'Cuori fluttuanti quando scrivi “thanks” (grazie), “ily”, “good bot” o invii un cuore. Questa opzione è separata dalle reazioni ai messaggi.',
      embedsTitle: 'Contenuti incorporati',
      embedsDesc:
        'Le anteprime interattive si caricano da siti esterni (YouTube, X, …). Chiedi mostra un segnaposto finché non le autorizzi; Sempre le carica automaticamente; Disattivato mantiene i semplici collegamenti.',
      embedsAsk: 'Chiedi',
      embedsAlways: 'Sempre',
      embedsOff: 'Disattivato',
      embedsReset: count => `Reimposta ${count} ${count === 1 ? 'servizio autorizzato' : 'servizi autorizzati'}`,
      resumeLastSessionTitle: 'Riapri l’ultima chat all’avvio',
      resumeLastSessionDesc:
        'Se attivo, l’app riapre la chat più recente all’avvio. Disattiva per iniziare sempre con una nuova chat.',
      product: 'Semplice',
      productDesc: 'Attività degli strumenti descritta in modo chiaro, con riepiloghi concisi.',
      technical: 'Tecnica',
      technicalDesc: 'Mostra anche gli argomenti e i risultati grezzi degli strumenti e i dettagli tecnici.',
      themeTitle: 'Tema',
      themeDesc: 'Solo i colori del desktop. La modalità selezionata si applica al tema.',
      themeSearchPlaceholder: 'Cerca tra i tuoi temi o nel Marketplace di VS Code…',
      themeProfileNote: profile => `Salvato per il profilo ${profile}: ogni profilo mantiene il proprio tema.`,
      installTitle: 'Installa da VS Code',
      installDesc:
        'Incolla l’identificativo di un’estensione del Marketplace (ad esempio dracula-theme.theme-dracula) per convertirne i colori in un tema desktop.',
      installPlaceholder: 'publisher.extension',
      installButton: 'Installa',
      installing: 'Installazione…',
      installError: 'Impossibile installare il tema.',
      installed: name => `“${name}” installato.`,
      removeTheme: 'Rimuovi tema',
      importedBadge: 'Importato',
      pet: {
        title: 'Mascotte',
        intro:
          'Adotta una mascotte animata da petdex: si muove sopra l’app e reagisce alle attività di Hebri, correndo mentre gli strumenti lavorano, festeggiando i successi e rattristandosi in caso di errore.',
        restartHint:
          'Le mascotte richiedono un breve riavvio: l’app è stata avviata prima dell’aggiunta di questa funzione. Chiudi e riapri Hebri, poi torna qui.',
        scaleTitle: 'Dimensione',
        scaleDesc: 'Ridimensiona la mascotte. La modifica si applica subito ovunque.',
        roamTitle: 'Movimento libero',
        roamDesc: 'Lascia che la mascotte si muova da sola nella finestra quando è inattiva.',
        chooseTitle: 'Scegli una mascotte',
        chooseDesc: 'La selezione installa la mascotte, se necessario, e la attiva.',
        searchPlaceholder: 'Cerca mascotte…',
        unreachable: 'Impossibile raggiungere la galleria petdex. Controlla la connessione e riapri questa pagina.',
        noMatch: query => `Nessuna mascotte corrisponde a “${query}”.`,
        installedTag: 'installata',
        generatedTag: 'Generata',
        countCapped: (cap, total) => `Visualizzate ${cap} su ${total}: digita per restringere la ricerca.`,
        count: n => `${n} mascotte.`,
        uninstall: name => `Disinstalla ${name}`,
        delete: name => `Elimina ${name}`,
        deleteTitle: name => `Eliminare ${name}?`,
        deleteBody: 'La mascotte verrà eliminata definitivamente e non potrà essere reinstallata.',
        deleteConfirm: 'Elimina',
        rename: name => `Rinomina ${name}`,
        renameTitle: 'Rinomina mascotte',
        renamePlaceholder: 'Dai un nome alla mascotte',
        renameSave: 'Salva',
        exportPet: name => `Esporta ${name}`,
        adoptFailed: slug => `Impossibile adottare ${slug}`,
        uninstallFailed: slug => `Impossibile disinstallare ${slug}`,
        renameFailed: slug => `Impossibile rinominare ${slug}`,
        exportFailed: slug => `Impossibile esportare ${slug}`,
        noneAvailable: 'Non ci sono mascotte da attivare al momento.',
        turnOnFailed: 'Impossibile attivare la mascotte.',
        turnOffFailed: 'Impossibile disattivare la mascotte.'
      }
    },
    customEndpoints: {
      fields: {
        name: 'Nome'
      },
      save: 'Salva',
      title: 'Endpoint personalizzati'
    },
    config: {
      none: 'Nessuno',
      notSet: 'Non impostato',
      searchPlaceholder: 'Cerca...'
    },
    screenshot: {
      retry: 'Riprova'
    },
    envActions: {
      actions: 'Azioni',
      hideValue: 'Nascondi valore',
      replace: 'Sostituisci',
      set: 'Imposta',
      clear: 'Cancella',
      docs: 'Documentazione'
    },
    connections: {
      kindLocal: 'Locale',
      labelTitle: 'Nome',
      saving: 'Salvataggio…',
      cancel: 'Annulla',
      editConnection: 'Modifica',
      removeConnection: 'Rimuovi',
      urlTitle: 'URL del gateway',
      headerRemove: 'Rimuovi'
    },
    gateway: {
      cloudRefresh: 'Aggiorna',
      cloudConnect: 'Collega',
      cloudConnectedTitle: 'Collegato',
      cloudConnectedPill: 'Collegato',
      diagnostics: 'Diagnostica',
      sshUserTitle: 'Utente',
      sshConnect: 'Collega',
      signIn: 'Accedi',
      authTitle: 'Autenticazione',
      tokenTitle: 'Token di sessione',
      pasteSessionToken: 'Incolla token di sessione',
      openLogs: 'Apri registri'
    },
    search: {
      pill: 'Cerca'
    },
    mcp: {
      disabled: 'disabilitato',
      name: 'Nome',
      statusError: 'Errore',
      statusOff: 'Disattivato',
      remove: 'Rimuovi',
      test: 'Verifica connessione',
      noOutput: 'Nessun messaggio disponibile.'
    },
    model: {
      model: 'Modello',
      reasoningOff: 'Disattivato',
      tasks: {
        compression: {
          label: 'Compressione'
        },
        review: {
          label: 'Revisione'
        }
      },
      loadFailed: 'Impossibile caricare i modelli',
      change: 'Cambia'
    },
    localModels: {
      serverRunning: 'In esecuzione',
      modelsTitle: 'Modelli',
      quickstartStageModel: 'Modello',
      activePill: 'Predefinito',
      loadingPill: 'Caricamento…',
      browseRefresh: 'Aggiorna',
      title: 'Modelli locali',
      recommended: 'Consigliato'
    },
    billing: {
      freeTier: {
        model: 'Modello',
        signIn: 'Accedi',
        plan: 'Piano gratuito'
      },
      buyCredits: {
        retry: 'Riprova'
      },
      plan: {
        scheduled: 'Pianificato',
        cancel: 'Annulla',
        tryAgain: 'Riprova'
      },
      autoReload: {
        disable: 'Disabilita',
        save: 'Salva',
        saving: 'Salvataggio…',
        cancel: 'Annulla'
      },
      state: {
        autoRefill: {
          offPill: 'Disattivato',
          notAvailablePill: '—'
        },
        notice: {
          loggedOut: {
            action: 'Accedi'
          }
        },
        paymentMethod: {
          updateAction: 'Aggiorna'
        },
        planCard: {
          freeTier: 'Gratis'
        }
      },
      title: 'Fatturazione'
    },
    providers: {
      connected: 'Collegato',
      collapse: 'Comprimi',
      disconnect: 'Disconnetti',
      otherProviders: 'Altri fornitori'
    },
    sessions: {
      clear: 'Cancella',
      notSet: 'Non impostato',
      change: 'Cambia',
      choose: 'Scegli'
    },
    toolsets: {
      set: 'Imposta',
      notSet: 'Non impostato',
      ready: 'Pronto',
      modelSectionTitle: 'Modello',
      modelDefault: 'predefinito',
      terminalBackend: {
        ready: 'Pronto',
        unavailable: 'Non disponibile'
      },
      nousAuthSignIn: 'Accedi',
      nousAuthTryAgain: 'Riprova',
      postSetupOpenLogs: 'Apri registri',
      browserRealProfile: {
        prompt: {
          notNow: 'Non ora'
        }
      }
    },
    computerUse: {
      title: 'Controllo del computer'
    },
    about: {
      bundleSwapPendingAction: 'Riavvia Hebri',
      updateNow: 'Aggiorna ora'
    },
    credentials: {
      couldNotSave: 'Impossibile salvare la credenziale.',
      remove: 'Rimuovi',
      getKey: 'Ottieni una chiave'
    },
    managedUpdates: {
      update: 'Aggiorna',
      updated: 'Aggiornato'
    }
  },
  skills: {
    tabSkills: 'Competenze',
    all: 'Tutti',
    archive: 'Archivia',
    tabPlugins: 'Plugin',
    plugins: {
      halfAgent: 'Agente',
      kindAgent: 'Agente',
      settingsForm: {
        optional: '(facoltativo)'
      },
      uninstall: 'Disinstalla'
    },
    hub: {
      search: 'Cerca',
      install: 'Installa',
      close: 'Chiudi',
      uninstall: 'Disinstalla',
      preview: 'Anteprima',
      files: 'File'
    },
    edit: 'Modifica'
  },
  starmap: {
    refresh: 'Aggiorna',
    memory: 'Memoria',
    filterAll: 'Tutti',
    loading: 'Caricamento…',
    copied: 'Copiato!'
  },
  agents: {
    running: 'In esecuzione',
    failed: 'Non riuscito',
    done: 'Fatto',
    files: 'File'
  },
  commandCenter: {
    generatePet: {
      retry: 'Riprova',
      hatchSaving: 'Quasi pronto…'
    },
    installTheme: {
      install: 'Installa'
    },
    sections: {
      sessions: 'Sessioni',
      system: 'Sistema'
    },
    nav: {
      messaging: {
        title: 'Messaggistica'
      },
      newChat: {
        title: 'Nuova sessione'
      },
      settings: {
        title: 'Impostazioni'
      },
      capabilities: {
        title: 'Funzionalità'
      },
      artifacts: {
        title: 'Documenti e risultati'
      }
    },
    providerSessions: 'Sessioni',
    refresh: 'Aggiorna',
    deleteSession: 'Elimina sessione',
    updateHermes: 'Aggiorna Hebri',
    statSessions: 'Sessioni',
    statApiCalls: 'chiamate API',
    retry: 'Riprova',
    logLevel: 'Livello',
    maintenance: {
      runOps: 'Diagnostica',
      pause: 'Pausa',
      resume: 'Riprendi'
    },
    back: 'Indietro',
    searchPlaceholder: 'Cerca sessioni, viste e azioni',
    projects: 'Progetti',
    appearance: 'Aspetto',
    settings: 'Impostazioni'
  },
  messaging: {
    states: {
      connected: 'Collegato',
      fatal: 'Errore',
      connecting: 'Connessione in corso'
    },
    saving: 'Salvataggio...',
    telegramQr: {
      expired: 'Scaduto',
      add: 'Aggiungi',
      applying: 'Salvataggio…',
      recommended: 'Consigliato'
    },
    required: 'Obbligatorio',
    recommended: 'Consigliato',
    replaceValue: 'Sostituisci il valore attuale',
    openLogs: 'Apri registri'
  },
  webhooks: {
    enableRow: 'Abilita',
    disableRow: 'Disabilita',
    delete: 'Elimina',
    done: 'Fatto',
    fieldName: 'Nome',
    fieldDescription: 'Descrizione',
    fieldEvents: 'Eventi',
    fieldSkills: 'Competenze',
    fieldDeliver: 'Consegna a',
    fieldPrompt: 'Prompt',
    create: 'Crea',
    creating: 'Creazione…',
    created: 'Creato',
    copy: 'Copia',
    deliverOptions: {
      telegram: 'Telegram',
      discord: 'Discord',
      slack: 'Slack',
      email: 'Email'
    }
  },
  profiles: {
    title: 'Profili',
    allProfiles: 'Tutti i profili',
    remoteOverride: {
      connect: 'Collega',
      confirmBack: 'Indietro'
    },
    actions: 'Azioni',
    default: 'predefinito',
    env: 'env',
    defaultBadge: 'Predefinito',
    rename: 'Rinomina',
    modelLabel: 'Modello',
    skillsLabel: 'Competenze',
    notSet: 'Non impostato',
    saving: 'Salvataggio...',
    deleteTitle: 'Eliminare il profilo?',
    nameLabel: 'Nome',
    cloneFromNone: 'Nessuno (vuoto)',
    creating: 'Creazione…',
    displayNameLabel: 'Nome visualizzato',
    soulSaved: 'SOUL.md salvato',
    renameMenu: 'Rinomina…'
  },
  modelAssignment: {
    confirmAction: 'Conferma'
  },
  cron: {
    states: {
      enabled: 'abilitato',
      disabled: 'disabilitato'
    },
    deliveryLabels: {
      telegram: 'Telegram',
      discord: 'Discord',
      slack: 'Slack',
      email: 'Email'
    },
    scheduleLabels: {
      daily: 'Giornaliero',
      weekly: 'Settimanale',
      monthly: 'Mensile'
    },
    runHistory: 'Cronologia esecuzioni',
    resumeTitle: 'Riprendi',
    pauseTitle: 'Pausa',
    triggerNow: 'Esegui ora',
    nameLabel: 'Nome',
    promptLabel: 'Prompt',
    deliverLabel: 'Consegna a',
    modelLabel: 'Modello',
    title: 'Attività pianificate'
  },
  artifacts: {
    tabAll: 'Tutti',
    colTitleFile: 'Nome',
    chat: 'Chat',
    tabFiles: 'File',
    copyPath: 'Copia percorso'
  },
  artifactCard: {
    open: 'Apri'
  },
  artifactPreview: {
    latest: 'Più recente',
    openInBrowser: 'Apri nel browser'
  },
  sidebar: {
    filter: {
      show: 'Mostra',
      filters: 'Filtri',
      status: 'Stato',
      archived: 'Archiviate',
      resetToDefaults: 'Ripristina valori predefiniti',
      created: 'Creato',
      tokens: 'Token',
      open: 'Apri',
      grouping: 'Raggruppamento',
      ordering: 'Ordinamento',
      profile: 'Profilo',
      project: 'Progetto',
      expandAll: 'Espandi tutto',
      collapseAll: 'Comprimi tutto',
      updated: 'Aggiornato',
      cost: 'Costo',
      manual: 'Manuale',
      preview: 'Anteprima',
      needsInput: 'In attesa di una risposta',
      working: 'In corso',
      unread: 'Non letta',
      draft: 'Bozza',
      idle: 'Inattivo',
      merged: 'Integrata',
      closed: 'Chiusa',
      noPR: 'Nessuna PR'
    },
    gatewayGroups: {
      aliasLabel: 'Nome visualizzato'
    },
    nav: {
      messaging: 'Messaggistica',
      'new-session': 'Nuova sessione',
      capabilities: 'Funzionalità',
      artifacts: 'Documenti e risultati',
      cron: 'Attività pianificate'
    },
    sessions: 'Sessioni',
    terminal: 'Terminale',
    logs: 'Registri',
    projectEmpty: 'Nessuna sessione',
    noSessions: 'Nessuna sessione',
    projects: {
      create: 'Crea',
      menu: 'Azioni',
      menuDelete: 'Elimina',
      removeFromSidebar: 'Nascondi dalla barra laterale',
      showAllSessions: 'Mostra tutte le sessioni',
      sectionLabel: 'Progetti',
      home: 'Home',
      newButton: 'Nuovo progetto',
      createTitle: 'Nuovo progetto',
      createDesc: 'Assegna un nome allo spazio di lavoro e aggiungi una o più cartelle.',
      renameTitle: 'Rinomina progetto',
      addFolderTitle: 'Aggiungi cartella',
      foldersLabel: 'Cartelle',
      noFolders: 'Nessuna cartella aggiunta.',
      addFolder: 'Aggiungi cartella',
      removeFolder: 'Rimuovi',
      menuRename: 'Rinomina…',
      menuAppearance: 'Aspetto',
      noColor: 'Nessun colore',
      menuAddFolder: 'Aggiungi cartella',
      menuSetActive: 'Imposta come attivo',
      moveToProject: 'Sposta nel progetto',
      moveFailed: 'Impossibile spostare la sessione',
      moveNoProjects: 'Nessun altro progetto',
      reveal: 'Mostra nella cartella',
      copyPath: 'Copia percorso',
      createFailed: 'Impossibile creare il progetto',
      worktreeProjectLabel: 'Progetto',
      movedTo: name => `Spostata in ${name}`
    },
    loading: 'Caricamento…',
    row: {
      archive: 'Archivia',
      renamed: 'Rinominato',
      untitledPlaceholder: 'Sessione senza titolo',
      deleteTitle: 'Eliminare la sessione?',
      deleted: 'Sessione eliminata',
      rename: 'Rinomina…'
    },
    statusDivider: {
      done: 'Fatto',
      working: 'In corso'
    },
    searchAria: 'Cerca sessioni',
    searchPlaceholder: 'Cerca sessioni…',
    clearSearch: 'Cancella ricerca',
    results: 'Risultati',
    pinned: 'In evidenza',
    files: 'File',
    review: 'Revisione',
    cronJobs: 'Attività pianificate',
    groupAriaGrouped: 'Mostra le sessioni in un unico elenco',
    groupAriaUngrouped: 'Raggruppa le sessioni per spazio di lavoro',
    showProjects: 'Mostra progetti',
    showSessions: 'Mostra sessioni',
    groupTitleGrouped: 'Separa sessioni',
    groupTitleUngrouped: 'Raggruppa per spazio di lavoro',
    allPinned: 'Tutte le chat sono in evidenza. Rimuovi una chat dai preferiti per mostrarla tra le recenti.',
    shiftClickHint: 'Premi Maiusc e fai clic su una chat per metterla in evidenza',
    noWorkspace: 'Nessuno spazio di lavoro',
    projectLoadFailed: 'Impossibile caricare le sessioni',
    noFilterMatches: 'Nessuna sessione corrisponde a questi filtri',
    noMatch: query => `Nessuna sessione corrisponde a “${query}”.`
  },
  composer: {
    openDirective: 'Apri',
    voiceControls: 'Voce',
    queueSendNext: 'Prossima',
    queueDelete: 'Elimina',
    queueResume: 'Riprendi',
    stop: 'Interrompi',
    send: 'Invia',
    stopShort: 'Interrompi',
    attach: 'Allega',
    queueEdit: 'Modifica',
    queueSend: 'Invia',
    previewUnavailable: 'Anteprima non disponibile',
    dictating: 'Dettatura',
    preparingAudio: 'Preparazione audio',
    speakingResponse: 'Riproduzione della risposta',
    readingAloud: 'Lettura ad alta voce',
    attachLabel: 'Allega',
    files: 'File…',
    folder: 'Cartella…',
    images: 'Immagini…',
    pasteImage: 'Incolla immagine',
    promptSnippets: 'Modelli di richiesta…',
    snippetsTitle: 'Modelli di richiesta',
    dropFiles: 'Trascina qui i file da allegare',
    dropSession: 'Trascina qui per collegare la chat',
    previewLabel: label => `Anteprima di ${label}`,
    couldNotPreview: label => `Impossibile mostrare l’anteprima di ${label}`,
    removeAttachment: label => `Rimuovi ${label}`
  },
  statusStack: {
    running: 'In esecuzione',
    control: {
      objectiveLabel: 'Obiettivo',
      loopPromptLabel: 'Prompt',
      add: 'Aggiungi'
    },
    coding: {
      close: 'Chiudi',
      review: 'Revisione'
    },
    stop: 'Interrompi'
  },
  updates: {
    stages: {
      update: 'Aggiornamento di Hebri…',
      idle: 'Preparazione…',
      prepare: 'Preparazione…',
      fetch: 'Download…',
      pull: 'Quasi pronto…',
      pydeps: 'Completamento…',
      rebuild: 'Ricompilazione dell’app desktop…',
      restart: 'Riavvio di Hebri…',
      done: 'Aggiornamento completato',
      manual: 'Aggiorna dal terminale',
      guiSkew: 'Aggiorna l’app desktop',
      error: 'Aggiornamento in pausa'
    },
    copy: 'Copia',
    copied: 'Copiato',
    done: 'Fatto',
    checking: 'Ricerca di aggiornamenti…',
    checkFailedTitle: 'Impossibile verificare gli aggiornamenti',
    tryAgain: 'Riprova',
    notAvailableTitle: 'Aggiornamento non disponibile',
    unsupportedMessage: 'Questa versione di Hebri non supporta l’aggiornamento dall’app.',
    connectionRetry:
      'Hebri non riesce a contattare il server degli aggiornamenti. Controlla la connessione e riprova. Se usi Hebri da remoto, verifica che sia online.',
    gitUnusable: 'Hebri non riesce a eseguire Git su questo computer e non può verificare gli aggiornamenti.',
    connectionSettings: 'Impostazioni di connessione',
    openDownloadPage: 'Apri pagina di download',
    latestBody: 'Stai usando la versione più recente.',
    latestBodyBackend: 'Il servizio usa la versione più recente.',
    allSetTitle: 'Tutto pronto',
    availableTitle: 'Nuovo aggiornamento disponibile',
    availableBody: 'È disponibile una nuova versione di Hebri.',
    availableTitleBackend: 'Aggiornamento del servizio disponibile',
    updateNow: 'Aggiorna ora',
    maybeLater: 'Più tardi',
    manualTitle: 'Aggiorna dal terminale',
    manualPickedUp: 'Hebri userà la nuova versione al prossimo avvio.',
    guiSkewTitle: 'Aggiorna l’app desktop',
    errorTitle: 'Aggiornamento non completato',
    technicalDetails: 'Dettagli tecnici',
    notNow: 'Non ora',
    clientAlsoBehindTitle: 'L’app desktop non è aggiornata',
    clientAlsoBehindAction: 'Aggiorna l’app desktop',
    everythingSkipped: 'Saltato',
    changeLogNew: 'Novità',
    changeLogFixed: 'Correzioni',
    changeLogFaster: 'Prestazioni',
    changeLogImproved: 'Miglioramenti',
    changeLogOther: 'Altri miglioramenti',
    changeLogFallbackLabel: 'In questo aggiornamento',
    changeLogFallbackItem: 'Miglioramenti e correzioni',
    moreChanges: count => (count === 1 ? '+ 1 altra modifica inclusa.' : `+ ${count} altre modifiche incluse.`),
    portLabel: port => `Porta ${port}`
  },
  install: {
    stageStates: {
      succeeded: 'Fatto',
      failed: 'Non riuscito',
      pending: 'In attesa',
      running: 'Installazione',
      skipped: 'Saltato'
    },
    connected: 'Collegato',
    error: 'Errore',
    oneTimeTitle: 'Hebri richiede una prima installazione',
    installCommand: 'Comando di installazione',
    copyCommand: 'Copia comando',
    viewDocs: 'Guida all’installazione',
    installTo: 'Cartella di installazione',
    retryAfterRun: 'Comando eseguito: riprova',
    setupChoiceTitle: 'Configura Hebri Desktop',
    setupChoiceDesc: 'Collega l’app a un gateway Hebri esistente oppure installa Hebri su questo computer.',
    connectExistingTitle: 'Collega un’istanza Hebri esistente',
    connectExistingShort: 'Collega esistente',
    connectExistingDesc:
      'Usa un servizio remoto con un token di sessione o accedi dal browser. Non verrà avviata alcuna installazione locale.',
    installLocalTitle: 'Installa Hebri sul computer',
    installLocalDesc: 'Scarica Hebri, prepara l’ambiente Python e avvia il servizio su questo computer.',
    localStartUnavailable: 'Impossibile avviare l’installazione locale. Riavvia Hebri Desktop e riprova.',
    remoteSetupTitle: 'Collega un’istanza Hebri esistente',
    remoteSetupDesc:
      'Inserisci l’URL del gateway. Hebri Desktop rileverà se è necessario un token o l’accesso tramite browser.',
    remoteUrlTitle: 'URL del gateway',
    remoteUrlDesc: 'Usa l’URL di base del gateway Hebri, includendo https:// per i collegamenti remoti.',
    probing: 'Rilevamento dell’autenticazione del gateway…',
    probeErrorDetails: 'Dettagli',
    authTitle: 'Autenticazione',
    authSignedIn: 'Accesso tramite browser completato.',
    signIn: 'Accedi',
    enterUrlFirst: 'Inserisci prima l’URL del gateway.',
    signInIncomplete: 'La finestra di accesso è stata chiusa prima del completamento dell’autenticazione.',
    tokenTitle: 'Token di sessione',
    tokenDesc: 'Incolla il token di sessione del file .env del gateway remoto.',
    pasteSessionToken: 'Incolla token di sessione',
    incompleteSignInTest: 'Accedi prima di verificare questo gateway protetto da OAuth.',
    incompleteTokenTest: 'Inserisci un token di sessione prima di verificare il gateway.',
    testConnection: 'Verifica connessione',
    applyRemote: 'Applica e ricollega',
    backToSetup: 'Indietro',
    failedTitle: 'Installazione non riuscita',
    settingUpTitle: 'Installazione di Hebri Agent',
    finishingTitle: 'Completamento',
    activeDesc:
      'Questa configurazione è necessaria solo la prima volta. Hebri sta scaricando le dipendenze e configurando il computer. I prossimi avvii salteranno questo passaggio.',
    fetchingManifest: 'Recupero delle informazioni di installazione…',
    hideOutput: 'Nascondi dettagli dell’installazione',
    showOutput: 'Mostra dettagli dell’installazione',
    noOutput: 'Nessun messaggio disponibile.',
    cancelling: 'Annullamento…',
    cancelInstall: 'Annulla installazione',
    transcriptSaved: 'Registro completo salvato in',
    copiedOutput: 'Copiato!',
    copyOutput: 'Copia dettagli',
    reloadRetry: 'Ricarica e riprova',
    openLogs: 'Apri registri',
    progress: (completed, total) => `${completed} di ${total} passaggi completati`,
    currentStage: stage => ` — in corso: ${stage}`,
    lines: count => (count === 1 ? '1 riga' : `${count} righe`),
    authNeedsOauth: provider => `Accedi con ${provider} prima di verificare il gateway.`,
    signInWith: provider => `Accedi con ${provider}`,
    testSucceeded: (baseUrl, version) => `Collegato a ${baseUrl}${version ? ` (${version})` : ''}.`
  },
  onboarding: {
    collapse: 'Comprimi',
    connected: 'Collegato',
    reopenVerification: 'Riapri pagina di verifica',
    copy: 'Copia',
    headerTitle: 'Configuriamo Hebri Agent',
    headerDesc: 'Collega un fornitore di modelli per iniziare a chattare. Per molte opzioni basta un clic.',
    starting: 'Avvio di Hebri…',
    lookingUpProviders: 'Ricerca dei fornitori…',
    otherProviders: 'Altri fornitori',
    haveApiKey: 'Ho una chiave API',
    chooseLater: 'Sceglierò un fornitore più tardi',
    recommended: 'Consigliato',
    localModelsTitle: 'Esegui modelli locali',
    localModelsPitch: 'Non serve un account: scarica un modello ed eseguilo su questo computer',
    backToSignIn: 'Torna all’accesso',
    getKey: 'Ottieni una chiave',
    replaceCurrent: 'Sostituisci il valore attuale',
    pasteApiKey: 'Incolla chiave API',
    couldNotSave: 'Impossibile salvare la credenziale.',
    connecting: 'Connessione in corso',
    update: 'Aggiorna',
    signInFailed: 'Accesso non riuscito. Riprova.',
    tryAgain: 'Riprova',
    useApiKeyInstead: 'Usa una chiave API',
    errorDetails: 'Dettagli',
    pickDifferentProvider: 'Scegli un altro fornitore',
    authorizeThere: 'Autorizza Hebri in quella pagina.',
    copyAuthCode: 'Copia il codice di autorizzazione e incollalo qui sotto.',
    pasteAuthCode: 'Incolla codice di autorizzazione',
    reopenAuthPage: 'Riapri pagina di autorizzazione',
    reopenSignInPage: 'Riapri pagina di accesso',
    waitingAuthorize: 'In attesa della tua autorizzazione…',
    signedIn: 'Ho effettuato l’accesso',
    defaultModel: 'Modello predefinito',
    freeTier: 'Piano gratuito',
    free: 'Gratis',
    change: 'Cambia',
    startChatting: 'Inizia',
    signInWith: provider => `Accedi con ${provider}`,
    startingSignIn: provider => `Avvio dell’accesso a ${provider}…`,
    verifyingCode: provider => `Verifica del codice con ${provider}…`,
    connectedProvider: provider => `${provider} collegato`,
    connectedPicking: provider => `${provider} collegato. Scelta del modello predefinito…`,
    openedBrowser: provider => `Abbiamo aperto ${provider} nel browser.`,
    deviceCodeOpened: provider => `Abbiamo aperto ${provider} nel browser. Inserisci questo codice:`,
    autoBrowser: provider =>
      `Abbiamo aperto ${provider} nel browser. Autorizza Hebri: il collegamento avverrà automaticamente, senza copiare o incollare nulla.`,
    docs: provider => `Documentazione di ${provider}`,
    price: (input, output) => `${input} input / ${output} output per milione di token`
  },
  freeTier: {
    done: 'Fatto',
    begin: 'Inizia',
    otherProviders: 'Altri fornitori',
    signIn: 'Accedi',
    defaultModel: 'Modello predefinito',
    change: 'Cambia',
    notNow: 'Non ora',
    tryAgain: 'Riprova',
    setupFailed: {
      tryAgain: 'Riprova'
    }
  },
  modelPicker: {
    localDownloadsHeading: 'Locale',
    title: 'Cambia modello',
    current: 'attuale:',
    unknown: '(sconosciuto)',
    search: 'Cerca fornitori e modelli…',
    noModels: 'Nessun modello trovato.',
    addProvider: 'Aggiungi fornitore',
    loadFailed: 'Impossibile caricare i modelli',
    loadingIntoMemory: 'Caricamento in memoria',
    downloading: 'Download in corso',
    noAuthenticatedProviders: 'Nessun fornitore autenticato.',
    free: 'Gratis',
    freeTier: 'Piano gratuito',
    priceTitle: 'Prezzo di input/output per milione di token',
    wasPrice: 'prima',
    customModel: 'Modello personalizzato',
    addCustomModelAction: 'Aggiungi modello personalizzato…',
    customModelPlaceholder: 'Inserisci l’ID del modello, ad esempio openai/gpt-5'
  },
  modelVisibility: {
    title: 'Modelli',
    search: 'Cerca modelli',
    noAuthenticatedProviders: 'Nessun fornitore autenticato.'
  },
  shell: {
    gatewayMenu: {
      gateway: 'Gateway',
      connected: 'Collegato',
      disconnected: 'Disconnesso',
      connecting: 'Connessione in corso'
    },
    approvalMode: {
      off: 'Disattivato',
      manual: 'Manuale'
    },
    statusbar: {
      unknown: 'sconosciuto',
      gateway: 'Gateway',
      gatewayTitle: 'Gateway',
      resetStatusbar: 'Ripristina valori predefiniti',
      toggleTerminal: 'Terminale',
      toggleWorkspace: 'Spazio di lavoro',
      cron: 'Cron',
      turnRunning: 'In esecuzione',
      contextUsagePanel: {
        categories: {
          memory: 'Memoria',
          skills: 'Competenze'
        }
      },
      modelNone: 'nessuno',
      toggleVersion: 'Versione e aggiornamenti',
      toggleFreeTier: 'Piano gratuito',
      openStarmap: 'Apri il grafo della memoria',
      switchModel: 'Cambia modello'
    },
    modelMenu: {
      search: 'Cerca modelli',
      editModels: 'Modifica modelli…',
      refreshModels: 'Aggiorna modelli'
    }
  },
  rightSidebar: {
    terminal: 'Terminale',
    previewUnavailable: 'Anteprima non disponibile',
    tryAgain: 'Riprova'
  },
  preview: {
    hide: 'Nascondi',
    console: {
      copy: 'Copia',
      clear: 'Cancella'
    },
    web: {
      saveComment: 'Salva',
      tryAgain: 'Riprova',
      goBack: 'Indietro',
      fallbackTitle: 'Anteprima'
    },
    tab: 'Anteprima',
    unavailable: 'Anteprima non disponibile',
    openInBrowser: 'Apri nel browser',
    edit: 'Modifica'
  },
  zones: {
    templatePriority: 'Priorità'
  },
  contextMenu: {
    image: {
      copyImage: 'Copia immagine'
    }
  },
  assistant: {
    thread: {
      copy: 'Copia',
      refresh: 'Aggiorna',
      errorRetry: 'Riprova',
      errorRetryScheduledCancel: 'Annulla',
      errorDetails: 'Dettagli',
      errorOpenLogs: 'Apri registri',
      reviewChanges: 'Revisione',
      stop: 'Interrompi'
    },
    catalogInstall: {
      install: 'Installa',
      failed: 'Non riuscito',
      securityHeading: 'Sicurezza',
      advanced: 'Avanzate',
      skip: 'Salta'
    },
    mcpSetup: {
      installAction: 'Installa',
      enableAction: 'Abilita'
    },
    tool: {
      copyCode: 'Copia codice',
      statusRunning: 'In esecuzione',
      statusError: 'Errore',
      statusDone: 'Fatto',
      actions: {
        running: 'In esecuzione'
      },
      prefixes: {
        browser: 'Browser'
      },
      titles: {
        terminal: {
          pendingAction: 'In esecuzione'
        }
      },
      copyOutput: 'Copia dettagli',
      copyCommand: 'Copia comando',
      copyPath: 'Copia percorso'
    },
    approval: {
      reconnect: 'Ricollega',
      run: 'Esegui'
    },
    clarify: {
      skip: 'Salta',
      skipped: 'Saltato',
      continueLabel: 'Continua'
    }
  },
  desktop: {
    resumeRetry: 'Riprova',
    archived: 'Archiviate'
  },
  ui: {
    pagination: {
      next: 'Prossima'
    },
    search: {
      clear: 'Cancella ricerca'
    }
  },
  interfaceMode: {
    advanced: {
      label: 'Avanzate'
    }
  },
  prompts: {
    reconnect: 'Ricollega',
    vaultCodeSkip: 'Salta'
  },
  tips: {
    items: {
      'local-runtime-update': {
        action: 'Aggiorna ora'
      }
    }
  },
  errors: {
    boundaryDetails: 'Dettagli',
    openLogs: 'Apri registri'
  }
} satisfies TranslationOverrides

export const italianOverrides = italianSupplements.reduce<TranslationOverrides>(
  (catalog, overrides) => mergeTranslations<TranslationOverrides>(catalog, overrides),
  itBase
)

export const it = defineLocale(italianOverrides)
