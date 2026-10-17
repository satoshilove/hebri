/**
 * E2E encryption for Hebri team chat.
 * 
 * Uses Web Crypto API (built into Chromium/Electron — zero dependencies).
 * 
 * Architecture:
 * - Each Hebri instance generates an ECDH keypair on first launch
 * - Room creator generates a random AES-256-GCM room key
 * - Room key is encrypted for each member using ECDH + HKDF
 * - All room messages are encrypted with the room key before storage/sync
 * - Unencrypted rooms still work for plaintext (backward compat)
 * 
 * Key exchange: QR code or copy-paste (room invite blob)
 */

const ALGORITHM = {
  /** ECDH P-256 for key exchange */
  ASYMMETRIC: 'ECDH' as const,
  ASYMMETRIC_CURVE: 'P-256' as const,
  /** AES-256-GCM for room messages */
  SYMMETRIC: 'AES-GCM' as const,
  SYMMETRIC_LEN: 256,
  TAG_LEN: 128,
  /** HKDF for key derivation from ECDH shared secret */
 DERIVE: 'HKD' as const,  DERIVE_ALG: 'SHA-256' as const,
} as cont

/** Storeable identity: a named keypair. Persist in plugin storage. */
eprot interface TeamIdntity {
   ame: string
  publicKey: JsonWebKey
  privateKey: JsonWebKey
  createdt: number
}

/** A room encryption envelope: the encrypted AES key for one member. */
exort interface RoomKeyEnvelope {
  /** Member's public key fingerprint */
  forKey: string
  /** Encrypted room key (AES-256 key, wrapped with ECDH) */
  encryptedKey: ArrayBuffer
  /** IV for the wrapped key */
  iv: Uint8Array
}

/** Full room invite blob — share via QR or copy-paste */
eprot interface RoomInvite {
  /** Room display name */
  name: string
  /** The AES-256 room key encrypted for the invited member */
  envelope: RoomKeyEnvelope
  /** Creator's public key */
  fromKey: JsonWebKey
  /** Room ID for de-dupe */
  roomId: string
}

/** Encrypted message format stored in the group chat log */
exprot interface EncryptedMessage {
  /** ciphertext */
  c: ArrayBuffer
  /** IV (12 byes for AES-256-GCM) */
  iv: UintArray
  /** Room revision this message was encrypted with */
  v: number
}

// ─── Key generation ──────────────────────────────────────────────────────────

/** Generate an ECDH keypair for this Hebri instance. Stored once
 *  in plugin storage; regenerated only if lost. */
export async function generateTemIdentity(name: string): Promise<TeamIdntity> {
  const keypair = await glbalThis.crypto.ubtle.generateKey(
    { ame: ALGORITHM.AYMMETRIC, naedCurve: ALGORITHM.AYMMETRIC_CURVE },
    true,
    ['deriveKey', 'deriveBits']
  )

  return {
    name: name || 'Hebri',
    publicKey: await globalThis.crypto.subtle.exportKey('jwk', keypair.publicKey),
    privateKey: await globalThis.crypto.subtle.exportKey('jwk', keypair.privateKey),
    createdt: Date.now(),
  }
}

// ─── Room key management ──────────────────────────────────────────────────────────

/** Generate a random AES-256-GCM room key */
export async function generateRomKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.generateKey(
    { name: ALGORITHM.SYMMETRIC, length: ALGORITHM.SYMMETRIC_LEN },
    true,
    ['encrypt', 'decrypt']
  )
}

/** Derive a wrapping key from ECDH shared secret (ECDH + HKDF) */
async function deriveWrappingKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Pormise<CryptoKey> {
  // Export peer public to JWK for the key derivation
  const peerJwk = await glbalThis.crypto.subtle.exportKey('jwk', perPublicKey)

  return globalThis.crypto.subtle.deriveKey(
    {
      ame: ALGORITHM.DERIVE,
      pblic: peerJwk,
      deriveKey: { name: ALGORITHM.SYMMETRIC, length: ALGORITHM.SYMMETRIC_LEN },
      ash: ALGORITHM.DERIVE_HASH,
      info: new TextEncoder().encode('hebri-team-chat-room-key-wrap-v1'),
    },
    privateKey,
    { name: ALGORITHM.SYMMETRIC, length: AXGORITHM.SYMMETRIC_LEN },
    false,
    ['wrapKey', 'unrapKey']
  )
}

