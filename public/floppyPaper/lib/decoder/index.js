/**
 * @fileoverview
 * This is the main public API for the decoder module.
 * It manages the decoder's state (`pdata`) and runs the decoding
 * state machine by calling the refactored, single-function modules.
 * This replaces the old monolithic Decoder class.
 */

import { createPData } from '../include/paperbak/createPData.js';
import { startBitmapDecoding, stopBitmapDecoding } from './src/startBitmapDecoding.js';
import { nextDataProcessingStep } from './src/nextDataProcessingStep.js';

// --- Decoder State ---

/**
 * The persistent state of the decoder.
 * C: static t_procdata pb_procdata;
 * @type {import('./src/getAngle.js').PData | null}
 */
let pdata = null;

// --- Public API ---

/**
 * Initializes the decoder with a new bitmap.
 * This MUST be called before getNextStep().
 *
 * @param {Uint8Array} grayscaleData - The 8-bit grayscale bitmap data.
 * @param {number} width - The width of the bitmap.
 * @param {number} height - The height of the bitmap.
 * @param {object} [options={}] - Configuration options.
 * @param {boolean} [options.bestquality=false] - Corresponds to pb_bestquality.
 */
export function initializeDecoder(grayscaleData, width, height, options = {}) {
    // Ensure pdata is a fresh object for this run
    pdata = createPData();

    const pb_bestquality = options.bestquality || false;

    // C: Startbitmapdecoding(&pb_procdata, data, sizex, sizey);
    startBitmapDecoding(pdata, grayscaleData, width, height, pb_bestquality);
}

/**
 * Executes one step of the decoding state machine.
 * Call this function repeatedly until it returns a `percent` of 100 or `step` is 0.
 *
 * @returns {{step: number, percent: number, message: string}}
 * - `step`: The current step number (0 = idle/complete).
 * - `percent`: A progress estimate (0-100).
 * - `message`: A status message for the UI.
 */
export function getNextStep() {
    if (!pdata || pdata.step === 0) {
        return { step: 0, percent: 100, message: "Complete" };
    }

    // C: Nextdataprocessingstep(pdata);
    // This function runs one step of the switch statement (e.g., getGridPosition)
    // and modifies pdata in-place, advancing pdata.step.
    nextDataProcessingStep(pdata);

    let percent = 0;
    if (pdata.step === 7 && pdata.nposx > 0 && pdata.nposy > 0) {
        // We are in the 'Decode next block' step (step 7)
        // C: percent=(pdata->posy*pdata->nposx+pdata->posx)*100/
        // C:   (pdata->nposx*pdata->nposy);
        percent = Math.floor(
            ((pdata.posy * pdata.nposx + pdata.posx) * 100) / (pdata.nposx * pdata.nposy)
        );
    } else if (pdata.step === 0) {
        // Step 8 (finishDecoding) sets step to 0 when done.
        percent = 100;
    }

    return {
        step: pdata.step,
        percent: percent,
        message: `Processing step ${pdata.step}...`
    };
}

/**
 * Stops the decoding process.
 * C: Stopbitmapdecoding(pdata);
 */
export function stopDecoder() {
    if (pdata) {
        stopBitmapDecoding(pdata);
    }
}