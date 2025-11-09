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
import { prepareCompressor } from './prepareCompressor.js';
import { readAndCompress } from './readAndCompress.js';
import { finishCompression } from './finishCompression.js';
import { encryptData } from './encryptData.js';
import { initializePrinting } from './initializePrinting.js';
import { printNextPage } from './printNextPage.js';
import { stopPrinting } from './stopPrinting.js';

/**
 * Executes the next step in the encoding state machine.
 * @param {EncoderState} encoderState - The state descriptor for the current print job (t_printdata).
 * @param {GlobalState} [globalState] - Global configuration settings (required for Steps 1, 2, 6).
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
            // State 1: Open file and allocate buffers (Async I/O)
            if (!globalState || !inputFile) {
                throw new Error("Missing GlobalState or inputFile object for Step 1 initialization.");
            }
            // Date.now() is used as the modification time for simplicity.
            await prepareFileToPrint(globalState, encoderState, inputFile, Date.now());
            break;

        case 2:
            // State 2: Initialize compression engine
            if (!globalState) {
                throw new Error("Missing GlobalState for Step 2 initialization.");
            }
            prepareCompressor(encoderState); // Call site uses correct arguments (only encoderState)
            break;

        case 3:
            // State 3: Read next piece of data and compress
            readAndCompress(encoderState);
            break;

        case 4:
            // State 4: Finish compression and close file
            finishCompression(encoderState);
            break;

        case 5:
            // State 5: Encrypt data (Async Crypto)
            await encryptData(encoderState, password);
            break;

        case 6:
            // State 6: Initialize printing
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