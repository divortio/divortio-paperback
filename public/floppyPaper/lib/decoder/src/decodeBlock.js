/**
 * @fileoverview
 * Port of the `Decodeblock` function from `Decoder.c`.
 * This is the most critical routine in the decoder, performing image processing,
 * grid detection, and multi-pass bit recognition to extract the raw data.
 */

import { findPeaks } from './findPeaks.js';
import { recognizeBits } from './recognizeBits.js';
import { M_BEST, NDOT } from '../../primitives/constants.js';
import { max, min} from '../../primitives/utils.js'


/**
 * @typedef {import('./getAngle.js').PData} PData
 */

const SUBDX = 8;
const SUBDY = 8;

/**
 * Converts a single scanned block from the bitmap into a 128-byte data block.
 * This is the most critical routine in the decoder, performing image processing,
 * grid detection, and multi-pass bit recognition to extract the raw data.
 *
 * Corresponds to `Decodeblock` in `Decoder.c`.
 *
 * @param {PData} pdata - The processing data object for the current decoding operation.
 * @param {number} posx - The horizontal index of the block on the page grid.
 * @param {number} posy - The vertical index of the block on the page grid.
 * @returns {{answer: number, result: Uint8Array}} An object containing the number of corrected errors (0-16, 17 for unrecoverable) and the 128-byte resulting data block. Returns -1 if the block grid cannot be located.
 */
