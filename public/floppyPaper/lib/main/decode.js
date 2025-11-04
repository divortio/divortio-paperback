import { scanFile } from '../scanner/scanner.js';

/**
 * @fileoverview
 * Main entry point for the FloppyPaper decoding (scanning) pipeline.
 * This file exports the primary `decode` function.
 * It mirrors the structure of encode.js.
 */

// =====================================================================================
// DECODING
// =====================================================================================

/**
 * Creates and runs the scan (decoding) pipeline.
 * This function is a generator that yields status updates.
 *
 * @param {ArrayBuffer} arrayBuffer - The ArrayBuffer of the bitmap file.
 * @param {object} options - The decoding options (e.g., password, bestquality).
 * @yields {object} A status object { status, percent, blob, filename, error }.
 */
export async function* decode(arrayBuffer, options) {
    // C: Decodebitmap(pb_infile,&pb_procdata);
    // C: while (pb_procdata.step!=0) Nextdataprocessingstep(&pb_procdata);

    // 1. Create a new Scanner instance using the factory function.
    // This replaces the old logic of calling decodeBitmap and nextDataProcessingStep
    // from main/index.js.
    const scanner = scanFile(arrayBuffer, options);

    // 2. The scanner's .run() method is the async generator state machine.
    // We yield* to pass its updates (status, percent, final file)
    // directly to the caller (the UI).
    yield* scanner.run();
}