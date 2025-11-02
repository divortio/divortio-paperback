/**
 * @fileoverview
 * Port of the `Saverestoredfile` function from `Fileproc.c`.
 * This function handles the final stage of file reassembly:
 * decryption, decompression, and saving the file to disk.
 */

import {NFILE, PBM_ENCRYPTED, PBM_COMPRESSED} from '../primitives/constants.js';
import { pb_fproc } from './fileState.js';
import { closeFproc } from './closeFproc.js';

import { Reporterror, Message } from '../logging/log.js';
import { crc16 } from '../crc16/crc16.js';

// NOTE: The original C project uses bzip2.
// This JS port uses pako (gzip), so it is NOT compatible with
// files encoded by the original C application.
import { pako } from 'pako';

// Import the same crypto functions used by the encoder
import { deriveKey, decryptAES } from '../printer/encryption.js';

/**
 * @typedef {import('../include/paperbak/index.js').t_fproc} t_fproc
 */

/**
 * Saves the file from the specified slot, optionally forcing
 * if the file is incomplete.
 * Corresponds to `Saverestoredfile` in `Fileproc.c`.
 *
 * @param {number} slot - The index of the file processor (t_fproc) to save.
 * @param {boolean} force - If true, saves the file even if incomplete.
 * @returns {Promise<number>} 0 on success, -1 on error.
 */
export async function saveRestoredFile(slot, force) {
    // C: if (slot<0 || slot>=NFILE) return -1;
    if (slot < 0 || slot >= NFILE || !pb_fproc[slot]) {
        return -1;
    }

    // C: pf=pb_fproc+slot;
    const pf = pb_fproc[slot];
    // C: if (pf->busy==0 || pf->nblock==0) return -1;
    if (pf.busy === 0 || pf.nblock === 0) {
        return -1;
    }

    // C: if (pf->ndata!=pf->nblock && force==0) return -1;
    if (pf.ndata !== pf.nblock && !force) {
        Reporterror("File is incomplete and 'force' is not set.");
        return -1;
    }

    // C: Message("",0);
    Message("", 0); // Clears the message bar

    // Get the actual data, not the full allocated buffer
    // C: (pf->data is used, but its length is pf->datasize)
    let processedData = pf.data.subarray(0, pf.datasize);

    // C: if (pf->mode & PBM_ENCRYPTED) {
    if (pf.mode & PBM_ENCRYPTED) {
        // C: if (pf->datasize & 0x0000000F) {
        if (pf.datasize % 16 !== 0) {
            // C: Reporterror("Encrypted data is not aligned");
            Reporterror("Encrypted data is not 16-byte aligned.");
            // C: return -1;
            return -1;
        }

        // C: if (Getpassword()!=0) { ... return -1; }
        // TODO: This should be a proper async UI modal
        const password = prompt("Enter encryption password:");
        if (!password) {
            Reporterror("Cancelling decryption.");
            return -1;
        }

        // C: n=strlen(pb_password);
        // C: salt=(uchar *)(pf->name)+32; // hack
        const salt = pf.name.subarray(32, 32 + 16);
        // C: derive_key((const uchar *)pb_password, n, salt, 16, 524288, key, AESKEYLEN);
        const key = await deriveKey(password, salt); // Assumes deriveKey matches C params

        // C: memcpy(iv, salt+16, 16); // the second 16-byte block
        const iv = pf.name.subarray(48, 48 + 16);

        let decryptedData;
        try {
            // C: if(aes_cbc_decrypt(pf->data,tempdata,pf->datasize,iv,ctx) == EXIT_FAILURE) {
            decryptedData = await decryptAES(processedData, key, iv);
        } catch (e) {
            // C: Reporterror("Failed to decrypt data");
            Reporterror(`Failed to decrypt data: ${e.message}`);
            // C: return -1;
            return -1;
        }

        // C: filecrc=Crc16(tempdata,pf->datasize);
        const filecrc = crc16(decryptedData.buffer, decryptedData.length);

        // C: if (filecrc!=pf->filecrc) {
        if (filecrc !== pf.filecrc) {
            // C: Reporterror("Invalid password, please try again");
            Reporterror("Invalid password or corrupted data, please try again.");
            // C: return -1;
            return -1;
        }

        // C: free (pf->data);
        // C: pf->data=tempdata;
        // In JS, we just re-assign the variable. The original pf.data
        // (which is a slice) will be garbage collected.
        processedData = decryptedData;
        // C: pf->mode&=~PBM_ENCRYPTED;
        pf.mode &= ~PBM_ENCRYPTED; // Mark as decrypted
        // C: };
    }

    // C: // If data is compressed, unpack it to temporary buffer.
    // C: if ((pf->mode & PBM_COMPRESSED)==0) {
    if ((pf.mode & PBM_COMPRESSED) === 0) {
        // C: // Data is not compressed.
        // C: data=pf->data; length=pf->origsize;
        // No action needed, processedData is already correct.
    } else {
        // C: // Data is compressed.
        // C: bufout=(uchar *)malloc(pf->origsize);
        let decompressedData;
        try {
            // C: success=BZ2_bzBuffToBuffDecompress((char *)bufout,(uint *)&length,
            // C:     (char*)pf.data,pf->datasize,0,0);

            // JS PORT: Using pako.inflate (gzip) instead of bzip2
            decompressedData = pako.inflate(processedData);

            // C: if (success!=BZ_OK) {
        } catch (e) {
            // C: Reporterror("Unable to unpack data");
            Reporterror(`Unable to unpack data: ${e.message}`);
            // C: return -1; };
            return -1;
        }

        // C: data=bufout; };
        // Ensure the final data is exactly the original size
        processedData = decompressedData.subarray(0, pf.origsize);
    }

    // C: // Ask user for file name. (Handled by pf->name)

    // C: // Open file and save data.
    // C: hfile = fopen (pb_outfile, "wb");
    // In JS, we trigger a browser download.
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'restored.dat';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        // C: Reporterror("Unable to create file");
        Reporterror(`Unable to save file: ${e.message}`);
        // C: return -1;
        return -1;
    }

    // C: // Restore old modification date and time.
    // (This part is not possible in a browser and is omitted)

    // C: // Close file descriptor and report success.
    // C: Closefproc(slot);
    closeFproc(slot);
    // C: Message("File saved",0);
    Message("File saved", 0);
    // C: return 0;
    return 0;
    // C: };
}