/**
 * @fileoverview
 * Port of the `Saverestoredfile` function from `Fileproc.c`.
 * This function handles the final stage of file reassembly:
 * decryption, decompression, and saving the file to disk.
 */

import {NFILE, PBM_ENCRYPTED, PBM_COMPRESSED} from '../primitives/constants.js';
import { pb } from '../primitives/pb.js';
import { pb_fproc } from './fileState.js';
import { closeFproc } from './closeFproc.js';

import { Reporterror, Message } from '../logging/log.js';
import { crc16 } from '../crc16/crc16.js';

// NOTE: The original C project uses bzip2.
// This JS port uses pako (gzip), so it is NOT compatible with
// files encoded by the original C application.
import { inflate } from '../../vendor/pako/dist/pako.esm.js';


// Import the new decryption functions
import { deriveKey, decryptAES } from '../scanner/decryption.js';

/**
 * @typedef {import('../primitives/createFproc.js').t_fproc} t_fproc
 */

/**
 * Saves the file from the specified slot, optionally forcing
 * if the file is incomplete.
 * Corresponds to `Saverestoredfile` in `Fileproc.c`.
 *
 * @param {number} slot - The index of the file processor (t_fproc) to save.
 * @param {boolean} force - If true, saves the file even if incomplete.
 * @returns {Promise<object|null>} An object { blob, filename } on success, or null on error.
 */
export async function saveRestoredFile(slot, force) {
    if (slot < 0 || slot >= NFILE) {
        Reporterror("Invalid file slot index.");
        return null; // C: return -1;
    }

    const pf = pb_fproc[slot];
    if (pf.busy === 0 || pf.nblock === 0) {
        Reporterror("File slot is not busy or has no blocks.");
        return null; // C: return -1;
    }

    if (pf.ndata !== pf.nblock && force === 0) {
        Reporterror("File is incomplete and 'force' is not set.");
        return null; // C: return -1;
    }
    Message("", 0);

    let dataToProcess = pf.data; // Assume unencrypted first

    // If data is encrypted, decrypt it.
    // C: if (pf->mode & PBM_ENCRYPTED) { ... }
    if (pf.mode & PBM_ENCRYPTED) {
        if (pf.datasize % 16 !== 0) {
            // C: if (pf->datasize & 0x0000000F) { Reporterror("Encrypted data is not aligned"); ... }
            Reporterror("Encrypted data is not aligned to 16 bytes. Cannot decrypt.");
            return null; // C: return -1;
        }

        // Get password from the global state
        // C: if (Getpassword()!=0) { ... }
        const password = pb.password;
        if (!password) {
            Reporterror("File is encrypted. Password is required for decryption.");
            return null;
        }

        try {
            // Extract salt and IV from the pf.name buffer
            // C code: salt=(uchar *)(pf->name)+32;
            const salt = pf.name.subarray(32, 48); // Bytes 32-47
            // C code: memcpy(iv, salt+16, 16);
            const iv = pf.name.subarray(48, 64);   // Bytes 48-63

            // 1. Derive the key
            const key = await deriveKey(password, salt);

            // 2. Decrypt the data
            // C: if(aes_cbc_decrypt(pf->data,tempdata,pf->datasize,iv,ctx) == EXIT_FAILURE) { ... }
            // decryptAES returns an ArrayBuffer
            const decryptedArrayBuffer = await decryptAES(pf.data, key, iv);
            const decryptedData = new Uint8Array(decryptedArrayBuffer);

            // 3. Verify CRC to check password validity
            // C: filecrc=Crc16(tempdata,pf->datasize);
            const filecrc = crc16(decryptedData, decryptedData.length);
            // C: if (filecrc!=pf->filecrc) { Reporterror("Invalid password..."); ... }
            if (filecrc !== pf.filecrc) {
                Reporterror("Invalid password or corrupted data. CRC mismatch.");
                return null; // C: return -1;
            }

            // 4. Set the decrypted data as the data to be processed
            // C: pf->data=tempdata;
            dataToProcess = decryptedData;

        } catch (e) {
            Reporterror(`Decryption failed: ${e.message}`);
            return null;
        }
    }

    // If data is compressed, unpack it.
    // C: if ((pf->mode & PBM_COMPRESSED)==0) { ... }
    let processedData;
    if ((pf.mode & PBM_COMPRESSED) === 0) {
        // Data is not compressed.
        // C: data=pf->data; length=pf->origsize;
        processedData = dataToProcess;
    } else {
        // Data is compressed. Decompress it.
        try {
            // C: success=BZ2_bzBuffToBuffDecompress((char *)bufout,(uint *)&length, ...);
            // We use pako (zlib) instead of bzip2
            processedData = inflate(dataToProcess);
            // Check if decompression was successful
            if (!processedData || processedData.length !== pf.origsize) {
                throw new Error(
                    `Decompressed size (${processedData ? processedData.length : 'N/A'}) does not match original size (${pf.origsize})`
                );
            }
        } catch (e) {
            // C: Reporterror("Unable to unpack data");
            Reporterror(`Unable to unpack data: ${e.message}`);
            // C: return -1;
            return null;
        }
    }

    // C: // Ask user for file name. (Omitted, we get it from pf.name)
    // C: // Open file and save data.
    // C: hfile = fopen (pb_outfile, "wb");
    // In JS, we return the blob and filename for the UI to handle.
    try {
        // First, get the filename from the pf->name buffer
        const decoder = new TextDecoder();
        // Find the first null byte (0)
        let nullIndex = pf.name.indexOf(0);
        // If 0 is not found, or is after byte 32, just use the first 32 bytes
        // (since 32-63 are salt/iv)
        if (nullIndex === -1 || nullIndex > 32) {
            nullIndex = 32;
        }
        const nameBytes = pf.name.subarray(0, nullIndex);
        const filename = decoder.decode(nameBytes);

        const blob = new Blob([processedData], { type: 'application/octet-stream' });

        // C: // Close file descriptor and report success.
        // C: Closefproc(slot);
        closeFproc(slot);
        Message("File saved", 0);
        return { blob, filename: filename || 'restored.dat' };

    } catch (e) {
        // C: Reporterror("Unable to create file");
        Reporterror(`Unable to save file: ${e.message}`);
        return null;
    }

    // C: // Restore old modification date and time.
    // (This part is not possible in a browser and is omitted)
}