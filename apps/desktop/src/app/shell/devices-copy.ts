import type { Locale } from '@/i18n'

const en = {
  settingsTitle: 'Hebri devices',
  settingsDescription:
    'Connect your computers so their agents can ask an approved local model for help. Both Hebri apps keep their own chats and settings.',
  localRequired: 'Switch this window to Local gateway to manage this computer’s device pairing.',
  loading: 'Loading device settings…',
  lan: 'Same local network',
  vpn: 'Remote over private VPN',
  lanHelp:
    'Keep Hebri open on both computers. Create an invite on the helper computer, share it privately and paste it on the other computer. Compare the code on both before approving.',
  vpnHelp:
    'Use the guided Tailscale setup below on both computers. Already have a private VPN? Enter its IPv4 address in the pairing form. Remote devices pair by invite and do not appear in Nearby.',
  vpnSetup: 'Set up a remote connection',
  vpnInstall: '1. Install Tailscale on both computers',
  vpnInstallHelp:
    'Tailscale creates the private connection. Download it from the official site and approve the operating-system prompts.',
  vpnDownload: 'Get Tailscale',
  vpnSignIn: '2. Sign in to Tailscale on both computers',
  vpnSignInHelp:
    'For your own computers, use the same Tailscale account. For a teammate, use your shared Tailscale network; never share passwords. This account is separate from Synapsek.',
  vpnInstructions: 'Installation and sign-in guide',
  vpnCheckTitle: '3. Check this computer',
  vpnCheck: 'Check Tailscale connection',
  vpnChecking: 'Checking connection…',
  vpnNotInstalled:
    'Tailscale could not be found in a standard install location. Install it, then check again. Custom installs can use the address field below.',
  vpnNeedsLogin:
    'Open Tailscale and finish signing in. Your network administrator may also need to approve this computer.',
  vpnStopped: 'Tailscale is paused. Open Tailscale, connect, then check again.',
  vpnUnavailable:
    'Could not confirm the Tailscale connection. Make sure Tailscale is running and signed in, then retry. You can also enter a known VPN address below.',
  vpnReady: 'Tailscale is connected. This computer’s VPN address is filled in below:',
  vpnPair: '4. Enable Hebri sharing and pair',
  vpnPairHelp:
    'Enable device sharing below. On the helper computer, create an invite and send it privately to the other computer. Paste it there, compare the code on both screens and approve the access you want.',
  vpnPrivacy:
    'Tailscale connects computers, not just Hebri. Review its network access settings before adding teammates. Hebri still requires its own pairing approval. Pause sharing or revoke a paired device here to stop Hebri assistance.',
  vpnAccessGuide: 'Tailscale access settings',
  addressHelp:
    'Use an address reachable from the other computer: 10.x, 172.16–31.x, 192.168.x or 100.64–127.x. Allow peer connections only on your trusted LAN or VPN.',
  ready: 'Ready',
  notReady: 'Local model runtime is not ready',
  active: 'Active tasks',
  outgoing: 'Sent tasks',
  title: 'Devices',
  enable: 'Enable device sharing',
  pause: 'Pause sharing',
  save: 'Save',
  name: 'Device name',
  models: 'Permitted local model IDs (comma separated)',
  catalog: 'Show local models',
  nearby: 'Nearby (not trusted)',
  privacy:
    'Pair only computers you trust. Assistance sends only the task you provide to an approved local model. Private chats, files, tools and credentials are not shared.',
  address: 'This computer’s LAN or VPN IPv4 address',
  invite: 'Create five-minute invite',
  join: 'Request pairing',
  paste: 'Paste the other computer’s invite',
  verify: 'Compare this code on both computers before approving:',
  approve: 'Approve assistance',
  metadata: 'Approve status only',
  finish: 'Check approval',
  revoke: 'Revoke',
  refresh: 'Refresh status',
  ask: 'Ask device',
  goal: 'Task to share',
  model: 'Model ID',
  cancel: 'Cancel task',
  result: 'Check result',
  disabled: 'Sharing is off',
  unavailable: 'Device operation failed. Check the connection and permissions.',
  outdated:
    'This backend does not support Hebri devices yet. Quit Hebri completely and reopen it to finish the backend update. If this persists, use Repair install.',
  locked: 'Secure OS credential storage is required. Unlock your keyring and restart Hebri.',
  tools: 'To let agents ask for help, enable the Devices toolset in Capabilities and start a new chat.',
  multicast: 'LAN discovery is unavailable. You can still pair using an invite.',
  copied: 'Copy invite',
  pending: 'Pairing requests',
  peers: 'Paired devices',
  jobs: 'Incoming tasks',
  check: 'Check',
  running: 'Sharing on'
}