export function decodeBlock(pdata, posx, posy) {
    const { sizex, sizey, data, cmin, cmax, sharpfactor, xangle, yangle } = pdata;
    const bufx = new Int32Array(pdata.bufdx).fill(0);
    const bufy = new Int32Array(pdata.bufdy).fill(0);
    const dx = pdata.bufdx;
    const dy = pdata.bufdy;

    let i, j, x, y, x0, y0;
    let c, dotsize, shift, shiftmax, sum, answer, bestanswer;
    let xbmp, ybmp, xres, yres;
    let sy, syy, disp, dispmin, dispmax;

    let result = new Uint8Array(128); // t_data
    let uncorrected = new Uint8Array(128); // t_data
    let bestresult = new Uint8Array(128); // t_data

    // 1D array representations of 2D C arrays
    // C: uchar g[9][NDOT][NDOT]
    const grids = Array.from({ length: 9 }, () => new Uint8Array(NDOT * NDOT));
    // C: uchar grid[NDOT][NDOT]
    const combinedGrid = new Uint8Array(NDOT * NDOT);

    // Get block coordinates in the bitmap.
    x0 = pdata.xpeak + pdata.xstep * (posx - pdata.blockborder);
    y0 = pdata.ypeak + pdata.ystep * (pdata.nposy - posy - 1 - pdata.blockborder);

    // Rotate selected block to 'unsharp' buffer using bilinear interpolation.
    let pdest, pdestIndex = 0;
    if (sharpfactor > 0.0) {
        pdest = pdata.buf2; // Sharping necessary
    } else {
        pdest = pdata.buf1;
    }
    pdata.unsharp = pdest;

    for (j = 0; j < dy; j++) {
        xbmp = x0 + (y0 + j) * xangle;
        x = (xbmp >= 0.0) ? Math.floor(xbmp) : Math.floor(xbmp - 1.0); // C: if (xbmp>=0.0) x=xbmp; else x=xbmp-1.0;
        xres = xbmp - x;
        for (i = 0; i < dx; i++, pdestIndex++, x++) {
            ybmp = y0 + j + (x0 + i) * yangle;
            y = (ybmp > 0.0) ? Math.floor(ybmp) : Math.floor(ybmp - 1.0); // C: if (ybmp>0.0) y=ybmp; else y=ybmp-1.0;
            yres = ybmp - y;
            if (x < 0 || x >= sizex - 1 || y < 0 || y >= sizey - 1) {
                pdest[pdestIndex] = cmax; // Fill areas outside the page white
            } else {
                const psrcIndex = y * sizex + x;
                const psrc = data; // data is Uint8Array (psrc=data+y*sizex+x)

                // C: *pdest=(psrc[0]+(psrc[1]-psrc[0])*xres)*(1.0-yres)+
                //           (psrc[sizex]+(psrc[sizex+1]-psrc[sizex])*xres)*yres;
                pdest[pdestIndex] = (psrc[psrcIndex] + (psrc[psrcIndex + 1] - psrc[psrcIndex]) * xres) * (1.0 - yres) +
                    (psrc[psrcIndex + sizex] + (psrc[psrcIndex + sizex + 1] - psrc[psrcIndex + sizex]) * xres) * yres;
            }
        }
    }

    // Sharpen rotated block, if necessary.
    if (sharpfactor > 0.0) {
        const psrc = pdata.buf2;
        pdest = pdata.buf1;
        pdestIndex = 0;
        for (j = 0; j < dy; j++) {
            for (i = 0; i < dx; i++, pdestIndex++) {
                if (i === 0 || i === dx - 1 || j === 0 || j === dy - 1) {
                    pdest[pdestIndex] = psrc[pdestIndex];
                } else {
                    // C: *pdest=(uchar)max(cmin,min((int)(psrc[0]*(1.0+4.0*sharpfactor)-
                    //     (psrc[-dx]+psrc[-1]+psrc[1]+psrc[dx])*sharpfactor),cmax));
                    const sharpVal = psrc[pdestIndex] * (1.0 + 4.0 * sharpfactor) -
                        (psrc[pdestIndex - dx] + psrc[pdestIndex - 1] + psrc[pdestIndex + 1] + psrc[pdestIndex + dx]) * sharpfactor;
                    pdest[pdestIndex] = max(cmin, min(Math.floor(sharpVal), cmax));
                }
            }
        }
    }
    pdata.sharp = pdata.buf1;

    // Find grid lines for the whole block.
    let psrcIndex = 0;
    for (j = 0; j < dy; j++) {
        for (i = 0; i < dx; i++, psrcIndex++) {
            bufx[i] += pdata.buf1[psrcIndex];
            bufy[j] += pdata.buf1[psrcIndex];
        }
    }

    // C: if (Findpeaks(bufx,dx,&xpeak,&xstep)<=0.0) return -1;
    let { bestpeak: xpeak, beststep: xstep, weight: xWeight } = findPeaks(bufx, dx);
    if (xWeight <= 0.0) return { answer: -1, result: null }; // No X grid
    if (Math.abs(xstep - pdata.xstep) > pdata.xstep / 16.0) return { answer: -1, result: null }; // Invalid grid step

    // C: if (Findpeaks(bufy,dy,&ypeak,&ystep)<=0.0) return -1;
    let { bestpeak: ypeak, beststep: ystep, weight: yWeight } = findPeaks(bufy, dy);
    if (yWeight <= 0.0) return { answer: -1, result: null }; // No Y grid
    if (Math.abs(ystep - pdata.ystep) > pdata.ystep / 16.0) return { answer: -1, result: null }; // Invalid grid step

    // Save block position for displaying purposes.
    pdata.blockxpeak = xpeak;
    pdata.blockxstep = xstep;
    pdata.blockypeak = ypeak;
    pdata.blockystep = ystep;

    // Calculate dot step and correct peaks so that they point to first dot.
    xstep = xstep / (NDOT + 3.0);
    xpeak += 2.0 * xstep;
    ystep = ystep / (NDOT + 3.0);
    ypeak += 2.0 * ystep;

    bestanswer = 17;

    // Try different dot sizes
    for (dotsize = 1; dotsize <= pdata.maxdotsize; dotsize++) {
        const halfdot = dotsize / 2.0 - 1.0;
        for (j = 0; j < NDOT; j++) {
            // C: y=ypeak+ystep*j-halfdot; (y is int, so float is truncated)
            const y_float = ypeak + ystep * j - halfdot;
            const y_int = Math.floor(y_float); // This is the fix: emulating C's float-to-int truncation
            for (i = 0; i < NDOT; i++) {
                // C: x=xpeak+xstep*i-halfdot; (x is int, so float is truncated)
                const x_float = xpeak + xstep * i - halfdot;
                const x_int = Math.floor(x_float); // This is the fix: emulating C's float-to-int truncation

                for (shift = 0; shift < 9; shift++) {
                    let psrcIndex;
                    switch (shift) {
                        // C: psrc=pdata->buf1+(y-1)*dx+(x-1); (uses truncated int x and y)
                        // Using the floored _int values is the correct porting of the C logic.
                        case 0: psrcIndex = (y_int - 1) * dx + (x_int - 1); break;
                        case 1: psrcIndex = (y_int - 1) * dx + (x_int + 0); break;
                        case 2: psrcIndex = (y_int - 1) * dx + (x_int + 1); break;
                        case 3: psrcIndex = (y_int + 0) * dx + (x_int - 1); break;
                        case 4: psrcIndex = (y_int + 0) * dx + (x_int + 0); break;
                        case 5: psrcIndex = (y_int + 0) * dx + (x_int + 1); break;
                        case 6: psrcIndex = (y_int + 1) * dx + (x_int - 1); break;
                        case 7: psrcIndex = (y_int + 1) * dx + (x_int + 0); break;
                        case 8: psrcIndex = (y_int + 1) * dx + (x_int + 1); break;
                    }

                    let sum;
                    const psrc = pdata.buf1;
                    switch (dotsize) {
                        case 4: // Rounded 4x4 dot
                            sum = (psrc[psrcIndex + 1] + psrc[psrcIndex + 2] + psrc[psrcIndex + dx] + psrc[psrcIndex + dx + 1] + psrc[psrcIndex + dx + 2] + psrc[psrcIndex + dx + 3] +
                                psrc[psrcIndex + 2 * dx] + psrc[psrcIndex + 2 * dx + 1] + psrc[psrcIndex + 2 * dx + 2] + psrc[psrcIndex + 2 * dx + 3] +
                                psrc[psrcIndex + 3 * dx + 1] + psrc[psrcIndex + 3 * dx + 2]) / 12;
                            break;
                        case 3: // 3x3 pixel
                            sum = (psrc[psrcIndex] + psrc[psrcIndex + 1] + psrc[psrcIndex + 2] + psrc[psrcIndex + dx] + psrc[psrcIndex + dx + 1] + psrc[psrcIndex + dx + 2] +
                                psrc[psrcIndex + 2 * dx] + psrc[psrcIndex + 2 * dx + 1] + psrc[psrcIndex + 2 * dx + 2]) / 9;
                            break;
                        case 2: // 2x2 pixel
                            sum = (psrc[psrcIndex] + psrc[psrcIndex + 1] + psrc[psrcIndex + dx] + psrc[psrcIndex + dx + 1]) / 4;
                            break;
                        default: // 1x1 pixel
                            sum = psrc[psrcIndex];
                            break;
                    }
                    // C: g[shift][j][i]=(uchar)sum;
                    grids[shift][j * NDOT + i] = Math.floor(sum);
                }
            }
        }

        // Try non-shifted grid first (g[4])
        let recResult = recognizeBits(pdata, grids[4]);
        answer = recResult.answer;
        result = recResult.result;

        // C: if ((pdata->mode & M_BEST)!=0 && answer<bestanswer)
        if ((pdata.mode & M_BEST) && answer < bestanswer) {
            bestanswer = answer;
            bestresult.set(result);
            uncorrected.set(pdata.uncorrected);
            if (answer !== 0) answer = 17;
        }

        // If data recognition fails, combine grid from subblocks
        if (answer === 17) {
            for (j = 0; j < NDOT; j += SUBDY) {
                for (i = 0; i < NDOT; i += SUBDX) {
                    dispmin = 1.0e99;
                    dispmax = -1.0e99;
                    shiftmax = 0;
                    for (shift = 0; shift < 9; shift++) {
                        sy = 0.0;
                        syy = 0.0;
                        for (let y = j; y < j + SUBDY; y++) {
                            for (let x = i; x < i + SUBDX; x++) {
                                // C: c=g[shift][y][x];
                                const c = grids[shift][y * NDOT + x];
                                sy += c;
                                syy += c * c;
                            }
                        }
                        // C: disp=syy*SUBDX*SUBDY-sy*sy;
                        const disp = syy * SUBDX * SUBDY - sy * sy;
                        if (disp < dispmin) dispmin = disp;
                        if (disp > dispmax) {
                            dispmax = disp;
                            shiftmax = shift;
                        }
                    }

                    // C: if (dispmax-dispmin<dispmax/5.0) shiftmax=4;
                    if (dispmax - dispmin < dispmax / 5.0) {
                        shiftmax = 4; // Use non-shifted grid if dispersion is low
                    }

                    // Copy subblock with maximal dispersion to main grid
                    for (let y = j; y < j + SUBDY; y++) {
                        for (let x = i; x < i + SUBDX; x++) {
                            // C: grid[y][x]=g[shiftmax][y][x];
                            combinedGrid[y * NDOT + x] = grids[shiftmax][y * NDOT + x];
                        }
                    }
                }
            }
            // Try to recognize data in the combined grid.
            recResult = recognizeBits(pdata, combinedGrid);
            answer = recResult.answer;
            result = recResult.result;

            if ((pdata.mode & M_BEST) && answer < bestanswer) {
                bestanswer = answer;
                bestresult.set(result);
                uncorrected.set(pdata.uncorrected);
                if (answer !== 0) answer = 17;
            }
        }

        if (answer < 17) break; // Success, no need to try larger dot sizes
    }

    if (pdata.mode & M_BEST) {
        pdata.uncorrected.set(uncorrected);
        return { answer: bestanswer, result: bestresult };
    }

    // This return uses the 'result' from the last successful or attempted 'recognizeBits' call
    return { answer: answer, result: result };
}