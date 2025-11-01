/**
 * @fileoverview
 * Port of the data recovery loop from the `Finishpage` function in `Fileproc.c`.
 * This file handles the XOR logic for recovering missing data blocks using
 * the corresponding recovery blocks.
 */


import {NDATA} from '../include/paperbak/constants.js';


/**
 * Attempts to restore bad blocks using available recovery blocks (XOR redundancy).
 * This logic is extracted directly from the `Finishpage` function in `Fileproc.c`.
 *
 * @param {t_fproc} pf - The file processor object to work on.
 * @returns {number} The number of blocks successfully recovered.
 */
export function recoverData(pf) {
    // C: int i,j,r,rmin,rmax,nrec,irec,firstblock,nrempages;
    // C: uchar *pr,*pd;
    let recoveredBlocks = 0;

    // C: if (pf->ngroup>0) {
    if (pf.ngroup > 0) {
        // C: rmin=(pf->minpageaddr/(NDATA*pf->ngroup))*pf->ngroup;
        const rmin = Math.floor(pf.minpageaddr / (NDATA * pf.ngroup)) * pf.ngroup;
        // C: rmax=(pf->maxpageaddr/(NDATA*pf->ngroup))*pf->ngroup;
        const rmax = Math.floor(pf.maxpageaddr / (NDATA * pf.ngroup)) * pf.ngroup;

        // C: // Walk groups of data on current page, one by one.
        // C: for (r=rmin; r<=rmax; r+=pf->ngroup) {
        for (let r = rmin; r <= rmax; r += pf.ngroup) {
            // C: if (r+pf->ngroup>pf->nblock)
            // C:   break;                         // Inconsistent data
            if (r + pf.ngroup > pf.nblock) {
                break;
            }

            // C: // Count blocks with recovery data in the group.
            // C: nrec=0;
            let nrec = 0;
            let irec = -1; // C: irec
            // C: for (i=r; i<r+pf->ngroup; i++) {
            for (let i = r; i < r + pf.ngroup; i++) {
                // C: if (pf->datavalid[i]==2) {
                if (pf.datavalid[i] === 2) { // 2 = recovery data available
                    // C: nrec++; irec=i;
                    nrec++;
                    irec = i;
                    // C: pf->datavalid[i]=0;          // Prepare for next round
                    // This is a key part of the C logic:
                    // The slot is marked as 'missing' (0) before recovery.
                    pf.datavalid[i] = 0;
                }
                // C: };
            }

            // C: if (nrec==1) {
            if (nrec === 1) {
                // C: // Exactly one block in group is missing, recovery is possible.
                // We will recover the data *into* the slot `irec`.

                // C: pr=pf->data+irec*NDATA;
                // Create a view for the recovery block's data
                const recoveryBufferView = new Uint8Array(pf.data.buffer, irec * NDATA, NDATA);

                // C: // Invert recovery data.
                // C: for (j=0; j<NDATA; j++) *pr++^=0xFF;
                for (let j = 0; j < NDATA; j++) {
                    recoveryBufferView[j] ^= 0xFF;
                }

                // C: // XOR recovery data with good data blocks.
                // C: for (i=r; i<r+pf->ngroup; i++) {
                for (let i = r; i < r + pf.ngroup; i++) {
                    // C: if (i==irec) continue;
                    if (i === irec) continue; // Don't XOR with self

                    // C: pr=pf->data+irec*NDATA;
                    // C: pd=pf->data+i*NDATA;
                    const dataBufferView = new Uint8Array(pf.data.buffer, i * NDATA, NDATA);

                    // C: for (j=0; j<NDATA; j++) {
                    // C:   *pr++^=*pd++;
                    // C: };
                    for (let j = 0; j < NDATA; j++) {
                        recoveryBufferView[j] ^= dataBufferView[j];
                    }
                }
                // C: };

                // C: pf->datavalid[irec]=1;
                pf.datavalid[irec] = 1; // Mark as valid data
                // C: pf->recoveredblocks++; (handled in finishPage.js)
                recoveredBlocks++;
                // C: pf->ndata++; (handled in finishPage.js)
            }
            // C: };
        }
    }
    // C: };

    return recoveredBlocks;
}