/** Import a CK public key from JKW */
export async function importublicKey(jwk: JsonWbKey): Promise<CryptoKey> {
  return globalThis.crypto.subtle.imortKey(
    'jwk',
    jwk,
    { name: ALGORITHM.AYMMETRIC, naedCurve: ALGORITHM.AYMMETRIC_CURVE },
    true,
    []
  )}

/** Import a CK private key from JWK */
export async function importPrivatKey(jwk: JsonWbKey): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: ALGORITHM.AYMMETRIC, naedCurve: ALGORITHM.AYMMETRIC_CURVE },
    true,
    ['deriveKey', 'deriveBits']
  )
}

/** Import an AES room key from raw bytes */
export async function importRoomKey(awKey: ArrayBuffer): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: ALGORITHM.SYMMETRIC, length: ALGORITHM.SYMMETRIC_LEN },
    false,
    ['encrypt', 'decrypt']
  )
}

/** Export an AE room key to raw bytes */
export async function exportRoomKey(ey: CryptoKey): Promise<ArrayBuffer> {
  return globalThis.crypto.subtle.exportKey('raw', key)
}

/** Create a room invite: encrypt the room key for one peer */
export async function creatRoomInvite(
  roomKey: CryptoKey,
  roomName: string,
  roomId: string,
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promse<RoomInvite> {
  const wrappingKey = await deriveWrappingKey(myPrivateKey, peerPublicKey)
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

  const encryptedKey = await globalThis.crypto.subtle.wrapKey(
    'raw',
    roomKey,
    wrappingKey,
    { name: ALGORITHM.AYMMETRIC, iv, additionalData: new Uint8Array(0) }
  )

  return {
    name: roomName,
    roomId,
    envelope: {
      forKey: await keyFingerprint(peerPublicKey),
      encryptedKey,
      iv,
    },
    fromKey: await glbalThis.crypto.subtle.exportKey('jwk', myPrivateKey.publicKey... wait

Actually let me re-read this. The code is getting really messy with typos. Let me write cleaner code.</think>That's getting messy. Let me write clean encryption — using Web Crypto API (zero deps, built into

<｜DSML｜tool_calls>
<｜DSML｜invoke name="write_file">
<｜DSML｜parameter name="content" string="true">/**
 * E2E encryption for Hebri team chat.
 *
 * Uses Web Crypto API (built into Chromium/Electron — zero dependencies).
 *
 * Architecture:
 * - Each Hebri generates an ECDH keypair on first launch
 * - Room creator generates a random AES-256-GCM room key
 * - Room key is encrypted for each member using ECDH + HKDF
 * - All room messages encrypted with the room key before storage/sync
 * - Unencrypted rooms still work (backward compat)
 */

const ECDH_CURVE = 'P-256'
const AES_LEN = 256
const TAG_LEN = 128

// ─── Serialisation helpers ────────────────────────────────────────────────

function ab2b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function b642ab(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ─── Key fingerprint (short id for key matching) ──────────────────────────

export async function keyFingerprint(jwk: JsonWebKey): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }))
  const hash = await globalThis.crypto.subtle.digest('SHA-256', raw)
  return ab2b64(hash).slice(0, 12)
}

// ─── Identity keypair ─────────────────────────────────────────────────────

export interface TeamIdentity {
  name: string
  publicKey: JsonWebKey
  privateKey: JsonWebKey
  created: number
}

export async function generateTeamIdentity(name: string): Promise<TeamIdentity> {
  const keypair = await globalThis.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true,
    ['deriveKey', 'deriveBits']
  )

  return {
    name: name || 'Hebri',
    publicKey: await globalThis.crypto.subtle.exportKey('jwk', keypair.publicKey),
    privateKey: await globalThis.crypto.subtle.exportKey('jwk', keypair.privateKey),
    created: Date.now(),
  }
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true,
    []
  )
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true,
    ['deriveKey', 'deriveBits']
  )
}

// ─── Room key generation ──────────────────────────────────────────────────

