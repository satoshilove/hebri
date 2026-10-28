import type { builtinMetadataEn } from './builtin-metadata-en'

export const builtinMetadataIt: typeof builtinMetadataEn = {
  Minimal: 'Minimo',
  Low: 'Basso',
  Medium: 'Medio',
  High: 'Alto',
  Max: 'Massimo',
  'API key': 'Chiave API',
  'Authenticate with Honcho Cloud. Not needed for a self-hosted base URL.':
    'Autenticazione con Honcho Cloud. Non serve se usi un URL di base su un server gestito da te.',
  'Enter Honcho API key': 'Inserisci la chiave API di Honcho',
  Connection: 'Connessione',
  'Base URL': 'URL di base',
  'Self-hosted Honcho URL. Overrides the environment when set.':
    'URL di Honcho su un server gestito da te. Se impostato, ha precedenza sull’ambiente.',
  'https://… (self-hosted)': 'https://… (server proprio)',
  Environment: 'Ambiente',
  'Honcho environment. Ignored when a base URL is set.':
    'Ambiente Honcho. Viene ignorato se è impostato un URL di base.',
  Workspace: 'Area di lavoro',
  'Honcho workspace ID. Defaults to the profile host.':
    'Identificativo dell’area di lavoro Honcho. Per impostazione predefinita usa l’host del profilo.',
  'Peer name': 'Nome dell’utente',
  'Your stable user peer. Unifies memory across platforms for single-user setups.':
    'Identità stabile dell’utente. Unifica la memoria tra piattaforme nelle configurazioni con un solo utente.',
  'e.g. eri': 'Es. eri',
  Identity: 'Identità',
  'AI peer': 'Identità dell’IA',
  'The AI-side peer name. Defaults to the profile host.':
    'Nome dell’identità sul lato IA. Per impostazione predefinita usa l’host del profilo.',
  'Session strategy': 'Strategia delle sessioni',
  'How conversations map to Honcho sessions.': 'Associazione delle conversazioni alle sessioni Honcho.',
  'Per session: every conversation gets its own Honcho session. Per directory: conversations from the same working directory share one. Per repo: conversations from the same git repo share one. Global: everything shares a single session.':
    'Per sessione: ogni conversazione ha una propria sessione Honcho. Per cartella: le conversazioni della stessa cartella di lavoro condividono una sessione. Per repository: le conversazioni dello stesso repository Git condividono una sessione. Globale: tutte condividono un’unica sessione.',
  Session: 'Sessione',
  'Request timeout': 'Tempo massimo della richiesta',
  'Request timeout in seconds for Honcho HTTP calls. Blank uses the default.':
    'Tempo massimo, in secondi, delle chiamate HTTP a Honcho. Se vuoto, usa il valore predefinito.',
  'Pin user peer': 'Fissa l’identità dell’utente',
  'Pin the user peer to the peer name, ignoring gateway runtime identity. Unifies memory for single-user setups.':
    'Fissa l’identità dell’utente al nome specificato, ignorando quella fornita dal gateway. Unifica la memoria nelle configurazioni con un solo utente.',
  'Runtime peer prefix': 'Prefisso delle identità di esecuzione',
  'Prefix applied to unknown gateway runtime user IDs.':
    'Prefisso applicato agli identificativi utente sconosciuti forniti dal gateway durante l’esecuzione.',
  'e.g. telegram_': 'Es. telegram_',
  'User peer aliases': 'Alias dell’identità utente',
  'Map gateway runtime user IDs to stable Honcho peers.':
    'Associa gli identificativi utente forniti dal gateway a identità Honcho stabili.',
  'Session peer prefix': 'Prefisso dell’identità di sessione',
  'Prefix session peer names with the host.': 'Aggiungi l’host come prefisso ai nomi delle identità di sessione.',
  'Bot DM sessions': 'Sessioni dei messaggi diretti dei bot',
  'Write DMs from other bots into their own Honcho session per sender. Off skips bot-authored turns.':
    'Salva i messaggi diretti degli altri bot in sessioni Honcho separate per mittente. Se disattivato, ignora i turni scritti dai bot.',
  'Session AI peer prefix': 'Prefisso IA delle sessioni',
  'Prefix session names with the AI peer. Keeps sessions disjoint when several AI peers share a workspace.':
    'Aggiungi l’identità dell’IA come prefisso ai nomi delle sessioni. Mantiene separate le sessioni quando più identità IA condividono un’area di lavoro.',
  'Session overrides': 'Personalizzazioni delle sessioni',
  'Explicit session ID overrides keyed by resolver.':
    'Identificativi di sessione espliciti, indicizzati per risolutore.',
  'Save messages': 'Salva i messaggi',
  'Persist conversation messages to Honcho.': 'Salva in modo persistente i messaggi delle conversazioni in Honcho.',
  'Message writing': 'Scrittura dei messaggi',
  'Injection audit log': 'Registro delle aggiunte al contesto',
  "Append what each turn injected, and why, to ~/.honcho/injection.log. The record holds the user's representation verbatim.":
    'Aggiungi a ~/.honcho/injection.log ciò che ogni turno ha inserito nel contesto e il motivo. Il registro conserva integralmente la rappresentazione dell’utente.',
  Recall: 'Richiamo della memoria',
  'Write frequency': 'Frequenza di scrittura',
  'When to flush messages: async, turn, session, or every N turns.':
    'Quando inviare i messaggi: async, turn, session oppure ogni N turni.',
  'async: write in the background as messages arrive. turn: flush after each turn. session: flush when the session ends. A number N flushes every N turns.':
    'async: scrive in background all’arrivo dei messaggi. turn: invia dopo ogni turno. session: invia al termine della sessione. Un numero N invia ogni N turni.',
  'Reasoning level': 'Livello di ragionamento',
  'Reasoning effort for dialectic (peer.chat) calls.':
    'Intensità del ragionamento per le chiamate dialettiche (peer.chat).',
  Dialectic: 'Dialettica',
  'Dynamic reasoning': 'Ragionamento dinamico',
  'Let the model override the reasoning level per call.':
    'Consenti al modello di modificare il livello di ragionamento per ogni chiamata.',
  'Max result chars': 'Caratteri massimi del risultato',
  'Max chars of dialectic result injected into the system prompt.':
    'Numero massimo di caratteri del risultato dialettico aggiunti al prompt di sistema.',
  Depth: 'Profondità',
  'Dialectic passes per cycle (1–3).': 'Passaggi dialettici per ciclo (da 1 a 3).',
  'Per-pass levels': 'Livelli per passaggio',
  'Reasoning level per pass; array length matches depth.':
    'Livello di ragionamento di ogni passaggio; la lunghezza dell’elenco deve corrispondere alla profondità.',
  'Max input chars': 'Caratteri massimi in ingresso',
  'Max chars of query input sent to peer.chat().': 'Numero massimo di caratteri della domanda inviata a peer.chat().',
  'Reasoning heuristic': 'Euristica di ragionamento',
  'Scale the reasoning level up on longer queries.': 'Aumenta il livello di ragionamento per le domande più lunghe.',
  Reasoning: 'Ragionamento',
  'Reasoning level cap': 'Limite del livello di ragionamento',
  'Ceiling for the heuristic-selected reasoning level.':
    'Livello massimo selezionabile dall’euristica di ragionamento.',
  'Recall mode': 'Modalità di richiamo',
  'How memory retrieval works: hybrid, context-only, or tools-only.':
    'Modalità di recupero della memoria: ibrida, solo contesto o solo strumenti.',
  'Hybrid: auto-injected context plus on-demand memory tools. Context only: injection without tools. Tools only: the model queries memory explicitly, nothing is injected.':
    'Ibrida: contesto aggiunto automaticamente e strumenti di memoria su richiesta. Solo contesto: aggiunta al contesto senza strumenti. Solo strumenti: il modello interroga esplicitamente la memoria, senza aggiunte automatiche al contesto.',
  'Current-query recall': 'Richiamo per la domanda corrente',
  'Wait for current-query memory within the request timeout (5 seconds by default). Timeout or busy retrieval omits memory.':
    'Attendi la memoria relativa alla domanda corrente entro il tempo massimo della richiesta (5 secondi per impostazione predefinita). Se il tempo scade o il recupero è occupato, la memoria viene omessa.',
  'Context token cap': 'Limite di token del contesto',
  'Cap on auto-injected context tokens. Blank leaves it uncapped.':
    'Limite dei token di contesto aggiunti automaticamente. Lascia vuoto per non impostare un limite.',
  '(uncapped)': '(senza limite)',
  'Session-start injection': 'Contesto all’avvio della sessione',
  'Pin which base-context sections the first turn injects: summary, peerRepresentation, peerCard, aiRepresentation, aiCard. Blank injects all of them; an empty list injects nothing.':
    'Scegli quali sezioni del contesto di base aggiungere al primo turno: summary, peerRepresentation, peerCard, aiRepresentation, aiCard. Se vuoto, le aggiunge tutte; un elenco vuoto non aggiunge nulla.',
  'Eager init': 'Inizializzazione anticipata',
  'Tools mode only: initialize the Honcho session synchronously at session start instead of on the first tool call. Blocks agent startup until Honcho answers — keep false for Desktop or a local Honcho that may be down; `timeout` caps each call.':
    'Solo in modalità strumenti: inizializza la sessione Honcho in modo sincrono all’avvio della sessione, anziché alla prima chiamata a uno strumento. Blocca l’avvio dell’agente fino alla risposta di Honcho: mantieni false per Desktop o per un Honcho locale che potrebbe non essere attivo. Il valore timeout limita ogni chiamata.',
  'Message max chars': 'Caratteri massimi per messaggio',
  'Max chars per message sent to Honcho.': 'Numero massimo di caratteri per messaggio inviato a Honcho.',
  Limits: 'Limiti',
  'Observation mode': 'Modalità di osservazione',
  'Per-peer observation preset. Directional observes all directions; unified shares one view.':
    'Impostazione di osservazione per identità. Direzionale osserva tutte le direzioni; unificata condivide una sola vista.',
  Observation: 'Osservazione',
  Cloud: 'Cloud',
  Local: 'Locale',
  'Per session': 'Per sessione',
  'Per directory': 'Per cartella',
  'Per repo': 'Per repository',
  Global: 'Globale',
  Hybrid: 'Ibrida',
  'Context only': 'Solo contesto',
  'Tools only': 'Solo strumenti',
  Directional: 'Direzionale',
  Unified: 'Unificata',
  'ByteRover API key (optional, for cloud sync)': 'Chiave API ByteRover (facoltativa, per la sincronizzazione cloud)',
  'Api Key': 'Chiave API',
  'Automatically curate completed turns and compression/memory hooks':
    'Organizza automaticamente i turni completati e le operazioni di compressione e memoria',
  'Auto Extract': 'Estrazione automatica',
  'SQLite database path': 'Percorso del database SQLite',
  'Db Path': 'Percorso del database',
  'Auto-extract facts at session end': 'Estrai automaticamente i fatti al termine della sessione',
  'Default trust score for new facts': 'Punteggio di attendibilità predefinito per i nuovi fatti',
  'Default Trust': 'Attendibilità predefinita',
  'HRR vector dimensions': 'Dimensioni dei vettori HRR',
  'Hrr Dim': 'Dimensione HRR',
  'Honcho API key': 'Chiave API Honcho',
  'Honcho base URL (for self-hosted)': 'URL di base Honcho (per server propri)',
  Baseurl: 'URL di base',
  'Mem0 Platform API key': 'Chiave API della piattaforma Mem0',
  'Self-hosted Mem0 server URL (leave blank for cloud)':
    'URL del server Mem0 gestito da te (lascia vuoto per il cloud)',
  Host: 'Server',
  'User identifier': 'Identificativo dell’utente',
  'User Id': 'ID utente',
  'Agent identifier': 'Identificativo dell’agente',
  'Agent Id': 'ID agente',
  'Enable reranking for recall': 'Abilita il riordinamento per il richiamo della memoria',
  Rerank: 'Riordinamento',
  'RetainDB API key': 'Chiave API RetainDB',
  'API endpoint': 'Endpoint API',
  'Base Url': 'URL di base',
  "Project identifier (optional — uses 'default' project if not set)":
    'Identificativo del progetto (facoltativo: se non impostato, usa il progetto default)',
  Project: 'Progetto',
  'Supermemory API key': 'Chiave API Supermemory',
  'Hebri workstation — signal green and focus blue': 'Postazione Hebri: verde segnale e blu per la concentrazione',
  'GitHub Light Default and Dark Default': 'Temi predefiniti chiaro e scuro di GitHub',
  'GitHub chrome, Nous blue accent': 'Interfaccia GitHub con accenti blu Nous',
  'Soothing pastels — Latte and Mocha': 'Colori pastello riposanti: Latte e Mocha',
  'Warm, low-contrast forest greens': 'Verdi bosco caldi e dal contrasto tenue',
  'Fixed-contrast light and dark': 'Chiaro e scuro a contrasto fisso',
  'Glass neutrals, cream on mission-blue': 'Toni neutri trasparenti e crema su blu intenso',
  'Deep blue-violet with cool accents': 'Blu violaceo profondo con accenti freddi',
  'Warm crimson and bronze — forge vibes': 'Cremisi caldo e bronzo, ispirati alla fucina',
  'Clean grayscale — minimal and focused': 'Scala di grigi essenziale per concentrarsi',
  'Neon green on black — matrix terminal': 'Verde neon su nero, stile terminale Matrix',
  'Cool slate blue — focused developer theme': 'Blu ardesia freddo: un tema per sviluppatori senza distrazioni',
  'Optional third-party model provider; not a Synapsek Hebri service':
    'Fornitore di modelli di terze parti facoltativo, esterno al servizio Synapsek Hebri',
  'OpenAI-compatible direct model API': 'API diretta per modelli compatibile con OpenAI',
  'Aggregator for hundreds of frontier models': 'Aggregatore di centinaia di modelli avanzati',
  'Claude API access (Sonnet, Opus, Haiku)': 'Accesso alle API Claude (Sonnet, Opus, Haiku)',
  'Grok models (use OAuth for SuperGrok / Premium+)': 'Modelli Grok (usa OAuth per SuperGrok o Premium+)',
  'Google AI Studio (Gemini 1.5 / 2.0 / 2.5)': 'Google AI Studio (Gemini 1.5 / 2.0 / 2.5)',
  'Direct DeepSeek API (V3.x, R1)': 'API diretta DeepSeek (V3.x, R1)',
  'Alibaba Cloud DashScope — Qwen and multi-vendor models': 'Alibaba Cloud DashScope: Qwen e modelli di più fornitori',
  'Zhipu GLM-4.6 and Z.AI hosted endpoints': 'Zhipu GLM-4.6 ed endpoint ospitati da Z.AI',
  'Moonshot Kimi K2 / coding endpoints': 'Endpoint Moonshot Kimi K2 e per la programmazione',
  'Moonshot China endpoint': 'Endpoint Moonshot per la Cina',
  'MiniMax-M2 and Hailuo international endpoints': 'Endpoint internazionali MiniMax-M2 e Hailuo',
  'MiniMax mainland China endpoint': 'Endpoint MiniMax per la Cina continentale',
  'Inference Providers — 20+ open models via router.huggingface.co':
    'Fornitori di inferenza: oltre 20 modelli aperti tramite router.huggingface.co',
  'Pay-as-you-go access to curated coding models': 'Accesso a consumo a una selezione di modelli per la programmazione',
  '$10/month subscription for open coding models':
    'Abbonamento da 10 $ al mese per modelli aperti per la programmazione',
  'build.nvidia.com or your own local NIM endpoint': 'build.nvidia.com oppure un tuo endpoint NIM locale',
  'Cloud-hosted open models from ollama.com': 'Modelli aperti ospitati nel cloud da ollama.com',
  'Local LM Studio server (OpenAI-compatible)': 'Server LM Studio locale (compatibile con OpenAI)',
  'StepFun Step Plan coding models': 'Modelli StepFun Step Plan per la programmazione',
  'MiMo-V2.5 and Xiaomi proprietary models': 'MiMo-V2.5 e modelli proprietari Xiaomi',
  'Arcee-hosted small + medium models': 'Modelli piccoli e medi ospitati da Arcee',
  'GMI Cloud GPU + model serving': 'GPU e distribuzione di modelli GMI Cloud',
  'Azure AI Foundry custom endpoints (OpenAI / Anthropic-compatible)':
    'Endpoint personalizzati Azure AI Foundry (compatibili con OpenAI o Anthropic)',
  'Authenticate via AWS profile + region': 'Autenticazione tramite profilo e regione AWS',
  true: 'Sì',
  false: 'No',
  'For talking to Hebri.': 'Per parlare con Hebri.',
  'For developers: terminal, files, diffs.': 'Per sviluppatori: terminale, file e confronto delle modifiche.',
  Basic: 'Base',
  Elite: 'Avanzato',
  'Sidebar left': 'Barra laterale a sinistra',
  'Sidebar right': 'Barra laterale a destra',
  'Terminal deck': 'Pannello terminale',
  'Team Chat': 'Chat del team',
  'Toggle layout edit mode': 'Attiva o disattiva la modifica della disposizione',
  'Reload desktop plugins': 'Ricarica i plugin desktop',
  'Reset layout': 'Ripristina la disposizione',
  'Toggle status bar': 'Mostra o nascondi la barra di stato',
  'Toggle profile rail': 'Mostra o nascondi la barra dei profili',
  'Simple mode': 'Modalità semplice',
  'Toggle tabs': 'Mostra o nascondi le schede',
  'Keyboard shortcuts': 'Scorciatoie da tastiera',
  'Export profile…': 'Esporta profilo…',
  'Import profile…': 'Importa profilo…',
  'Toggle terminal': 'Mostra o nascondi il terminale',
  'Toggle logs': 'Mostra o nascondi i registri',
  'Toggle yolo': 'Attiva o disattiva YOLO',
  'New Bot…': 'Nuovo Bit…',
  'New Computer Mode Bot…': 'Nuovo Bit in modalità computer…',
  'Bits — Hebri agents with their own memory, skills, routines, and chats. Bits can collaborate locally and across paired computers.':
    'Bits: agenti Hebri con memoria, competenze, routine e chat proprie. Possono collaborare localmente e tra computer abbinati.',
  'Multi-agent task board — board page, sidebar entry, and a live in-flight count in the status bar.':
    'Bacheca delle attività per più agenti, con pagina dedicata, voce nella barra laterale e conteggio delle attività in corso nella barra di stato.',
  Default: 'Predefinito',
  Focus: 'Concentrazione',
  Quad: 'Quattro riquadri',
  'Game jam': 'Creare un gioco',
  'A tiny browser game built in a weekend.\n\n- One core mechanic, juicy feedback\n- No build step — single HTML/JS file\n- Playable in under 60 seconds':
    'Un piccolo gioco per il browser da realizzare in un fine settimana.\n\n- Una meccanica principale con risposte coinvolgenti\n- Nessuna compilazione: un solo file HTML/JS\n- Si impara a giocare in meno di 60 secondi',
  Novel: 'Romanzo',
  'A novel-in-progress.\n\n- Track chapters, characters, and timeline\n- Daily word-count goal\n- Keep research notes beside the draft':
    'Un romanzo in lavorazione.\n\n- Organizza capitoli, personaggi e cronologia\n- Un obiettivo giornaliero di parole\n- Appunti di ricerca accanto alla bozza',
  'Discord bot': 'Bot Discord',
  'A Discord bot for a small community.\n\n- Slash commands + a fun daily ritual\n- Lightweight persistence\n- Deploy somewhere free':
    'Un bot Discord per una piccola comunità.\n\n- Comandi con barra e un divertente rito quotidiano\n- Salvataggio dei dati leggero\n- Pubblicazione su un servizio gratuito',
  'Data viz': 'Visualizzazione dati',
  'An interactive visualization of a dataset I care about.\n\n- Pick the dataset and the one question it answers\n- Clean → chart → annotate\n- Shareable as a single page':
    'Una visualizzazione interattiva di un insieme di dati che mi interessa.\n\n- Scegli i dati e la domanda a cui rispondere\n- Pulisci, crea grafici, aggiungi annotazioni\n- Condivisibile in un’unica pagina',
  'Generative art': 'Arte generativa',
  'A generative art piece.\n\n- One algorithm, lots of seeds\n- Export high-res stills\n- A gallery of the best outputs':
    'Un’opera di arte generativa.\n\n- Un algoritmo, molti valori iniziali\n- Esporta immagini ad alta risoluzione\n- Una galleria dei risultati migliori',
  'Recipe box': 'Ricettario',
  'A personal recipe collection.\n\n- Searchable by ingredient and mood\n- Scale servings on the fly\n- Auto-build a shopping list':
    'Una raccolta personale di ricette.\n\n- Ricerca per ingrediente e voglia del momento\n- Modifica rapidamente le porzioni\n- Genera automaticamente la lista della spesa',
  'Research log': 'Diario di ricerca',
  'A research notebook for an open question.\n\n- Log experiments, results, and dead ends\n- Cite sources inline\n- Weekly synthesis of what I learned':
    'Un quaderno di ricerca per una domanda aperta.\n\n- Annota esperimenti, risultati e tentativi senza esito\n- Cita le fonti nel testo\n- Sintesi settimanale di ciò che ho imparato',
  'Budget tracker': 'Gestione del bilancio',
  'A no-nonsense budget tracker.\n\n- Import transactions, tag them fast\n- Monthly burn vs. plan\n- One chart that tells the truth':
    'Uno strumento essenziale per gestire il bilancio.\n\n- Importa i movimenti e assegnagli etichette rapidamente\n- Confronta le spese mensili con il piano\n- Un grafico che mostri la situazione reale',
  'Habit tracker': 'Monitoraggio abitudini',
  'A habit tracker that actually sticks.\n\n- A handful of daily checkboxes\n- Streaks without guilt\n- A calm weekly review':
    'Uno strumento per mantenere le buone abitudini.\n\n- Poche caselle da spuntare ogni giorno\n- Serie di giorni senza sensi di colpa\n- Un riepilogo settimanale tranquillo',
  'Trip planner': 'Pianificazione viaggi',
  'A trip planner for an upcoming adventure.\n\n- Day-by-day itinerary\n- Map of pins + notes\n- Packing + budget checklist':
    'Un programma di viaggio per la prossima avventura.\n\n- Itinerario giorno per giorno\n- Mappa con segnaposti e appunti\n- Elenchi per bagaglio e budget',
  'Music toy': 'Gioco musicale',
  'A little music-making toy.\n\n- One instrument or sequencer\n- Web Audio, no installs\n- Record + share a loop':
    'Un piccolo strumento per creare musica.\n\n- Uno strumento o un sequenziatore\n- Web Audio, senza installazioni\n- Registra e condividi una sequenza',
  'Puzzle maker': 'Creatore di rompicapi',
  'A generator for a puzzle I love.\n\n- Procedurally make solvable puzzles\n- Difficulty dial\n- Printable + playable':
    'Un generatore del mio tipo di rompicapo preferito.\n\n- Crea rompicapi risolvibili con generazione procedurale\n- Regolazione della difficoltà\n- Da stampare o giocare sullo schermo',
  'Digital garden': 'Giardino digitale',
  'A digital garden / personal wiki.\n\n- Atomic notes that link to each other\n- Grows over time, never "done"\n- Publish the public ones':
    'Un giardino digitale o una wiki personale.\n\n- Appunti brevi collegati tra loro\n- Cresce nel tempo, senza essere mai definitivo\n- Pubblica gli appunti destinati a tutti',
  'API wrapper': 'Client API',
  'A clean wrapper around an API I keep reaching for.\n\n- Typed client + sensible defaults\n- One example per endpoint\n- Publish it':
    'Un’interfaccia semplice per un’API che uso spesso.\n\n- Client con tipi e valori predefiniti sensati\n- Un esempio per ogni endpoint\n- Pubblicazione del progetto',
  'Workout plan': 'Programma di allenamento',
  'A workout planner / logger.\n\n- Build a weekly split\n- Log sets fast on mobile\n- Track progress over months':
    'Uno strumento per pianificare e registrare gli allenamenti.\n\n- Organizza la settimana\n- Registra velocemente le serie sul telefono\n- Segui i progressi nei mesi',
  Flashcards: 'Schede di ripasso',
  'A spaced-repetition flashcard app.\n\n- Quick card capture\n- Simple SM-2 scheduling\n- A daily review that fits in 5 minutes':
    'Un’app di schede con ripetizione dilazionata.\n\n- Aggiunta rapida delle schede\n- Pianificazione semplice con SM-2\n- Un ripasso quotidiano di 5 minuti',
  Screenplay: 'Sceneggiatura',
  'A short screenplay.\n\n- Logline → beats → scenes\n- Proper format, distraction-free\n- A table read by the end':
    'Una breve sceneggiatura.\n\n- Idea di base, passaggi narrativi, scene\n- Formato corretto e senza distrazioni\n- Una lettura collettiva alla fine',
  'Learn-by-building': 'Imparare creando',
  "A project to learn a thing I've been avoiding.\n\n- Smallest real thing that teaches it\n- Notes on every gotcha\n- A writeup when it works":
    'Un progetto per imparare qualcosa che continuo a rimandare.\n\n- Il più piccolo risultato concreto utile a imparare\n- Appunti su ogni difficoltà\n- Un resoconto quando funziona'
}
