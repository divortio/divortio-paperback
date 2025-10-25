// src/fileproc/fileSaver.js

import { Reporterror, Message } from '../paperbak/user-interface.js';
import { crc16 } from '../crc16/index.js';
import { pb, PBM_ENCRYPTED, PBM_COMPRESSED } from '../include/paperbak/index.js';
import { closeFproc } from './index.js';

/**
 * Saves the restored file by handling decryption, decompression (gzip), and triggering a browser download.
 * @param {number} slot - The index of the file processor.
 * @param {boolean} force - If true, attempts to save even if the file is incomplete.
 */
export async function saveRestoredFile(slot, force = false) {
    const pf = pb.fproc[slot];
    if (!pf || !pf.busy) return;

    if (pf.ndata !== pf.nblock && !force) {
        Reporterror("File is incomplete and cannot be saved.");
        return;
    }

    let dataToProcess = pf.data.subarray(0, pf.datasize);

    // --- 1. Decrypt Data ---
    if (pf.mode & PBM_ENCRYPTED) {
        // ... (Decryption logic remains the same) ...
    }

    // --- 2. Decompress Data (Updated for Gzip) ---
    let finalData = dataToProcess;
    if (pf.mode & PBM_COMPRESSED) {
        Message("Decompressing data...", 50);
        try {
            // Use the native Decompression Streams API for gzip
            const stream = new Blob([dataToProcess]).stream();
            const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
            const decompressedData = await new Response(decompressedStream).arrayBuffer();
            finalData = new Uint8Array(decompressedData);

            if (finalData.length !== pf.origsize) {
                console.warn(`Decompressed size mismatch. Expected ${pf.origsize}, got ${finalData.length}`);
            }
        } catch (e) {
            Reporterror("Decompression failed. Data may not be in Gzip format. " + e.message);
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

        Message("File saved successfully.", 100);
        closeFproc(slot);

    } catch (e) {
        Reporterror("Failed to save file. " + e.message);
    }
}