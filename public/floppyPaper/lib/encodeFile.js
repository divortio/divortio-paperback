/**
 * @file encodeFile.js
 * @overview
 * Implements the high-level, asynchronous encoding function that drives the entire
 * print pipeline. This function mirrors the "while (pb_printdata.step != 0)" loop
 * found in the C main.c and orchestrates the state machine execution.
 *
 * This function returns a Promise that resolves when the encoding is complete (step 0).
 */
import { printFile } from './printer/printFile.js';
import { nextDataPrintingStep } from './printer/nextDataPrintingStep.js';
import { EncoderState } from './classes/encoderState.js';
import { GlobalState } from './classes/globalState.js';
import { NodeFile } from './classes/nodeFile.js';

/**
 * Executes the full encoding pipeline, converting the input file into one or more
 * BMP files stored in the EncoderState.outputFiles array.
 * @param {GlobalState} globalState - Global configuration settings (e.g., DPI, redundancy).
 * @param {EncoderState} encoderState - The mutable state object for the job.
 * @param {File|NodeFile} inputFile - The input File object to be encoded.
 * @param {string} outputBmpFile - The desired base name for the output bitmap files (e.g., 'backup.bmp').
 * @param {string} [password=''] - The encryption passphrase, if needed.
 * @returns {Promise<Array<BMPData>>} A promise that resolves with the array of generated BMP file data objects.
 */
export async function encodeFile(globalState, encoderState, inputFile, outputBmpFile, password = '') {

    // 1. Initialize the process (C: Printfile)
    // This sets encoderState.step = 1.
    printFile(globalState, encoderState, inputFile, outputBmpFile);

    // 2. Main State Machine Execution Loop (C: while (pb_printdata.step != 0))
    while (encoderState.step !== 0) {
        // nextDataPrintingStep is asynchronous because Step 1 (file read) and
        // Step 5 (encryption) require async operations.

        // Pass all necessary external parameters on each iteration,
        // allowing the state handler to use them as needed.
        await nextDataPrintingStep(encoderState, globalState, inputFile, password);

        // Fail-safe to prevent infinite loop if a state handler fails to advance step or call stopPrinting.
        if (encoderState.step === 0 && encoderState.outputFiles.length === 0) {
            // If the process stopped prematurely and produced no files, ensure an error message was logged.
            console.warn("Encoding loop terminated early with no output files.");
            break;
        }
    }

    // 3. Return the generated output files upon completion.
    return encoderState.outputFiles;
}