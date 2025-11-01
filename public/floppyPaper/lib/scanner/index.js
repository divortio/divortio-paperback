/**
 * @fileoverview
 * This is the main public API for the scanner module.
 * It replaces the old worker-based file. Its job is to:
 * 1. Receive a File object from the main application.
 * 2. Read the file into an ArrayBuffer.
 * 3. Call the ported `decodeBitmap` (from Scanner.c) to parse the BMP
 * and kick off the decoding pipeline.
 * 4. Return an async generator that the main app can loop over to
 * get progress updates.
 */

import { pb } from '../include/paperbak/index.js';
import { Reporterror } from '../logging/log.js';
// This is the actual C port from Scanner.c
import { decodeBitmap } from './decodeBitmap.js';
// These are the main controls for the decoder state machine
import { getNextStep, stopDecoder } from '../decoder/index.js';

/**
 * Reads a File object into an ArrayBuffer.
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Creates a decoder instance that can be run.
 * This is the main entry point for the scanner module, replacing the
 * old `decodeBitmap` that used a worker.
 *
 * @param {File} file - The BMP file to decode.
 * @param {object} options - The options object (e.g., pb.bestquality).
 * @returns {Promise<object | null>} A decoder instance with a `run()` generator, or null on error.
 */
export async function decodeBitmapFile(file, options) {
    try {
        // 1. Read the file into memory
        const buffer = await readFileAsArrayBuffer(file);

        // 2. Call the C port of `Decodebitmap`
        // We pass the global pb settings and options
        const pb_bestquality = options.bestquality || pb.bestquality;

        // This function will:
        //  a) Parse the BMP headers
        //  b) Call `processDIB` to create the grayscale buffer
        //  c) Call `initializeDecoder` which creates the `pdata` state
        //     inside the `decoder/index.js` module.
        const result = decodeBitmap(buffer, pb_bestquality);

        if (result === -1) {
            // Error was already reported by decodeBitmap/processDIB
            return null;
        }

        // 3. Return an object with a `run` generator.
        // This is the correct syntax for returning an async generator.
        return {
            async * run() {
                let stepResult;
                do {
                    // 4. Call the decoder's state machine step-by-step
                    stepResult = getNextStep();
                    yield stepResult;
                } while (stepResult.step !== 0); // Loop until step is 0 (complete)
            }
        };

    } catch (e) {
        Reporterror(e.message);
        stopDecoder(); // Ensure the decoder state is reset on error
        return null;
    }
}