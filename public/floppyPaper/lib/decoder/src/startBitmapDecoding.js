/**
 * @fileoverview
 * Port of `Startbitmapdecoding` and `Stopbitmapdecoding` from `Decoder.c`.
 * These functions control the lifecycle of the decoding process.
 */

import { M_BEST } from '../../include/paperbak/constants.js';
// We need freeProcData to clear any previous run's buffers,
// just like the C code.
import { freeProcData } from './freeProcData.js';

/**
 * @typedef {import('./getAngle.js').PData} PData
 */

/**
 * Starts decoding of the new bitmap.
 * This function resets the pdata object and initializes it with the
 * new bitmap data, dimensions, and initial state.
 *
 * Corresponds to `Startbitmapdecoding` in `Decoder.c`.
 *
 * @param {PData} pdata - The processing data object to initialize/reset.
 * @param {Uint8Array} data - The 8-bit grayscale bitmap data.
 * @param {number} sizex - The width of the bitmap.
 * @param {number} sizey - The height of the bitmap.
 * @param {boolean} pb_bestquality - Global flag to enable best quality mode.
 */
export function startBitmapDecoding(pdata, data, sizex, sizey, pb_bestquality) {
    // C: // Free resources allocated for the previous bitmap. User may want to
    // C: // browse bitmap while and after it is processed.
    // C: Freeprocdata(pdata);
    freeProcData(pdata);

    // C: memset(pdata,0,sizeof(t_procdata));
    // In JS, we must reset the fields manually. `createPData` should
    // be used by the caller, but here we explicitly clear/reset.

    // C: pdata->data=data;
    pdata.data = data;
    // C: pdata->sizex=sizex;
    pdata.sizex = sizex;
    // C: pdata->sizey=sizey;
    pdata.sizey = sizey;
    // C: pdata->blockborder=0.0;       // Autoselect
    pdata.blockborder = 0.0;
    // C: pdata->step=1;
    pdata.step = 1;

    // Reset other fields that memset would have zeroed
    pdata.mode = 0;
    pdata.ngood = 0;
    pdata.nbad = 0;
    pdata.nsuper = 0;
    pdata.nrestored = 0;
    pdata.orientation = -1;

    // C: if (pb_bestquality)
    // C:   pdata->mode|=M_BEST;
    if (pb_bestquality) {
        pdata.mode |= M_BEST;
    }

    // C: //Updatebuttons();
}

/**
 * Stops the bitmap decoding state machine.
 * Data decoded so far is *not* discarded from pdata, but the
 * processing loop will stop.
 *
 * Corresponds to `Stopbitmapdecoding` in `Decoder.c`.
 *
 * @param {PData} pdata - The processing data object.
 */
export function stopBitmapDecoding(pdata) {
    // C: if (pdata->step!=0) {
    if (pdata.step !== 0) {
        // C: pdata->step=0;
        pdata.step = 0;
    }
    // C: };
}