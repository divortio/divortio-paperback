import { pb } from '../primitives/pb.js';
import { createPData } from '../primitives/createPData.js';
import { Reporterror } from '../logging/log.js';
import { printFile } from '../printer/print.js';
import { decodeBitmap } from '../scanner/decodeBitmap.js';
import { nextDataProcessingStep } from '../decoder/src/nextDataProcessingStep.js';

/**
 * @fileoverview
 * Main entry point for the FloppyPaper library.
 * This file exports the primary `encode` and `decode` functions.
 * It's responsible for orchestrating the printer and scanner pipelines.
 */

// =====================================================================================
// ENCODING
// =====================================================================================

/**
 * Creates and runs the print (encoding) pipeline.
 * This function is a generator that yields status updates.
 *
 * @param {File} file - The file object to encode.
 * @param {object} options - The encoding options.
 * @yields {object} A status object { message, percent }.
 */
export async function* encode(file, options) {
    // applyOptions(options); // TODO: Re-integrate options
    const printer = printFile(file, options);

    // The print.js state machine is also a generator.
    // We yield* to pass its updates directly to the caller (UI).
    yield* printer;
}

// =====================================================================================
// DECODING
// =====================================================================================

/**
 * Decodes a bitmap file.
 * @param {ArrayBuffer} arrayBuffer - The ArrayBuffer of the bitmap file.
 * @param {string} [password] - The password, if one is required for decryption.
 * @returns {Promise<object|null>} A promise that resolves to { blob, filename } if the file
 * is complete, or null otherwise.
 */
export async function decode(arrayBuffer, password) {
    // Ensure the processing data object is re-initialized for a new file.
    // This would typically be part of a larger "session" management.
    // For a single file decode, we just use the global.

    // Set the password on the global state so fileSaver can access it
    // Note: pb.password is correct as it's in pb.js
    pb.password = password;

    // Create a new decoder state object for this decoding session
    const pb_procdata = createPData();

    // `decodeBitmap` reads the ArrayBuffer and calls `startBitmapDecoding`
    try {
        // Pass the new state object to the bitmap decoder
        decodeBitmap(arrayBuffer, pb_procdata);
    } catch (e) {
        Reporterror(e.message);
        return null;
    }

    let result = null;
    // C: while (pb_procdata.step!=0) {
    while (pb_procdata.step !== 0) {
        result = await nextDataProcessingStep(pb_procdata);
        // If the step returned a result, the file is done.
        if (result) {
            break;
        }
    }

    return result; // This will be { blob, filename } or null
}