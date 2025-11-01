/**
 * @fileoverview
 * Port of the `Finishdecoding` function from `Decoder.c`.
 * This is the final step (step 8) of the decoding state machine.
 * It passes the collected data to the file processor to be reassembled.
 */

import { Reporterror } from '../../logging/log.js';
import {startNextPage} from '../../fileproc/startNextPage.js';
import {addBlock} from '../../fileproc/addBlock.js';
import {finishPage} from '../../fileproc/finishPage.js';

/**
 * @typedef {import('./getAngle.js').PData} PData
 */

/**
 * Passes all gathered data from the pdata object to the file
 * processor for reassembly and finalization. Sets pdata.step to 0.
 *
 * Corresponds to `Finishdecoding` in `Decoder.c`.
 *
 * @param {PData} pdata - The processing data object containing all decoded blocks.
 */
export function finishDecoding(pdata) {
    // C: int i,fileindex;

    // C: // Pass gathered data to file processor.
    // C: if (pdata->superblock.addr==0)
    // The superblock.addr is initialized to 0. It's only set to SUPERBLOCK
    // if one is successfully read. This check is valid.
    if (pdata.superblock.addr === 0) {
        // C: Reporterror("Page label is not readable");
        Reporterror("Page label is not readable");
    } else {
        // C: fileindex=Startnextpage(&pdata->superblock);
        // We pass the superblock object by reference.
        const fileindex = startNextPage(pdata.superblock);

        // C: if (fileindex>=0) {
        if (fileindex >= 0) {
            // C: for (i=0; i<pdata->ngood; i++)
            for (let i = 0; i < pdata.ngood; i++) {
                // C: Addblock(pdata->blocklist+i,fileindex);
                // pdata.blocklist[i] is the JS equivalent of (pdata->blocklist + i)
                addBlock(pdata.blocklist[i], fileindex);
            }

            // C: Finishpage(fileindex,
            // C:   pdata->ngood+pdata->nsuper,pdata->nbad,pdata->nrestored);
            finishPage(fileindex,
                pdata.ngood + pdata.nsuper, pdata.nbad, pdata.nrestored);

            // C: ;
        }
        // C: };
    }

    // C: // Page processed.
    // C: pdata->step=0;
    pdata.step = 0;
    // C: };
}