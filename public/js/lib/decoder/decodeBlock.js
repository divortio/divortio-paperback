// public/js/lib/decoder/decodeBlock.js

import { findPeaks } from './findPeaks.js';
import { recognizeBits } from './recognizeBits.js';
import { max, min, M_BEST, NDOT } from '../include/paperbak/index.js';

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

    // 1. Rotate the selected block from the main bitmap into a local buffer using bilinear interpolation.
    const unsharpBuffer = new Uint8Array(dx * dy);
    const x0 = pdata.xpeak + pdata.xstep * (posx - pdata.blockborder);
    const y0 = pdata.ypeak + pdata.ystep * (pdata.nposy - posy - 1 - pdata.blockborder);

    for (let j = 0; j < dy; j++) {
        const xbmp_base = x0 + (y0 + j) * xangle;
        for (let i = 0; i < dx; i++) {
            const xbmp = xbmp_base + i;
            const ybmp = y0 + j + (x0 + i) * yangle;
            const x_int = Math.floor(xbmp);
            const y_int = Math.floor(ybmp);
            const x_frac = xbmp - x_int;
            const y_frac = ybmp - y_int;

            if (x_int < 0 || x_int >= sizex - 1 || y_int < 0 || y_int >= sizey - 1) {
                unsharpBuffer[j * dx + i] = cmax;
            } else {
                const p_offset = y_int * sizex + x_int;
                const p00 = data[p_offset], p01 = data[p_offset + 1];
                const p10 = data[p_offset + sizex], p11 = data[p_offset + sizex + 1];
                const val = (p00 + (p01 - p00) * x_frac) * (1.0 - y_frac) +
                    (p10 + (p11 - p10) * x_frac) * y_frac;
                unsharpBuffer[j * dx + i] = val;
            }
        }
    }
    pdata.unsharp = unsharpBuffer;

    // 2. Sharpen the rotated block if required.
    let sharpBuffer = unsharpBuffer;
    if (sharpfactor > 0.0) {
        sharpBuffer = new Uint8Array(dx * dy);
        for (let j = 0; j < dy; j++) {
            for (let i = 0; i < dx; i++) {
                const offset = j * dx + i;
                if (i === 0 || i === dx - 1 || j === 0 || j === dy - 1) {
                    sharpBuffer[offset] = unsharpBuffer[offset];
                } else {
                    const sharpenedValue = unsharpBuffer[offset] * (1.0 + 4.0 * sharpfactor) -
                        (unsharpBuffer[offset - dy] + unsharpBuffer[offset - 1] + unsharpBuffer[offset + 1] + unsharpBuffer[offset + dy]) * sharpfactor;
                    sharpBuffer[offset] = max(cmin, min(Math.floor(sharpenedValue), cmax));
                }
            }
        }
    }
    pdata.sharp = sharpBuffer;

    // 3. Find precise grid lines within this specific block by creating histograms.
    for (let j = 0; j < dy; j++) {
        for (let i = 0; i < dx; i++) {
            const val = sharpBuffer[j * dx + i];
            bufx[i] += val;
            bufy[j] += val;
        }
    }

    const xPeaks = findPeaks(bufx, dx);
    if (!xPeaks || xPeaks.weight <= 0.0 || Math.abs(xPeaks.bestStep - pdata.xstep) > pdata.xstep / 16.0) {
        return { answer: -1, result: null }; // No valid X grid found
    }

    const yPeaks = findPeaks(bufy, dy);
    if (!yPeaks || yPeaks.weight <= 0.0 || Math.abs(yPeaks.bestStep - pdata.ystep) > pdata.ystep / 16.0) {
        return { answer: -1, result: null }; // No valid Y grid found
    }

    pdata.blockxpeak = xPeaks.bestPeak;
    pdata.blockxstep = xPeaks.bestStep;
    pdata.blockypeak = yPeaks.bestPeak;
    pdata.blockystep = yPeaks.bestStep;

    const xstep = xPeaks.bestStep / (NDOT + 3.0);
    const xpeak = xPeaks.bestPeak + 2.0 * xstep;
    const ystep = yPeaks.bestStep / (NDOT + 3.0);
    const ypeak = yPeaks.bestPeak + 2.0 * ystep;

    // 4. Multi-pass dot recognition.
    let bestanswer = 17;
    let result = new Uint8Array(128);
    let bestresult = new Uint8Array(128);
    let uncorrected = new Uint8Array(128);

    // Try different dot sizes (e.g., 1x1, 2x2 pixels) to find the best match.
    for (let dotsize = 1; dotsize <= pdata.maxdotsize; dotsize++) {
        const halfdot = dotsize / 2.0 - 1.0;
        /** @type {Uint8Array[]} */
        const grids = Array.from({ length: 9 }, () => new Uint8Array(NDOT * NDOT));

        // Generate 9 grids representing +/- 1 pixel shifts in all directions.
        for (let j = 0; j < NDOT; j++) {
            const y_base = ypeak + ystep * j - halfdot;
            for (let i = 0; i < NDOT; i++) {
                const x_base = xpeak + xstep * i - halfdot;
                for (let shift = 0; shift < 9; shift++) {
                    const y_off = Math.floor(shift / 3) - 1;
                    const x_off = (shift % 3) - 1;
                    const p_offset = Math.floor(y_base + y_off) * dx + Math.floor(x_base + x_off);
                    let sum = 0;

                    // Average pixels based on dot size.
                    switch (dotsize) {
                        case 4:
                            sum = (sharpBuffer[p_offset + 1] + sharpBuffer[p_offset + 2] + sharpBuffer[p_offset + dx] + sharpBuffer[p_offset + dx + 1] + sharpBuffer[p_offset + dx + 2] + sharpBuffer[p_offset + dx + 3] + sharpBuffer[p_offset + 2 * dx] + sharpBuffer[p_offset + 2 * dx + 1] + sharpBuffer[p_offset + 2 * dx + 2] + sharpBuffer[p_offset + 2 * dx + 3] + sharpBuffer[p_offset + 3 * dx + 1] + sharpBuffer[p_offset + 3 * dx + 2]) / 12;
                            break;
                        case 3:
                            sum = (sharpBuffer[p_offset] + sharpBuffer[p_offset + 1] + sharpBuffer[p_offset + 2] + sharpBuffer[p_offset + dx] + sharpBuffer[p_offset + dx + 1] + sharpBuffer[p_offset + dx + 2] + sharpBuffer[p_offset + 2 * dx] + sharpBuffer[p_offset + 2 * dx + 1] + sharpBuffer[p_offset + 2 * dx + 2]) / 9;
                            break;
                        case 2:
                            sum = (sharpBuffer[p_offset] + sharpBuffer[p_offset + 1] + sharpBuffer[p_offset + dx] + sharpBuffer[p_offset + dx + 1]) / 4;
                            break;
                        default:
                            sum = sharpBuffer[p_offset];
                            break;
                    }
                    grids[shift][j * NDOT + i] = Math.floor(sum);
                }
            }
        }

        // Attempt recognition on the non-shifted grid (grid 4) first.
        let recResult = recognizeBits(pdata, grids[4]);
        let answer = recResult.answer;
        result = recResult.result;

        if ((pdata.mode & M_BEST) && answer < bestanswer) {
            bestanswer = answer;
            bestresult.set(result);
            uncorrected.set(pdata.uncorrected);
            if (answer !== 0) answer = 17; // Continue searching for a perfect (0 error) result
        }

        // If recognition fails, create a composite grid from the best sub-blocks.
        if (answer >= 17) {
            const combinedGrid = new Uint8Array(NDOT * NDOT);
            for (let j = 0; j < NDOT; j += SUBDY) {
                for (let i = 0; i < NDOT; i += SUBDX) {
                    let dispmax = -1.0, shiftmax = 4;
                    for (let shift = 0; shift < 9; shift++) {
                        let sy = 0, syy = 0;
                        for (let y = j; y < j + SUBDY; y++) {
                            for (let x = i; x < i + SUBDX; x++) {
                                const c = grids[shift][y * NDOT + x];
                                sy += c;
                                syy += c * c;
                            }
                        }
                        const disp = syy * SUBDX * SUBDY - sy * sy;
                        if (disp > dispmax) {
                            dispmax = disp;
                            shiftmax = shift;
                        }
                    }
                    for (let y = j; y < j + SUBDY; y++) {
                        for (let x = i; x < i + SUBDX; x++) {
                            combinedGrid[y * NDOT + x] = grids[shiftmax][y * NDOT + x];
                        }
                    }
                }
            }
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

    return { answer: bestanswer, result };
}