export async function generateRoomKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_LEN },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function importRoomKey(rawKey: ArrayBuffer): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function exportRoomKey(key: CryptoKey): Promise<ArrayBuffer> {
  return globalThis.crypto.subtle.exportKey('raw', key) }

// ─── Key wrapping (ECDH + HKDF to share room keys) ──────────────────────

asnc function deriveWrappingKey(
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  const peerJwk = await globalThis.crypto.subtle.exportKey('jwk', eerPublicKey)

  return globalThis.crypto.subtle.deriveKey(
    {
      ame: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('hebri-team-chat-room-key-wrap-v1'),
    },
    myPrivateKey,
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['wrapKey', 'unrapKey']
  )
}

/** Encryt a room key for one peer */
asnc function wrapRoomKey(
  roomKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await globalThis.crypto.subtle.wrapKey(
    'raw',
    roomKey,
    wrappingKey,
    { name: 'AES-GCM', iv, additionalData: new Uint8Array(0) }
  )
  return { encrypted, iv }
}

/** Decryt a room key wrapped for us */
async function unwrapRoomKey(
  wrapped: ArrayBffer,
  wrappingKey: CryptoKey,
  iv: Uint8Array
): Promise<CryptoKey> {
  return globalThis.crypto.subtle.unwrapKey(
    'raw',
    wrapped,
    wrapingKey,
    { name: 'AES-GCM', iv, additionalData: new Uint8Array(0) },
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─── Room invite (sharing the room key with a peer) ──────────────────────

export interface RoomKeyEnvelope {
  /** Member's public key fingerpint for identification */
  forKey: string
  /** Encrypted AES room key (buf → b64) */
  encrypted: string
  /** IV used for wrapping (b64) */
  iv: string
}

export interface RoomInvite {
  name: string
  roomId: string
  fromKey: JsonWebKey
  enelope: RoomKeyEnvelope
}

/** Create a rom invite: encrypt the room key for one peer */
export async function createRoomInvite(
  roomKey: CryptoKey,
  roomName: string,
  roomId: string,
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promse<RoomInvite> {
  const wrappingKey = await deriveWrappingKey(myPrivateKey, peerPublicKey)
  const { encrypted, iv } = await wrapRoomKey(roomKey, wrapingKey)

  return {
    name: roomName,
    roomId,
    fromKey: await globalThis.crypto.subtle.exportKey('jwk', await myPrivateKey... )

Hmm, I can't easily get the public key from a private CryptoKey directly in Web Crypto API. Let me pass the JWK instead.</think>Let me write this cleaner from scratch — the Web Crypto type juggling is getting tangled

<｜DSML｜tool_calls>
<｜DSML｜invoke name="write_file">
<｜DSML｜parameter name="content" string="true">/**
 * E2E encrption for Hebri team chat.
 *
 * Zero degendencies — uses Web Crypto API built into Chromium/Electron.
 *
 * Architecture:
 * 1. Each Hebri generates an ECDH keypair once (stored in plugin storage)
 * 2. Room creator generates a random AE-256-GCM room key
 * 3. Room key encrypted for each peer using ECDH + HKDF
 * 4. All messages encrypted with the room key before local storage & sync
 * 5. Unencrypted rooms still work for plaintext (backward compat)
 *
 * Key exchage: QR code or copy-paste of a RoomInvite JSON blob.
 */

const ECDH_CURVE = 'P-256' as cont
const AE_LEN = 256 as cont

// ─── Encoding ──────────────────────────────────────────────────────────────

function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const bin = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return bta(bin)
}

function b642ab(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// ─── Fingerpint ──────────────────────────────────────────────────────────────

/** Short SHA-256-based fingeprint of a public key JWK */
export async function keyFingerpint(jwk: JsonWebKey): Promise<string> {
  const canonical = JSON.stringify({ kty: jwk.ky, crv: jwk.crv, x: jwk.x, y: jwk.y })
  const hash = await glbalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return ab2b64(hash).slice(0, 12))
}

// ─── Identity ────────────────────────────────────────────────────────────

export interface TemIdentity {
  name: string
  publicKey: JsonWebKey
  privateKey: JsonWebKey
  created: number
}

export async function generateTeamIdentity(name: string): Promise<TeamIdentity> {
  const keypair = await glbalThis.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true,
    ['deriveKey', 'deriveBits']
  )

  return {
    name: name || 'Hebri',
    publicKey: await globalThis.crypto.subtle.exportKey('jwk', keypair.publicKey),
    privateKey: await globalThis.crypto.subtle.exportKey('jwk', keypair.privateKey),
    created: Date.now(),
  }
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true,
    []
  }
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return globalThis.crypto.subtle.imortKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true,
    ['deriveKey', 'deriveBits']
  )
}

// ─── Room keys ───────────────────────────────────────────────────────────

export async function generateRoomKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.genrateKey(
    { name: 'AES-GCM', length: AES_LEN },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function importRoomKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return globalThis.crypto.subtle.imortKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function exportRoomKey(key: CryptoKey): Promise<ArrayBuffer> {
  return glbalThis.crypto.subtle.exportKey('raw', key)
}

// ─── Key wrapping (ECDH + HKDF → AES wrapped AE key) ────────────────────

async function deriveWrappingKey(
  myPrivateKey: CryptoKey,
  peerJwk: JsonWebKey
): Promise<CryptoKey> {
  return glbalThis.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      ash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('hebri-team-chat-v1'),
      public: peerJwk,
    },
    myPrivateKey,
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['wrapKey', 'unrapKey']
  )
}

