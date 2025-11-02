/**
 * @fileoverview
 * Provides decryption helper functions for the file saving (decoding) process.
 * This module is the cryptographic counterpart to `lib/printer/encryption.js`.
 * It will be imported by `fileSaver.js` to decrypt file data before decompression.
 */

/**
 * Derives a cryptographic key from a user-provided password and a salt.
 * The parameters (iterations, hash, key length) are identical to those in
 * `encryption.js` to ensure the same key is generated.
 *
 * @param {string} password - The user-provided password.
 * @param {Uint8Array} salt - The 16-byte salt, extracted from the file's superblock.
 * @returns {Promise<CryptoKey>} A promise that resolves to the derived CryptoKey.
 */
export async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import the raw password material for PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    // Derive the key using the *exact same* parameters as the encoder
    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 524288, // Must match encryption.js
            hash: "SHA-256"      // Must match encryption.js
        },
        keyMaterial,
        {
            name: "AES-CBC",
            length: 128         // Must match encryption.js (which we patched to 128)
        },
        true,                 // `true` for extractable, though not strictly needed here
        ["decrypt"]           // Specify key usage for decryption
    );

    return key;
}

/**
 * Decrypts a buffer of data using a derived key and an Initialization Vector (IV).
 *
 * @param {Uint8Array} data - The encrypted data buffer (ciphertext).
 * @param {CryptoKey} key - The `CryptoKey` derived from `deriveKey`.
 * @param {Uint8Array} iv - The 16-byte IV, extracted from the file's superblock.
 * @returns {Promise<ArrayBuffer>} A promise that resolves to an ArrayBuffer
 * containing the decrypted data (plaintext).
 * @throws {Error} If decryption fails (e.g., due to incorrect password/key).
 */
export async function decryptAES(data, key, iv) {
    try {
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: iv
            },
            key,
            data // This should be the Uint8Array of the encrypted data
        );
        return decryptedData; // This is an ArrayBuffer
    } catch (error) {
        console.error("Decryption failed:", error);
        // This error is almost always caused by an incorrect password,
        // which leads to a bad key and a failure to unpad the data.
        throw new Error("Decryption failed. This is likely due to an incorrect password.");
    }
}