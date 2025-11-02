/**
 * @fileoverview
 * Port of the `Nextdataprocessingstep` function from `Decoder.c`.
 * This function acts as the main state machine for the decoding process.
 * It is called repeatedly, and based on the `pdata.step` value, it
 * executes the next part of the decoding pipeline.
 */

import { Message } from '../../logging/log.js';
import { getGridPosition } from './getGridPosition.js';
import { getGridIntensity } from './getGridIntensity.js';
// We assume getAngle.js will export both getXAngle and getYAngle
import { getXAngle, getYAngle } from './getAngle.js';
// We assume this file will be created from the C 'Preparefordecoding' function
import { prepareForDecoding } from './prepareForDecoding.js';
// This is the function we created in the previous step
import { decodeNextBlock } from './decodeNextBlock.js';
// We assume this file will be created from the C 'Finishdecoding' function
import { finishDecoding } from './finishDecoding.js';

/**
 * @typedef {import('./getAngle.js').PData} PData
 */

/**
 * Executes the next step in the bitmap decoding state machine.
 * This function modifies the pdata object in-place, advancing pdata.step.
 * Corresponds to `Nextdataprocessingstep` in `Decoder.c`.
 *
 * @param {PData} pdata - The processing data object for the current decoding operation.
 * @returns {Promise<object|null>} A promise that resolves to { blob, filename } if the file
 * is complete, or null otherwise.
 */
export async function nextDataProcessingStep(pdata) {
    // C: if (pdata==NULL) return;
    if (!pdata) {
        return null;
    }

    // C: switch (pdata->step) {
    switch (pdata.step) {
        // C: case 0:
        case 0: // Idle data
            // C: return;
            return null;

        // C: case 1:
        case 1: // Remove previous images (JS: setup)
            // C: //SetWindowPos(hwmain,HWND_TOP,0,0,0,0,
            // C: //  SWP_NOMOVE|SWP_NOSIZE|SWP_SHOWWINDOW);
            // C: //Initqualitymap(0,0);
            // C: //Displayblockimage(NULL,0,0,0,NULL);
            // C: pdata->step++;
            pdata.step++;
            // C: break;
            break;

        // C: case 2:
        case 2: // Determine grid size
            // C: Message("Searching for raster...", 0);
            Message("Searching for raster...", 0);
            // C: Getgridposition(pdata);
            getGridPosition(pdata);
            // C: break;
            break;

        // C: case 3:
        case 3: // Determine min and max intensity
            // C: Getgridintensity(pdata);
            getGridIntensity(pdata);
            // C: break;
            break;

        // C: case 4:
        case 4: // Determine step and angle in X
            // C: Message("Searching for grid lines...", 0);
            Message("Searching for grid lines...", 0);
            // C: Getxangle(pdata);
            getXAngle(pdata);
            // C: break;
            break;

        // C: case 5:
        case 5: // Determine step and angle in Y
            // C: Getyangle(pdata);
            getYAngle(pdata);
            // C: break;
            break;

        // C: case 6:
        case 6: // Prepare for data decoding
            // C: Message("Decoding", 0);
            Message("Decoding", 0);
            // C: Preparefordecoding(pdata);
            prepareForDecoding(pdata);
            // C: break;
            break;

        // C: case 7:
        case 7: // Decode next block of data
            // C: Decodenextblock(pdata);
            // This function modifies pdata in-place and advances
            // pdata.step from 7 to 8 if all blocks are done.
            // It also returns { pdata, percent } which we can
            // capture here if needed for the UI.
            decodeNextBlock(pdata);
            // C: break;
            break;

        // C: case 8:
        case 8: // Finish data decoding
            // C: Finishdecoding(pdata);
            // We await this now, as it returns a promise with the final result
            return await finishDecoding(pdata);
        // C: break;

        // C: default: break;
        default: // Internal error
            break;
    }
    // C: //if (pdata->step==0) Updatebuttons();

    return null; // No result yet, state machine is still running
}