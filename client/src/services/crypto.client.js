/* ========================================
   SecureMail Crypto Client — OpenPGP.js
   ======================================== */

const OPENPGP_CDN = 'https://unpkg.com/openpgp@5.11.0/dist/openpgp.min.mjs';

let openpgp = null;

/**
 * Dynamically load OpenPGP.js from CDN.
 */
export async function loadOpenPGP() {
  if (openpgp) return openpgp;
  try {
    openpgp = await import(/* @vite-ignore */ OPENPGP_CDN);
    return openpgp;
  } catch (err) {
    console.error('Failed to load OpenPGP.js:', err);
    throw new Error('Failed to load encryption library');
  }
}

/**
 * Generate an ECC key pair.
 */
export async function generateKeyPair(name, email, passphrase) {
  const pgp = await loadOpenPGP();
  const { privateKey, publicKey } = await pgp.generateKey({
    type: 'ecc',
    curve: 'curve25519',
    userIDs: [{ name, email }],
    passphrase,
    format: 'armored'
  });
  return { privateKey, publicKey };
}

/**
 * Encrypt a plaintext message with a recipient's public key.
 */
export async function encryptMessage(plaintext, recipientPublicKeyArmored) {
  const pgp = await loadOpenPGP();
  const publicKey = await pgp.readKey({ armoredKey: recipientPublicKeyArmored });
  const encrypted = await pgp.encrypt({
    message: await pgp.createMessage({ text: plaintext }),
    encryptionKeys: publicKey
  });
  return encrypted;
}

/**
 * Decrypt a ciphertext with a private key.
 */
export async function decryptMessage(ciphertext, privateKeyArmored, passphrase) {
  const pgp = await loadOpenPGP();
  let privateKey = await pgp.readPrivateKey({ armoredKey: privateKeyArmored });
  if (passphrase) {
    privateKey = await pgp.decryptKey({ privateKey, passphrase });
  }
  const message = await pgp.readMessage({ armoredMessage: ciphertext });
  const { data: decrypted } = await pgp.decrypt({
    message,
    decryptionKeys: privateKey
  });
  return decrypted;
}

/**
 * Sign a message with a private key.
 */
export async function signMessage(text, privateKeyArmored, passphrase) {
  const pgp = await loadOpenPGP();
  let privateKey = await pgp.readPrivateKey({ armoredKey: privateKeyArmored });
  if (passphrase) {
    privateKey = await pgp.decryptKey({ privateKey, passphrase });
  }
  const message = await pgp.createCleartextMessage({ text });
  const signed = await pgp.sign({
    message,
    signingKeys: privateKey
  });
  return signed;
}

/**
 * Verify a signed message with a public key.
 */
export async function verifySignature(signedMessageArmored, publicKeyArmored) {
  const pgp = await loadOpenPGP();
  const publicKey = await pgp.readKey({ armoredKey: publicKeyArmored });
  const signedMessage = await pgp.readCleartextMessage({
    cleartextMessage: signedMessageArmored
  });
  const verificationResult = await pgp.verify({
    message: signedMessage,
    verificationKeys: publicKey
  });
  const { verified } = verificationResult.signatures[0];
  try {
    await verified;
    return { valid: true, text: verificationResult.data };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/**
 * Export a key to armored string (passthrough if already armored).
 */
export async function exportKey(keyArmored) {
  return keyArmored;
}

/**
 * Import a key from an armored string.
 */
export async function importKey(armoredKey) {
  const pgp = await loadOpenPGP();
  try {
    const key = await pgp.readKey({ armoredKey });
    return {
      type: 'public',
      fingerprint: key.getFingerprint().toUpperCase(),
      userIDs: key.getUserIDs(),
      key
    };
  } catch (_) {
    const key = await pgp.readPrivateKey({ armoredKey });
    return {
      type: 'private',
      fingerprint: key.getFingerprint().toUpperCase(),
      userIDs: key.getUserIDs(),
      key
    };
  }
}

/**
 * Get the fingerprint of an armored key.
 */
export async function getKeyFingerprint(armoredKey) {
  const pgp = await loadOpenPGP();
  try {
    const key = await pgp.readKey({ armoredKey });
    return key.getFingerprint().toUpperCase();
  } catch (_) {
    const key = await pgp.readPrivateKey({ armoredKey });
    return key.getFingerprint().toUpperCase();
  }
}
