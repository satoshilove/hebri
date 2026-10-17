/**
 * E2E encryption for Hebri team chat.
 *
 * Zero dependencies — uses Web Crypto API built into Chromium/Electron.
 *
 * Architecture:
 * 1. Each Hebri generates an ECDH keypair once (stored in plugin storage)
 * 2. Room creator generates a random AES-256-GCM room key
 * 3. Room key encrypted for each peer using ECDH + HKDF
 * 4. All messages encrypted with the room key before local storage and sync
 * 5. Unencrypted rooms still work for plaintext (backward compat)
 *
 * Key exchange: QR code or copy-paste of a RoomInvite JSON blob.
 */

const ECDH_CURVE = 'P-256' as const
const AES_LEN = 256 as const

// ─── Encoding ────────────────────────────────────────────────────────────────

function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const bin = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(bin)
}

function b642ab(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// ─── Fingerprint ─────────────────────────────────────────────────────────────

/** Short SHA-256 fingerprint of a public key JWK */
export async function keyFingerprint(jwk: JsonWebKey): Promise<string> {
  const canonical = JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y })
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return ab2b64(hash).slice(0, 12)
}

// ─── Identity ──────────────────────────────────────────────────────────────

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

// ─── Room keys ─────────────────────────────────────────────────────────────

export async function generateRoomKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_LEN },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function importRoomKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function exportRoomKey(key: CryptoKey): Promise<ArrayBuffer> {
  return globalThis.crypto.subtle.exportKey('raw', key)
}

// ─── Key wrapping (ECDH + HKDF → AES wrapped AES key) ────────────────────

async function deriveWrappingKey(
  myPrivateKey: CryptoKey,
  peerJwk: JsonWebKey
): Promise<CryptoKey> {
  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('hebri-team-chat-v1'),
      public: peerJwk,
    },
    myPrivateKey,
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

// ─── Room invite ────────────────────────────────────────────────────────────

export interface RoomKeyEnvelope {
  forKey: string
  encrypted: string
  iv: string
}

export interface RoomInvite {
  name: string
  roomId: string
  fromKey: JsonWebKey
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
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await globalThis.crypto.subtle.wrapKey(
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
      forKey: await keyFingerprint(peerJwk),
      encrypted: ab2b64(encrypted),
      iv: ab2b64(iv),
    },
  }
}

/** Accept a room invite: unwrap the room key for ourselves */
export async function acceptRoomInvite(
  invite: RoomInvite,
  myPrivateKey: CryptoKey
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(myPrivateKey, invite.fromKey)

  return globalThis.crypto.subtle.unwrapKey(
    'raw',
    b642ab(invite.envelope.encrypted),
    wrappingKey,
    { name: 'AES-GCM', iv: b642ab(invite.envelope.iv), additionalData: new Uint8Array(0) },
    { name: 'AES-GCM', length: AES_LEN },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─── Message encryption ────────────────────────────────────────────────────

export interface EncryptedMessage {
  c: string
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

/** Decrypt an encrypted message */
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