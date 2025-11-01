/**
 * @fileoverview
 * Port of the `Freeprocdata` function from `Decoder.c`.
 * This function "frees" all large buffers allocated on the pdata object
 * by setting them to null, allowing the JavaScript garbage collector
 * to reclaim the memory.
 */

/**
 * @typedef {import('./getAngle.js').PData} PData
 */

/**
 * Frees resources allocated by pdata by setting buffer references to null.
 *
 * Corresponds to `Freeprocdata` in `Decoder.c`.
 *
 * @param {PData} pdata - The processing data object to clean.
 */
export function freeProcData(pdata) {
    // C: // Free data.
    // C: if (pdata->data!=NULL) {
    // C:   free(pdata->data);
    // C:   pdata->data=NULL; };
    if (pdata.data) {
        pdata.data = null;
    }

    // C: // Free allocated buffers.
    // C: if (pdata->buf1!=NULL) {
    // C:   free(pdata->buf1);
    // C:   pdata->buf1=NULL; };
    if (pdata.buf1) {
        pdata.buf1 = null;
    }

    // C: if (pdata->buf2!=NULL) {
    // C:   free(pdata->buf2);
    // C:   pdata->buf2=NULL; };
    if (pdata.buf2) {
        pdata.buf2 = null;
    }

    // C: if (pdata->bufx!=NULL) {
    // C:   free(pdata->bufx);
    // C:   pdata->bufx=NULL; };
    if (pdata.bufx) {
        pdata.bufx = null;
    }

    // C: if (pdata->bufy!=NULL) {
    // C:   free(pdata->bufy);
    // C:   pdata->bufy=NULL; };
    if (pdata.bufy) {
        pdata.bufy = null;
    }

    // C: if (pdata->blocklist!=NULL) {
    // C:   free(pdata->blocklist);
    // C:   pdata->blocklist=NULL;
    // C: };
    if (pdata.blocklist) {
        pdata.blocklist = null;
    }
    // C: };
}