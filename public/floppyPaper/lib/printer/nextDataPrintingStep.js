/**
 * @file nextDataPrintingStep.js
 * @overview
 * Implements the core state machine for the encoding pipeline. This function
 * orchestrates the entire process by calling individual asynchronous and
 * synchronous state handlers based on the current step number.
 *
 * C Reference:
 * - Function: Nextdataprintingstep (in Printer.c)
 */
import { Message } from '../logging/log.js';

// --- Import All Ported State Handlers ---
import { prepareFileToPrint } from './prepareFileToPrint.js';
// OBSOLETE IMPORTS (prepareCompressor, readAndCompress, finishCompression) have been removed.
import { encryptData } from './encryptData.js';
import { initializePrinting } from './initializePrinting.js';
import { printNextPage } from './printNextPage.js';
import { stopPrinting } from './stopPrinting.js';

/**
 * Executes the next step in the encoding state machine.
 * @param {EncoderState} encoderState - The state descriptor for the current print job (t_printdata).
 * @param {GlobalState} [globalState] - Global configuration settings (required for Steps 1, 6).
 * @param {File} [inputFile] - The input File object (required for Step 1).
 * @param {string} [password] - The password string (required for Step 5).
 * @returns {Promise<void>}
 * @see C_EQUIVALENT: Nextdataprintingstep(t_printdata *print)
 */
export async function nextDataPrintingStep(encoderState, globalState, inputFile, password) {
    switch (encoderState.step) {
        case 0:
            // Printer idle
            return;

        case 1:
            // State 1: Open file, perform atomic compression, calculate CRC, and align buffer.
            if (!globalState || !inputFile) {
                throw new Error("Missing GlobalState or inputFile object for Step 1 initialization.");
            }
            await prepareFileToPrint(globalState, encoderState, inputFile, Date.now());
            // Execution advances directly to case 5 via prepareFileToPrint.step = 5.
            break;

        // OBSOLETE STATES 2, 3, and 4 REMOVED.

        case 5:
            // State 5: Encrypt data (Async Crypto)
            await encryptData(encoderState, password);
            break;

        case 6:
            // State 6: Initialize printing (Geometry calculation)
            if (!globalState) {
                throw new Error("Missing GlobalState for Step 6 initialization.");
            }
            initializePrinting(encoderState, globalState);
            break;

        case 7:
            // State 7: Print pages, one at a time
            printNextPage(encoderState);
            break;

        case 8:
            // State 8: Finish printing.
            stopPrinting(encoderState);
            Message("", 0);
            encoderState.step = 0; // Set state to idle
            break;

        default:
            // Internal error
            console.error(`EncoderState entered invalid step: ${encoderState.step}`);
            break;
    }
}