/**
 * @fileoverview
 * Port of the `Closefproc` function from `Fileproc.c`.
 * This function clears a file processing slot and "frees" its
 * large associated buffers by setting them to null.
 */

import {NFILE} from '../primitives/constants.js';


/**
 * Clears a file processor slot and frees its large buffers.
 * Corresponds to `Closefproc` in `Fileproc.c`.
 *
 * @param {number} slot - The index of the file slot to close.
 */
export function closeFproc(slot) {
    // C: if (slot<0 || slot>=NFILE)
    // C:   return;                            // Error in input data
    // We also check if the slot is already null
    if (slot < 0 || slot >= NFILE || !pb_fproc[slot]) {
        return;
    }

    // C: if (pb_fproc[slot].datavalid!=NULL)
    // C:   free(pb_fproc[slot].datavalid);
    // Setting to null allows the garbage collector to reclaim the memory.
    pb_fproc[slot].datavalid = null;

    // C: if (pb_fproc[slot].data!=NULL)
    // C:   free(pb_fproc[slot].data);
    pb_fproc[slot].data = null;

    // C: memset(pb_fproc+slot,0,sizeof(t_fproc));
    // Setting the slot to null effectively "zeros" it and frees the slot.
    pb_fproc[slot] = null;

    // C: //Updatefileinfo(slot,pb_fproc+slot); //GUI
    // (UI update logic would be handled separately)

    // C: };
}