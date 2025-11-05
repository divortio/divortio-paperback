/**
 * @file aesCrypto.js
 * @overview
 * Provides wrappers for the AES encryption/decryption routines required by
 * Fileproc.c, using the Web Crypto API. Emulates the C functions aes_decrypt_key
 * and aes_cbc_decrypt, ensuring AES-192-CBC mode with PBKDF2 key derivation.
 * * C Functions Emulated:
 * - derive_key (external library, wraps PBKDF2)
 * - aes_decrypt_key (partially wrapped by deriveKey)
 * - aes_cbc_decrypt
 */

// --- Constants from C Source ---
const AES_KEYLEN_BITS = 192; // 24 bytes * 8 bits/byte (AES-192)
const PBKDF2_ITERATIONS = 524288;

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = -1;

/**
 * Derives a key using PBKDF2 and sets up the AES Web Crypto Key object.
 * This function handles the logic of C's external `derive_key` function and
 * implicitly prepares the key object needed for `aes_decrypt_key` and encryption.
 * @param {string} password - The user's passphrase.
 * @param {Uint8Array} salt - The 16-byte salt buffer.
 * @returns {Promise<CryptoKey>} A promise that resolves to a Web Crypto API CryptoKey object ready for AES-CBC.
 * @see C_EQUIVALENT: derive_key (PBKDF2) and aes_decrypt_key/aes_encrypt_key (setup)
 */
export async function deriveKey(password, salt) {
    if (!password || !salt) {
        throw new Error("Password and salt are required for key derivation.");
    }

    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // 1. Import Key Material from Password
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false, // not extractable
        ["deriveKey"]
    );

    // 2. Derive Final AES Key using PBKDF2 parameters
    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        keyMaterial,
        {
            name: "AES-CBC",
            length: AES_KEYLEN_BITS // 192 bits for AES-192
        },
        true, // key is extractable
        ["encrypt", "decrypt"]
    );

    return key;
}

/**
 * Performs AES-CBC decryption on the input buffer.
 * * @param {CryptoKey} key - The AES CryptoKey object (set up by deriveKey).
 * @param {Uint8Array} iv - The 16-byte Initialization Vector (IV).
 * @param {Uint8Array} encryptedData - The data to be decrypted.
 * @returns {Promise<Uint8Array>} A promise that resolves to the decrypted data, or fails on decryption error.
 * @see C_EQUIVALENT: aes_cbc_decrypt
 */
export async function aesCbcDecrypt(key, iv, encryptedData) {
    if (!key || !iv || !encryptedData) {
        return EXIT_FAILURE;
    }

    try {
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: "AES-CBC", iv: iv },
            key,
            encryptedData
        );

        return new Uint8Array(decryptedBuffer);

    } catch (e) {
        // Map Web Crypto decryption failure to C error code
        console.error("AES Decryption Failed:", e);
        return EXIT_FAILURE;
    }
}

/**
 * Performs AES-CBC encryption on the input buffer.
 * * @param {CryptoKey} key - The AES CryptoKey object (set up by deriveKey).
 * @param {Uint8Array} iv - The 16-byte Initialization Vector (IV).
 * @param {Uint8Array} data - The data to be encrypted.
 * @returns {Promise<Uint8Array>} A promise that resolves to the encrypted data, or fails on error.
 * @see C_EQUIVALENT: aes_cbc_encrypt (implicitly used during encoding)
 */
export async function aesCbcEncrypt(key, iv, data) {
    if (!key || !iv || !data) {
        return EXIT_FAILURE;
    }

    try {
        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: "AES-CBC", iv: iv },
            key,
            data
        );

        return new Uint8Array(encryptedBuffer);

    } catch (e) {
        console.error("AES Encryption Failed:", e);
        return EXIT_FAILURE;
    }
}