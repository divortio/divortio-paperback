/**
 * @fileoverview
 * Port of the `Preparefordecoding` function from `Decoder.c`.
 * This function calculates the final grid parameters and allocates all
 * necessary buffers (as TypedArrays) on the pdata object before decoding starts.
 */

import { NDOT } from '../../primitives/constants.js';
import { max } from '../../primitives/utils.js';
import {  createSuperblock } from '../../primitives/createSuperBlock.js';
import {  createBlock } from '../../primitives/createBlock.js';
import { Reporterror } from '../../logging/log.js';

/**
 * @typedef {import('./getAngle.js').PData} PData
 */

/**
 * Prepares the pdata object for decoding by calculating final grid
 * dimensions, adjusting sharpness, and allocating all required memory buffers.
 *
 * Corresponds to `Preparefordecoding` in `Decoder.c`.
 *
 * @param {PData} pdata - The processing data object, modified in place.
 * @returns {void}
 */
export function prepareForDecoding(pdata) {
    // C: int sizex,sizey,dx,dy;
    // C: float xstep,ystep,border,sharpfactor,shift,maxxshift,maxyshift,dotsize;

    // C: // Get frequently used variables.
    // C: sizex=pdata->sizex;
    const sizex = pdata.sizex;
    // C: sizey=pdata->sizey;
    const sizey = pdata.sizey;
    // C: xstep=pdata->xstep;
    const xstep = pdata.xstep;
    // C: ystep=pdata->ystep;
    const ystep = pdata.ystep;
    // C: border=pdata->blockborder;
    let border = pdata.blockborder;
    // C: sharpfactor=pdata->sharpfactor;
    let sharpfactor = pdata.sharpfactor;

    // C: // Empirical formula: the larger the angle, the more imprecise is the
    // C: // expected position of the block.
    // C: if (border<=0.0) {
    if (border <= 0.0) {
        // C: border=max(fabs(pdata->xangle),fabs(pdata->yangle))*5.0+0.4;
        border = max(Math.abs(pdata.xangle), Math.abs(pdata.yangle)) * 5.0 + 0.4;
        // C: pdata->blockborder=border; };
        pdata.blockborder = border;
    }

    // C: // Correct sharpness for known dot size. This correction is empirical.
    // C: dotsize=max(xstep,ystep)/(NDOT+3.0);
    const dotsize = max(xstep, ystep) / (NDOT + 3.0);
    // C: sharpfactor+=1.3/dotsize-0.1;
    sharpfactor += 1.3 / dotsize - 0.1;
    // C: if (sharpfactor<0.0) sharpfactor=0.0;
    if (sharpfactor < 0.0) sharpfactor = 0.0;
    // C: else if (sharpfactor>2.0) sharpfactor=2.0;
    else if (sharpfactor > 2.0) sharpfactor = 2.0;
    // C: pdata->sharpfactor=sharpfactor;
    pdata.sharpfactor = sharpfactor;

    // C: // Calculate start coordinates and number of block that fit onto the page
    // C: // in X direction.
    // C: maxxshift=fabs(pdata->xangle*sizey);
    const maxxshift = Math.abs(pdata.xangle * sizey);
    // C: if (pdata->xangle<0.0) shift=0.0; else shift=maxxshift;
    const shiftx = (pdata.xangle < 0.0) ? 0.0 : maxxshift;
    // C: while (pdata->xpeak-xstep>-shift-xstep*border)
    // C:   pdata->xpeak-=xstep;
    while (pdata.xpeak - xstep > -shiftx - xstep * border) {
        pdata.xpeak -= xstep;
    }
    // C: pdata->nposx=(int)((sizex+maxxshift)/xstep);
    pdata.nposx = Math.floor((sizex + maxxshift) / xstep);

    // C: // The same in Y direction.
    // C: maxyshift=fabs(pdata->yangle*sizex);
    const maxyshift = Math.abs(pdata.yangle * sizex);
    // C: if (pdata->yangle<0.0) shift=0.0; else shift=maxyshift;
    const shifty = (pdata.yangle < 0.0) ? 0.0 : maxyshift;
    // C: while (pdata->ypeak-ystep>-shift-ystep*border)
    // C:   pdata->ypeak-=ystep;
    while (pdata.ypeak - ystep > -shifty - ystep * border) {
        pdata.ypeak -= ystep;
    }
    // C: pdata->nposy=(int)((sizey+maxyshift)/ystep);
    pdata.nposy = Math.floor((sizey + maxyshift) / ystep);

    // C: // Start new quality map. Note that this call doesn't force map to be
    // C: // displayed.
    // C: //Initqualitymap(pdata->nposx,pdata->nposy);

    // C: // Allocate block buffers.
    // C: dx=xstep*(2.0*border+1.0)+1.0;
    const dx = Math.floor(xstep * (2.0 * border + 1.0) + 1.0);
    // C: dy=ystep*(2.0*border+1.0)+1.0;
    const dy = Math.floor(ystep * (2.0 * border + 1.0) + 1.0);

    try {
        // C: pdata->buf1=(uchar *)malloc(dx*dy);
        pdata.buf1 = new Uint8Array(dx * dy);
        // C: pdata->buf2=(uchar *)malloc(dx*dy);
        pdata.buf2 = new Uint8Array(dx * dy);
        // C: pdata->bufx=(int *)malloc(dx*sizeof(int));
        pdata.bufx = new Int32Array(dx);
        // C: pdata->bufy=(int *)malloc(dy*sizeof(int));
        pdata.bufy = new Int32Array(dy);

        // C: pdata->blocklist=(t_block *)
        // C:   malloc(pdata->nposx*pdata->nposy*sizeof(t_block));
        // We create an array of t_block objects (as defined in paperbak/crc16.js)
        const blocklistLength = pdata.nposx * pdata.nposy;
        pdata.blocklist = Array.from({ length: blocklistLength }, () => createBlock());

        // C: // Check that we have enough memory.
        // C: if (pdata->buf1==NULL || pdata->buf2==NULL || ... )
    } catch (error) {
        // C: if (pdata->buf1!=NULL) free(pdata->buf1); (etc...)
        // JS garbage collector handles freeing, we just report the error.
        // C: Reporterror("Low memory");
        Reporterror("Low memory");
        // C: pdata->step=0;
        pdata.step = 0;
        // C: return; };
        return;
    }

    // C: // Determine maximal size of the dot on the bitmap.
    // C: if (xstep<2*(NDOT+3) || ystep<2*(NDOT+3))
    if (xstep < 2 * (NDOT + 3) || ystep < 2 * (NDOT + 3)) {
        // C: pdata->maxdotsize=1;
        pdata.maxdotsize = 1;
        // C: else if (xstep<3*(NDOT+3) || ystep<3*(NDOT+3))
    } else if (xstep < 3 * (NDOT + 3) || ystep < 3 * (NDOT + 3)) {
        // C: pdata->maxdotsize=2;
        pdata.maxdotsize = 2;
        // C: else if (xstep<4*(NDOT+3) || ystep<4*(NDOT+3))
    } else if (xstep < 4 * (NDOT + 3) || ystep < 4 * (NDOT + 3)) {
        // C: pdata->maxdotsize=3;
        pdata.maxdotsize = 3;
    } else {
        // C: pdata->maxdotsize=4;
        pdata.maxdotsize = 4;
    }

    // C: // Prepare superblock.
    // C: memset(&pdata->superblock,0,sizeof(t_superblock));
    // We re-initialize the superblock object to zero it out,
    // assuming createSuperblock() exists in paperbak/crc16.js
    pdata.superblock = createSuperblock();

    // C: // Initialize remaining items.
    // C: pdata->bufdx=dx;
    pdata.bufdx = dx;
    // C: pdata->bufdy=dy;
    pdata.bufdy = dy;
    // C: pdata->orientation=-1;
    pdata.orientation = -1; // As yet, unknown page orientation
    // C: pdata->ngood=0;
    pdata.ngood = 0;
    // C: pdata->nbad=0;
    pdata.nbad = 0;
    // C: pdata->nsuper=0;
    pdata.nsuper = 0;
    // C: pdata->nrestored=0;
    pdata.nrestored = 0;
    // C: pdata->posx=pdata->posy=0;
    pdata.posx = 0; // First block to scan
    pdata.posy = 0;

    // C: // Step finished.
    // C: pdata->step++;
    pdata.step++;

    // C: };
}