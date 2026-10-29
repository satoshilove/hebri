import type { TranslationOverrides } from './define-locale'

export const itCommandCenter = {
  commandCenter: {
    close: 'Chiudi il centro di comando',
    paletteTitle: 'Tavolozza dei comandi',
    goTo: 'Vai a',
    goToSession: 'Vai alla sessione',
    branches: 'Rami',
    openFolder: 'Apri cartella come progetto…',
    openFolderAt: path => `Apri cartella come progetto — ${path}`,
    newSessionInProject: project => `Nuova sessione in ${project}`,
    commands: 'Comandi',
    startInBranch: branch => `Nuova conversazione in ${branch}`,
    commandCenter: 'Centro di comando',
    changeTheme: 'Cambia tema',
    changeColorMode: 'Cambia modalità colore…',
    pets: {
      title: 'Hebits',
      loading: 'Caricamento della galleria Petdex…',
      error: 'Impossibile raggiungere la galleria Petdex.',
      staleBackend: 'Riavvia Hebri per usare gli Hebits: il backend non supporta ancora questa funzione.',
      empty: 'Nessun Hebit corrispondente.',
      turnOff: 'Disattiva',
      turnOn: 'Attiva',
      installed: 'Installato',
      adoptFailed: 'Impossibile adottare questo Hebit.',
      toggleFailed: enabled => `Impossibile ${enabled ? 'attivare' : 'disattivare'} l’Hebit.`,
      noneAvailable: 'Nessun Hebit disponibile: scegline uno qui sotto per installarlo.'
    },
    generatePet: {
      title: 'Genera un Hebit',
      placeholder: 'Descrivi un Hebit da generare…',
      promptHint: 'Scrivi una descrizione e premi Invio per creare quattro proposte.',
      readyHint: 'Premi Invio per creare quattro proposte dalla tua descrizione.',
      generate: 'Genera',
      generating: 'Generazione…',
      hatch: 'Fai nascere',
      spawning: 'Creazione…',
      hatching: 'Il tuo Hebit sta nascendo…',
      hatchingSub: 'Prende vita…',
      hatched: 'È nato!',
      hatchRow: (_state, done, total) => `Disegno del fotogramma ${done} di ${total}…`,
      hatchComposing: 'Composizione delle parti…',
      staleBackend: 'Aggiorna Hebri per generare Hebits.',
      backgroundHint: 'Puoi chiudere questa finestra: Hebri ti avviserà quando avrà finito.',
      slowProviderHint: 'Potrebbero essere necessari diversi minuti',
      remix: 'Crea una variante',
      remixConfirmTitle: 'Creare una variante di questo aspetto?',
      remixConfirmBody:
        'Verrà generata una nuova serie di proposte partendo da questa. Potrebbero essere necessari diversi minuti.',
      genericError: 'Generazione non riuscita: riprova o scegli un suggerimento.',
      referenceImageTooLarge: 'L’immagine di riferimento è troppo grande. Usane una inferiore a 16 MB.',
      referenceImageInvalid: 'Impossibile leggere l’immagine di riferimento. Prova con PNG, JPG, WebP o GIF.',
      adopt: 'Adotta',
      startOver: 'Ricomincia'
    },
    installTheme: {
      title: 'Installa tema…',
      pageTitle: 'Installa tema',
      placeholder: 'Cerca nel Marketplace di VS Code…',
      loading: 'Ricerca nel Marketplace…',
      error: 'Impossibile raggiungere il Marketplace.',
      empty: 'Nessun tema corrispondente.',
      installing: 'Installazione…',
      installed: 'Installato',
      installs: count => `${count} installazioni`
    },
    settingsFields: 'Campi delle impostazioni',
    mcpServers: 'Server MCP',
    archivedChats: 'Chat archiviate',
    sections: {
      maintenance: 'Manutenzione',
      usage: 'Utilizzo'
    },
    sectionDescriptions: {
      maintenance: 'Diagnostica, backup, gestione delle competenze e dati della memoria',
      sessions: 'Cerca e gestisci le sessioni',
      system: 'Stato, registri e operazioni di sistema',
      usage: 'Token, costi e utilizzo delle competenze nel tempo'
    },
    nav: {
      newChat: {
        detail: 'Avvia una nuova sessione'
      },
      settings: {
        detail: 'Configura Hebri desktop'
      },
      capabilities: {
        detail: 'Competenze, strumenti, server MCP e plugin'
      },
      messaging: {
        detail: 'Configura Telegram, Slack, Discord e altro'
      },
      artifacts: {
        detail: 'Sfoglia i risultati generati'
      }
    },
    sectionEntries: {
      sessions: {
        title: 'Pannello delle sessioni',
        detail: 'Cerca, fissa e gestisci le sessioni'
      },
      system: {
        title: 'Pannello di sistema',
        detail: 'Stato del gateway, registri, riavvio e aggiornamento'
      },
      usage: {
        title: 'Pannello di utilizzo',
        detail: 'Token, costi e utilizzo delle competenze'
      }
    },
    providerNavigate: 'Naviga',
    refreshing: 'Aggiornamento…',
    noResults: 'Nessun risultato corrispondente.',
    pinSession: 'Fissa sessione',
    unpinSession: 'Rimuovi sessione dai preferiti',
    exportSession: 'Esporta sessione',
    noSessions: 'Ancora nessuna sessione.',
    gatewayRunning: 'Gateway di messaggistica in esecuzione',
    gatewayStopped: 'Gateway di messaggistica arrestato',
    hermesActiveSessions: (version, count) => `Backend Hebri ${version} · Sessioni attive ${count}`,
    restartGateway: 'Riavvia gateway',
    openBrowser: 'Apri browser',
    gatewayRestartFailed: 'Riavvio del gateway non riuscito.',
    sharedGatewayRestartTitle: 'Riavviare il gateway condiviso?',
    sharedGatewayRestartDescription: bots => `Tutti i Bits su questo dispositivo si riconnetteranno: ${bots}`,
    sharedGatewayRestartConfirm: 'Riavvia tutti',
    sharedGatewayRestarted: count => `Gateway condiviso riavviato (${count} ${count === 1 ? 'Bit' : 'Bits'})`,
    reloadWindow: 'Ricarica finestra',
    actionRunning: 'in esecuzione',
    actionDone: 'completata',
    actionFailed: 'non riuscita',
    actionStartedWaiting: 'Operazione avviata, in attesa dello stato…',
    loadingStatus: 'Caricamento dello stato…',
    recentLogs: 'Registri recenti',
    noLogs: 'Ancora nessun registro caricato.',
    days: count => `${count} g`,
    statTokens: 'Token in entrata/uscita',
    statCost: 'Costo stimato',
    actualCost: cost => `effettivo ${cost}`,
    loadingUsage: 'Caricamento dei dati di utilizzo…',
    noUsage: period => `Nessun utilizzo negli ultimi ${period} giorni.`,
    dailyTokens: 'Token giornalieri',
    input: 'entrata',
    output: 'uscita',
    noDailyActivity: 'Nessuna attività giornaliera.',
    topModels: 'Modelli più usati',
    noModelUsage: 'Ancora nessun modello utilizzato.',
    topSkills: 'Competenze più usate',
    noSkillActivity: 'Ancora nessuna competenza utilizzata.',
    actions: count => `${count} operazioni`,
    logFile: 'File di registro',
    logSearchPlaceholder: 'Filtra le righe del registro…',
    maintenance: {
      doctor: 'Esegui diagnostica',
      doctorDesc: 'Controlla installazione, configurazione e fornitori',
      securityAudit: 'Controllo di sicurezza',
      securityAuditDesc: 'Analizza configurazione e competenze per individuare impostazioni rischiose',
      backup: 'Crea backup',
      backupDesc: 'Comprimi configurazione, ricordi, competenze e sessioni in un file ZIP',
      debugShare: 'Condividi dati diagnostici',
      debugShareDesc:
        'Carica un rapporto con i dati sensibili oscurati e i registri, ottenendo link condivisibili (eliminazione automatica dopo 6 ore)',
      debugShareRunning: 'Caricamento del rapporto diagnostico…',
      debugShareLinks: 'Link di condivisione',
      debugShareFailed: 'Condivisione dei dati diagnostici non riuscita',
      copyLink: 'Copia link',
      linkCopied: 'Link copiato',
      curator: 'Gestore delle competenze',
      curatorDesc: 'Revisione in background che archivia le competenze obsolete create dall’agente',
      curatorPaused: 'In pausa',
      curatorActive: 'Attivo',
      curatorDisabled: 'Disattivato',
      curatorLastRun: when => `Ultima esecuzione ${when}`,
      curatorNeverRan: 'Mai eseguito',
      runNow: 'Esegui ora',
      memoryData: 'Dati della memoria',
      memoryDataDesc: 'File di memoria integrati inclusi in ogni sessione',
      memoryProvider: name => `Fornitore attivo: ${name}`,
      builtinMemory: 'integrata',
      memoryFile: 'Memoria dell’agente (MEMORY.md)',
      userFile: 'Profilo utente (USER.md)',
      bytes: size => size,
      empty: 'vuoto',
      resetMemory: 'Azzera memoria',
      resetUser: 'Azzera profilo',
      resetAll: 'Azzera entrambi',
      resetConfirm: target => `Eliminare ${target}? Questa operazione non può essere annullata.`,
      resetDone: files => `Eliminati: ${files}.`,
      resetFailed: 'Azzeramento della memoria non riuscito',
      actionStarted: name => `${name} avviato: visualizzazione del registro…`,
      actionFailed: name => `Impossibile avviare ${name}`,
      running: 'In esecuzione…',
      viewLog: 'Registro delle operazioni'
    }
  }
} satisfies TranslationOverrides
