/**
 * importKey
 * @param pwd {string}
 * @param extractable {boolean}
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(pwd, extractable = false) {
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
        "raw",
        encoder.encode(pwd),
        {name: "PBKDF2"},
        extractable,
        ["deriveKey"]
    );
}

/**
 * deriveKey
 * @param baseKey {CryptoKey}
 * @param salt {Uint8Array<ArrayBuffer>}
 * @param keyLen {number}
 * @param iterations {number}
 * @param extractable {boolean}
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(baseKey, salt, keyLen = 256, iterations = 524288, extractable = false) {

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: "SHA-256"
        },
        baseKey,
        {
            name: "AES-CBC",
            length: keyLen
        },
        extractable,
        ["encrypt", "decrypt"]
    );
}


/**
 * getKey
 * @param pwd {string}
 * @param salt  {Uint8Array<ArrayBuffer>}
 * @param keyLen {number}
 * @param iterations {number}
 * @param extractable {boolean}
 * @returns {Promise<CryptoKey>}
 */
export async function getKey(pwd, salt, keyLen = 256, iterations = 524288, extractable = false) {
    return deriveKey( await importKey(pwd, extractable), salt, keyLen, iterations, extractable);
}

/**
 * getRandom
 * @param len {number}
 * @returns {Promise<Uint8Array<ArrayBuffer>>}
 */
export async function getRandom(len=16) {
    return crypto.getRandomValues(new Uint8Array(len));
}


/**
 * getSeed
 * @param input {Uint8Array<ArrayBuffer>}
 * @param len {number}
 * @returns {Promise<Uint8Array<ArrayBuffer>>}
 */
export async function getSeed(input, len=16) {
    return input || crypto.getRandomValues(new Uint8Array(len));
}

/**
 * getIV
 * @param input {Uint8Array<ArrayBuffer>}
 * @param len {number}
 * @returns {Promise<Uint8Array<ArrayBuffer>>}
 */
export async function getIV(input, len=16) {
    return getSeed(input, len);
}
