// public/js/lib/printer/encryption.js

import { crc16 } from '../crc16/index.js';
import { Reporterror, Message } from '../paperbak/user-interface.js';
import { Stopprinting } from './index.js';

/**
 * Encrypts the data buffer using AES-256-CBC if encryption is enabled.
 * @param {object} print - The main print data object, which contains the password.
 * @returns {Promise<void>}
 */
export async function encryptData(print) {
    print.bufcrc = crc16(print.buf.subarray(0, print.alignedsize));

    if (print.encryption === 0) {
        print.step++;
        return;
    }

    // --- START OF FIX ---
    // Get the password from the print object, not a separate argument.
    const password = print.password;
    if (!password || password.length === 0) {
        Stopprinting(print);
        throw new Error("Password required for encryption but was not provided.");
    }
    // --- END OF FIX ---

    Message("Encrypting data...", 0);

    try {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(16));

        print.salt = salt;
        print.iv = iv;

        const keyMaterial = await crypto.subtle.importKey("raw", passwordBuffer, { name: "PBKDF2" }, false, ["deriveKey"]);
        const key = await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 524288, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-CBC", length: 256 },
            true,
            ["encrypt"]
        );

        const encryptedData = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, print.buf);

        print.buf = new Uint8Array(encryptedData);
        print.alignedsize = print.buf.length;
        print.datasize = print.buf.length;

        print.step++;

    } catch (e) {
        Stopprinting(print);
        throw e;
    }
}