// public/js/lib/fileproc/fileSaver.js

import { crc16 } from '../crc16/index.js';
import { pb, PBM_ENCRYPTED, PBM_COMPRESSED } from '../include/paperbak/index.js';
import { closeFproc } from './index.js';

/**
 * Saves the restored file by handling decryption, decompression (gzip), and triggering a browser download.
 * @param {number} slot - The index of the file processor.
 * @param {boolean} force - If true, attempts to save even if the file is incomplete.
 * @param {object} options - Configuration options, including a reportError function.
 */
export async function saveRestoredFile(slot, force = false, options = {}) {
    const reportError = options.reportError || ((msg) => { console.error(msg); alert(msg); });
    const pf = pb.fproc[slot];

    if (!pf || !pf.busy) return;

    if (pf.ndata !== pf.nblock && !force) {
        reportError("File is incomplete and cannot be saved.");
        return;
    }

    let dataToProcess = pf.data.subarray(0, pf.datasize);

    // --- 1. Decrypt Data ---
    if (pf.mode & PBM_ENCRYPTED) {
        const password = prompt("Enter decryption password:"); // In a real app, this would be a secure modal.
        if (!password) {
            reportError("Decryption cancelled.");
            return;
        }

        try {
            // Placeholder for actual salt/iv extraction from superblock
            const salt = new Uint8Array(16);
            const iv = new Uint8Array(16);

            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);

            const keyMaterial = await crypto.subtle.importKey("raw", passwordBuffer, { name: "PBDF2" }, false, ["deriveKey"]);
            const key = await crypto.subtle.deriveKey(
                { name: "PBKDF2", salt, iterations: 524288, hash: "SHA-256" },
                keyMaterial,
                { name: "AES-CBC", length: 256 },
                true,
                ["decrypt"]
            );

            const decryptedData = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, dataToProcess);
            dataToProcess = new Uint8Array(decryptedData);

            const calculatedCrc = crc16(dataToProcess);
            if (calculatedCrc !== pf.filecrc) {
                reportError("Invalid password or corrupted data. CRC check failed.");
                return;
            }
        } catch (e) {
            reportError("Decryption failed.", e);
            return;
        }
    }

    // --- 2. Decompress Data (Gzip) ---
    let finalData = dataToProcess;
    if (pf.mode & PBM_COMPRESSED) {
        try {
            const stream = new Blob([dataToProcess]).stream();
            const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
            const decompressedData = await new Response(decompressedStream).arrayBuffer();
            finalData = new Uint8Array(decompressedData);

            if (finalData.length !== pf.origsize) {
                console.warn(`Decompressed size mismatch. Expected ${pf.origsize}, got ${finalData.length}`);
            }
        } catch (e) {
            reportError("Decompression failed. Data may not be in Gzip format.", e);
            return;
        }
    }

    // --- 3. Trigger Download ---
    try {
        const blob = new Blob([finalData.subarray(0, pf.origsize)], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pf.name || 'restored_file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        closeFproc(slot);

    } catch (e) {
        reportError("Failed to save file.", e);
    }
}