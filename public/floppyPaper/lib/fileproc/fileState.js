/**
 * @fileoverview
 * Manages the shared state for the file processing (fileproc) module.
 * This holds the `pb_fproc` array, which is the JavaScript equivalent
 * of the C global `pb_fproc[NFILE]`.
 */


import {NFILE} from '../include/paperbak/constants.js';

/**
 * The array of in-progress file processing slots.
 * C: `t_fproc pb_fproc[NFILE];`
 * * This array is intentionally exported as a mutable `let` variable
 * to be shared across the fileproc modules, emulating the C global.
 * * @type {Array<t_fproc | null>}
 */
export let pb_fproc = new Array(NFILE).fill(null);