const it: typeof en = {
  settingsTitle: 'Dispositivi Hebri',
  settingsDescription:
    'Collega i tuoi computer per consentire agli agenti di chiedere aiuto a un modello locale approvato. Ogni app Hebri mantiene le proprie chat e impostazioni.',
  localRequired: 'Passa questa finestra al gateway locale per gestire l’associazione di questo computer.',
  loading: 'Caricamento impostazioni dispositivi…',
  lan: 'Stessa rete locale',
  vpn: 'Remoto tramite VPN privata',
  lanHelp:
    'Lascia Hebri aperto su entrambi i computer. Crea un invito sul computer che offre assistenza, condividilo privatamente e incollalo sull’altro. Confronta il codice su entrambi prima di approvare.',
  vpnHelp:
    'Segui la configurazione guidata di Tailscale su entrambi i computer. Hai già una VPN privata? Inserisci il suo indirizzo IPv4 nel modulo di associazione. I dispositivi remoti si associano tramite invito e non appaiono nelle vicinanze.',
  vpnSetup: 'Configura una connessione remota',
  vpnInstall: '1. Installa Tailscale su entrambi i computer',
  vpnInstallHelp:
    'Tailscale crea la connessione privata. Scaricalo dal sito ufficiale e approva le richieste del sistema operativo.',
  vpnDownload: 'Scarica Tailscale',
  vpnSignIn: '2. Accedi a Tailscale su entrambi i computer',
  vpnSignInHelp:
    'Per i tuoi computer, usa lo stesso account Tailscale. Per un collega, usa la rete Tailscale condivisa; non condividere mai le password. Questo account è separato da Synapsek.',
  vpnInstructions: 'Guida all’installazione e all’accesso',
  vpnCheckTitle: '3. Verifica questo computer',
  vpnCheck: 'Verifica connessione Tailscale',
  vpnChecking: 'Verifica connessione…',
  vpnNotInstalled:
    'Tailscale non è stato trovato nei percorsi standard. Installalo e riprova. Per installazioni personalizzate puoi usare il campo indirizzo qui sotto.',
  vpnNeedsLogin:
    'Apri Tailscale e completa l’accesso. Potrebbe essere necessaria anche l’approvazione dell’amministratore della rete.',
  vpnStopped: 'Tailscale è in pausa. Apri Tailscale, connettiti e riprova.',
  vpnUnavailable:
    'Impossibile confermare la connessione Tailscale. Verifica che Tailscale sia avviato e connesso, poi riprova. Puoi anche inserire sotto un indirizzo VPN noto.',
  vpnReady: 'Tailscale è connesso. L’indirizzo VPN di questo computer è stato inserito qui sotto:',
  vpnPair: '4. Abilita la condivisione Hebri e associa i dispositivi',
  vpnPairHelp:
    'Abilita la condivisione qui sotto. Sul computer che offre assistenza, crea un invito e invialo privatamente all’altro computer. Incollalo lì, confronta il codice su entrambi gli schermi e approva l’accesso desiderato.',
  vpnPrivacy:
    'Tailscale collega i computer, non solo Hebri. Controlla le impostazioni di accesso alla rete prima di aggiungere colleghi. Hebri richiede comunque la propria approvazione. Metti in pausa la condivisione o revoca un dispositivo per interrompere l’assistenza Hebri.',
  vpnAccessGuide: 'Impostazioni di accesso Tailscale',
  addressHelp:
    'Usa un indirizzo raggiungibile dall’altro computer: 10.x, 172.16–31.x, 192.168.x o 100.64–127.x. Consenti le connessioni tra dispositivi solo sulla LAN o VPN fidata.',
  ready: 'Pronto',
  notReady: 'Il runtime del modello locale non è pronto',
  active: 'Compiti attivi',
  outgoing: 'Compiti inviati',
  title: 'Dispositivi',
  enable: 'Abilita condivisione dispositivo',
  pause: 'Sospendi condivisione',
  save: 'Salva',
  name: 'Nome dispositivo',
  models: 'ID dei modelli locali consentiti (separati da virgole)',
  catalog: 'Mostra modelli locali',
  nearby: 'Nelle vicinanze (non attendibili)',
  privacy:
    'Associa solo computer fidati. L’assistenza invia soltanto il compito fornito a un modello locale approvato. Chat private, file, strumenti e credenziali non vengono condivisi.',
  address: 'Indirizzo IPv4 LAN o VPN di questo computer',
  invite: 'Crea invito valido cinque minuti',
  join: 'Richiedi associazione',
  paste: 'Incolla l’invito dell’altro computer',
  verify: 'Confronta questo codice su entrambi i computer prima di approvare:',
  approve: 'Approva assistenza',
  metadata: 'Approva solo stato',
  finish: 'Verifica approvazione',
  revoke: 'Revoca',
  refresh: 'Aggiorna stato',
  ask: 'Chiedi al dispositivo',
  goal: 'Compito da condividere',
  model: 'ID modello',
  cancel: 'Annulla compito',
  result: 'Verifica risultato',
  disabled: 'Condivisione disattivata',
  unavailable: 'Operazione non riuscita. Controlla connessione e permessi.',
  outdated:
    'Questo backend non supporta ancora i dispositivi Hebri. Chiudi completamente Hebri e riaprilo per completare l’aggiornamento del backend. Se il problema persiste, usa Ripara installazione.',
  locked: 'È necessario l’archivio credenziali sicuro del sistema. Sblocca il portachiavi e riavvia Hebri.',
  tools:
    'Per consentire agli agenti di chiedere aiuto, abilita gli strumenti Dispositivi in Funzionalità e avvia una nuova chat.',
  multicast: 'Rilevamento LAN non disponibile. Puoi comunque associare i dispositivi tramite invito.',
  copied: 'Copia invito',
  pending: 'Richieste di associazione',
  peers: 'Dispositivi associati',
  jobs: 'Compiti in arrivo',
  check: 'Verifica',
  running: 'Condivisione attiva'
}

// The feature is a preview. Keep the complete English fallback explicit for locales
// awaiting review, rather than mixing untranslated labels into existing dictionaries.
export const devicesCopy: Record<Locale, typeof en> = {
  en,
  it,
  de: en,
  es: en,
  fr: en,
  ru: en,
  ja: en,
  zh: en,
  'zh-hant': en,
  ar: en
}