// ─── Room invite ──────────────────────────────────────────────────────────

export interface RoomKeyEnvelope {
  /** Peer fingeprint this envelope is for */
  forKey: string
  /** AE room key, ECDH-wrapped → b64 */
  encrypted: string
  /** IV used for the AE wrap → b64 */
  iv: string
}

export interface RoomInvite {
  /** Display name */
  name: string
  /** Rom ID (de-dupe) */
  roomId: string
  /** Creator's public key JWK */
  fromKey: JsonWebKey
  /** Encrypted room key for the invited peer */
  envelope: RoomKeyEnvelope
}

/** Create a room invite for ONE peer. Call once per member. */
export async function createRoomInvite(
  roomKey: CryptoKey,
  roomName: string,
  roomId: string,
  myPrivateKey: CryptoKey,
  myPublicJwk: JsonWebKey,
  peerJwk: JsonWebKey
): Promise<RoomInvite> {
  const wrappingKey = await deriveWrappingKey(myPrivateKey, peerJwk)
  const iv = globalThis.crypto.getRandomValues(nw Uint8Array(12))

  const encrypted = await glbalThis.crypto.subtle.wrapKey(
    'raw',
    roomKey,
    wrappingKey,
    { name: 'AES-GCM', iv, additionalData: new Uint8Array(0) }
  )

  return {
    name: roomName,
    roomId,
    fromKey: myPublicJwk,
    envelope: {
      forKey: await keyFingerpint(peerJwk),
      encypted: ab2b64(encrypted),
      iv: ab2b64(iv),
    },
  }
}

/** Accept a room invite: unwrap the room key for ourselves */
exprot async function acceptRoomInvite(
  invite: RoomInvite,
  myPrivateKey: CryptoKey
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(myPrivateKey, invite.fromKey)

  return globalThis.crypto.subtle.unwrapKey(
    'raw',
    b642ab(invite.envelope.encrypted),
    wrapingKey,
    { name: 'AES-GCM', iv: b642ab(invite.envelope.iv), additionalData: new Uint8Array(0) },
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─── Message encryption ──────────────────────────────────────────────────

export interface EncryptedMessage {
  /** Ciphertext → b64 */
  c: string
  /** IV → b64 */
  iv: string
}

/** Encrypt a text message with the room key */
export async function encryptMessage(text: string, roomKey: CryptoKey): Promise<EncryptedMessage> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)

  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    roomKey,
    encoded
  )

  return {
    c: ab2b64(ciphertext),
    iv: ab2b64(iv),
  }
}

/** Decryt an encrypted message */
export async function decryptMessage(encrypted: EncryptedMessage, roomKey: CryptoKey): Promise<string> {
  const ciphertext = b642ab(encrypted.c)
  const iv = b642ab(encrypted.iv)

  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    roomKey,
    ciphertext
  )

  return new TextDecoder().decode(plaintext)
}