/**
 * @file encryptData.js
 * @overview
 * Implements the logic for State 5 (Encryptdata) of the encoding pipeline.
 * Calculates the buffer CRC, derives an AES-192 key using PBKDF2, encrypts
 * the data buffer, and updates the EncoderState with the new encrypted buffer,
 * IV, and Salt.
 *
 * C Reference:
 * - Function: Encryptdata (in Printer.c)
 * - State: 5 (Encrypt data)
 */

import { crc16 } from '../crc16/crc16.js';
import { Reporterror, Message } from '../logging/log.js';
import { Stopprinting } from './print.js';
import { deriveKey, aesCbcEncrypt } from '../aes/aesCrypto.js';
import {EncoderState}    from "../classes/encoderState.js";

const PBKDF2_SALT_LENGTH = 16;
const AES_IV_LENGTH = 16;

/**
 * Encrypts the data buffer using AES-192-CBC if encryption is enabled.
 * Corresponds to the un-commented logic of the C Encryptdata function.
 *
 * @param {EncoderState} encoderState - The main print data object (t_printdata).
 * @param {string} password - The user's passphrase for key derivation.
 * @returns {Promise<void>}
 * @see C_EQUIVALENT: Encryptdata (in Printer.c)
 */
export async function encryptData(encoderState, password = '') {
    // 1. Calculate 16-bit CRC of the unencrypted, compressed data (print->bufcrc)
    // This value is stored in the header for post-decryption integrity check.
    encoderState.bufcrc = crc16(encoderState.buf, encoderState.alignedsize);

    // 2. Check encryption flag (Skip rest of this step if encryption is not required)
    if (encoderState.encryption === 0 || password.length === 0) {
        encoderState.step++;
        return;
    }

    if (password.length > 32) {
        Reporterror("Password must be 32 characters or less.");
        Stopprinting(encoderState);
        return;
    }

    Message("Encrypting data...", 0);

    try {
        // --- C Logic: Setup Salt/IV and Derive Key (PBKDF2 equivalent) ---

        // C code assumes pb_password exists and would zero-pad it.
        // Web Crypto handles string encoding and key derivation securely.

        // Generate random Salt and IV (required inputs for Web Crypto AES-CBC)
        const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));

        // Derive AES-192 Key (wraps C's derive_key and aes_set_key functions)
        const key = await deriveKey(password, salt);

        // --- C Logic: aes_encrypt/aes_cbc_encrypt equivalent ---

        // Web Crypto encrypts the entire buffer at once.
        const encryptedData = await aesCbcEncrypt(key, iv, encoderState.buf);

        if (encryptedData === -1) {
            throw new Error("AES encryption failed.");
        }

        // --- Update State for HeaderBlock generation ---

        // The original C code stores Salt and IV in a hackish way inside the file name field of the t_superdata block.
        // We will pass the Salt and IV to the next step, which will correctly embed them in the header block.
        encoderState.salt = salt;
        encoderState.iv = iv;

        // Update data buffer and size flags
        encoderState.buf = encryptedData;
        encoderState.alignedsize = encoderState.buf.length;
        encoderState.datasize = encoderState.buf.length;

        // 7. Advance Step (Step finished)
        encoderState.step++;

    } catch (e) {
        Reporterror("Encryption failed: " + e.message);
        Stopprinting(encoderState);
        // Throw to propagate the promise rejection if necessary, or just rely on Stopprinting.
    }
}