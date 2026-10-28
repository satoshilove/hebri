import type { TranslationOverrides } from './define-locale'

export const itMessaging = {
  messaging: {
    search: 'Cerca nella messaggistica…',
    ownershipIntro:
      'Collega app di messaggistica esterne a questo gateway Synapsek Hebri. Le credenziali delle piattaforme e le approvazioni di associazione appartengono al profilo Hebri selezionato e sono separate dalle conversazioni del team e dai compagni.',
    loading: 'Caricamento delle piattaforme di messaggistica…',
    loadFailed: 'Impossibile caricare le piattaforme di messaggistica',
    states: {
      disabled: 'Disattivato',
      gateway_stopped: 'Gateway di messaggistica arrestato',
      not_configured: 'Configurazione necessaria',
      pending_restart: 'Riavvio necessario',
      retrying: 'Nuovo tentativo',
      startup_failed: 'Avvio non riuscito'
    },
    unknown: 'Sconosciuto',
    hintPendingRestart: 'Riavvia il gateway dalla barra di stato per applicare la modifica.',
    sharedListenerUrl: 'Disponibile sull’indirizzo di ascolto del gateway condiviso:',
    hintGatewayStopped: 'Avvia il gateway dalla barra di stato per connetterti.',
    credentialsSet: 'Credenziali impostate',
    needsSetup: 'Configurazione necessaria',
    gatewayStopped: 'Gateway di messaggistica arrestato',
    getCredentials: 'Ottieni le tue credenziali',
    openSetupGuide: 'Apri la guida alla configurazione',
    advanced: count => `Avanzate (${count})`,
    noTokenNeeded:
      'Questa piattaforma non richiede un token qui. Segui la guida alla configurazione qui sopra, poi attivala qui sotto.',
    enabled: 'Attivato',
    disabled: 'Disattivato',
    unsavedChanges: 'Modifiche non salvate',
    saveChanges: 'Salva modifiche',
    saved: 'Salvato',
    openDocs: 'Apri documentazione',
    clearField: key => `Cancella ${key}`,
    enableAria: name => `Attiva ${name}`,
    disableAria: name => `Disattiva ${name}`,
    platformEnabled: name => `${name} attivato`,
    platformDisabled: name => `${name} disattivato`,
    restartToApply: 'Questa modifica ha effetto dopo il riavvio del gateway.',
    setupSaved: name => `Configurazione di ${name} salvata`,
    restartToReconnect: 'Le nuove credenziali hanno effetto dopo il riavvio del gateway.',
    appliedLive: 'Applicato al gateway in esecuzione.',
    connectingLive: 'Il gateway in esecuzione si sta collegando con le nuove credenziali.',
    keyCleared: key => `${key} cancellata`,
    setupUpdated: name => `La configurazione di ${name} è stata aggiornata.`,
    failedUpdate: name => `Impossibile aggiornare ${name}`,
    failedSave: name => `Impossibile salvare ${name}`,
    failedClear: key => `Impossibile cancellare ${key}`,
    pendingRequests: count => `Richieste in attesa (${count})`,
    pendingAria: count =>
      `${count} richiest${count === 1 ? 'a di associazione in attesa' : 'e di associazione in attesa'}`,
    approvedUsers: count => `Utenti approvati (${count})`,
    approve: 'Approva',
    approving: 'Approvazione…',
    revoke: 'Revoca',
    revoking: 'Revoca…',
    revokeAria: name => `Revoca l’accesso a ${name}`,
    revokeTitle: 'Revoca accesso',
    revokeDesc: (name: string) => `${name} perderà l’accesso e non verrà più riconosciuto dal prossimo messaggio.`,
    approvedUser: name => `${name} approvato`,
    approvedHint: 'L’utente verrà riconosciuto automaticamente dal prossimo messaggio.',
    revokedUser: name => `Accesso di ${name} revocato`,
    failedApprove: name => `Impossibile approvare ${name}`,
    failedRevoke: name => `Impossibile revocare l’accesso a ${name}`,
    pairingLockedOut:
      'Troppi tentativi di approvazione non riusciti: questa piattaforma è bloccata. Riprova più tardi.',
    waitingSince: minutes => (minutes < 1 ? 'adesso' : `${minutes} min fa`),
    restartNeeded: 'Salvato. Riavvia il gateway di messaggistica per applicare le nuove impostazioni.',
    restartNow: 'Riavvia ora',
    restarting: 'Riavvio…',
    restartFailedManual: 'Hebri non è riuscito a riavviarsi per applicare le impostazioni di messaggistica',
    restartFailedManualDetail:
      'Prova di nuovo a riavviare; se il problema persiste, apri i registri e invia i dati diagnostici.',
    restartAgain: 'Riavvia di nuovo',
    telegramQr: {
      title: 'Scegli come collegare il tuo bot Telegram',
      subtitle:
        'Entrambe le opzioni collegano un bot sotto il tuo controllo e salvano le credenziali solo in questa installazione di Hebri.',
      quickSetup: 'Configurazione rapida',
      quickHelp:
        'Scansiona un codice QR e conferma in Telegram. Hebri crea il bot e rileva automaticamente il tuo ID utente Telegram.',
      createWithQr: 'Crea con QR',
      starting: 'Avvio…',
      replaceWarning:
        'Le credenziali Telegram sono già configurate. Una nuova configurazione QR o un nuovo token sostituiranno il bot attuale al salvataggio.',
      scanHint: 'Scansiona con l’app Telegram sul telefono oppure apri il link su questo computer.',
      waiting: 'In attesa di Telegram…',
      expiresIn: remaining => `Scade tra ${remaining}`,
      openTelegram: 'Apri Telegram',
      ready: 'Bot creato',
      allowedUsers: 'Utenti autorizzati',
      ownerDetected: 'Proprietario rilevato',
      addAtLeastOne: 'Aggiungi almeno un ID utente Telegram.',
      userIdPlaceholder: 'ID utente Telegram',
      numericOnly: 'Gli ID utente Telegram autorizzati devono essere numerici.',
      saveAndRestart: 'Salva e riavvia',
      pairingExpired: 'L’associazione Telegram è scaduta. Avvia una nuova configurazione QR per riprovare.',
      stillWaiting: detail => `Ancora in attesa di Telegram. Nuovo tentativo dopo: ${detail}`,
      savedRestarting: 'Telegram salvato; riavvio del gateway…',
      savedRestartFailed: detail => `Telegram salvato; riavvio del gateway non riuscito${detail}`
    },
    fieldCopy: {
      TELEGRAM_BOT_TOKEN: {
        label: 'Token del bot',
        help: 'Crea un bot con @BotFather, poi incolla il token ricevuto.',
        placeholder: 'Incolla il token del bot Telegram'
      },
      TELEGRAM_ALLOWED_USERS: {
        label: 'ID degli utenti Telegram autorizzati',
        help: 'Consigliato. ID numerici ottenuti da @userinfobot, separati da virgole. Senza questa impostazione, chiunque può scrivere al bot in privato.'
      },
      TELEGRAM_PROXY: {
        label: 'URL del proxy',
        help: 'Necessario solo sulle reti in cui Telegram è bloccato.'
      },
      DISCORD_BOT_TOKEN: {
        label: 'Token del bot',
        help: 'Crea un’applicazione nel portale sviluppatori di Discord, aggiungi un bot, poi incollane il token.'
      },
      DISCORD_ALLOWED_USERS: {
        label: 'ID degli utenti Discord autorizzati',
        help: 'Consigliato. ID utente Discord separati da virgole.'
      },
      DISCORD_REPLY_TO_MODE: {
        label: 'Stile delle risposte',
        help: 'first (prima), all (tutte) oppure off (disattivato).'
      },
      DISCORD_ALLOW_ALL_USERS: {
        label: 'Consenti tutti gli utenti Discord',
        help: 'Solo per lo sviluppo. Se true, chiunque può scrivere al bot in privato senza un elenco di utenti autorizzati.'
      },
      DISCORD_HOME_CHANNEL: {
        label: 'ID del canale principale',
        help: 'Canale in cui il bot invia messaggi proattivi, come risultati delle attività pianificate e promemoria.'
      },
      DISCORD_HOME_CHANNEL_NAME: {
        label: 'Nome del canale principale',
        help: 'Nome visualizzato del canale principale nei registri e nei messaggi di stato.'
      },
      BLUEBUBBLES_ALLOW_ALL_USERS: {
        label: 'Consenti tutti gli utenti iMessage',
        help: 'Se true, ignora l’elenco degli utenti autorizzati di BlueBubbles.'
      },
      MATTERMOST_ALLOW_ALL_USERS: {
        label: 'Consenti tutti gli utenti Mattermost'
      },
      MATTERMOST_HOME_CHANNEL: {
        label: 'Canale principale'
      },
      QQ_ALLOW_ALL_USERS: {
        label: 'Consenti tutti gli utenti QQ'
      },
      QQBOT_HOME_CHANNEL: {
        label: 'Canale principale QQ',
        help: 'Canale o gruppo predefinito per l’invio dei risultati delle attività pianificate.'
      },
      QQBOT_HOME_CHANNEL_NAME: {
        label: 'Nome del canale principale QQ'
      },
      SLACK_BOT_TOKEN: {
        label: 'Token del bot Slack',
        help: 'Usa il token del bot presente in «OAuth & Permissions» dopo aver installato l’app Slack.',
        placeholder: 'Incolla il token del bot Slack'
      },
      SLACK_APP_TOKEN: {
        label: 'Token dell’app Slack',
        help: 'Usa il token a livello di app richiesto dalla modalità Socket.',
        placeholder: 'Incolla il token dell’app Slack'
      },
      SLACK_ALLOWED_USERS: {
        label: 'ID degli utenti Slack autorizzati',
        help: 'Consigliato. ID utente Slack separati da virgole.'
      },
      MATTERMOST_URL: {
        label: 'URL del server',
        placeholder: 'https://mattermost.example.com'
      },
      MATTERMOST_TOKEN: {
        label: 'Token del bot'
      },
      MATTERMOST_ALLOWED_USERS: {
        label: 'ID degli utenti autorizzati',
        help: 'Consigliato. ID utente Mattermost separati da virgole.'
      },
      MATRIX_HOMESERVER: {
        label: 'URL del server principale',
        placeholder: 'https://matrix.org'
      },
      MATRIX_ACCESS_TOKEN: {
        label: 'Token di accesso'
      },
      MATRIX_USER_ID: {
        label: 'ID utente del bot',
        placeholder: '@hermes:example.org'
      },
      MATRIX_ALLOWED_USERS: {
        label: 'ID degli utenti Matrix autorizzati',
        help: 'Consigliato. ID utente nel formato @utente:server, separati da virgole.'
      },
      SIGNAL_HTTP_URL: {
        label: 'URL del bridge Signal',
        placeholder: 'http://127.0.0.1:8080',
        help: 'URL di un bridge REST signal-cli in esecuzione.'
      },
      SIGNAL_ACCOUNT: {
        label: 'Numero di telefono',
        help: 'Il numero registrato nel bridge signal-cli.'
      },
      SIGNAL_ALLOWED_USERS: {
        label: 'Utenti Signal autorizzati',
        help: 'Consigliato. Identificativi Signal separati da virgole.'
      },
      WHATSAPP_ENABLED: {
        label: 'Attiva il bridge WhatsApp',
        help: 'Impostato automaticamente dall’interruttore qui sotto. Modificalo solo se sai che è necessario.'
      },
      WHATSAPP_MODE: {
        label: 'Modalità del bridge'
      },
      WHATSAPP_ALLOWED_USERS: {
        label: 'Utenti WhatsApp autorizzati',
        help: 'Consigliato. Numeri di telefono o ID WhatsApp separati da virgole.'
      }
    }
  }
} satisfies TranslationOverrides
