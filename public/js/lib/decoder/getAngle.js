// public/js/lib/decoder/getAngle.js (Fixed for C integer truncation fidelity)

import { findPeaks } from './findPeaks.js';
import { NDOT } from '../include/paperbak/index.js';

const NHYST = 1024;

/**
 * @typedef {Object} ProcData
 * @property {number} sizex - The width of the bitmap.
 * @property {number} sizey - The height of the bitmap.
 * @property {Uint8Array} data - The grayscale pixel data of the bitmap.
 * @property {number} searchx0 - Start X coordinate for search area.
 * @property {number} searchy0 - Start Y coordinate for search area.
 * @property {number} searchx1 - End X coordinate for search area.
 * @property {number} searchy1 - End Y coordinate for search area.
 * @property {function(string): void} reportError - The error reporting function.
 * @property {number} xpeak - Calculated best X starting position (peak).
 * @property {number} xstep - Calculated best X step (period).
 * @property {number} xangle - Calculated best X angle.
 * @property {number} ypeak - Calculated best Y starting position (peak).
 * @property {number} ystep - Calculated best Y step (period).
 * @property {number} yangle - Calculated best Y angle.
 * @property {number} step - The current step in the decoding process state machine.
 */

/**
 * Finds the angle and step of the vertical grid lines (X-direction periodicity)
 * using a histogram of pixel intensity sums along the search area.
 * This function handles the affine transformation (skew correction) during the scan.
 * (Corresponds to Getxangle in Decoder.c).
 *
 * @param {ProcData} pdata - The processing data structure.
 * @returns {void} Updates pdata.xpeak, pdata.xstep, pdata.xangle, and pdata.step.
 */
export function getXAngle(pdata) {
    const { sizex, data, searchx0, searchy0, searchx1, searchy1, reportError } = pdata;
    const dx = searchx1 - searchx0;
    const dy = searchy1 - searchy0;
    // Calculate vertical step: 256 lines are sufficient.
    const ystep = Math.max(1, Math.floor(dy / 256));

    let maxweight = 0.0;
    let bestxpeak = 0, bestxangle = 0, bestxstep = 0;

    // Iterate through possible angles (a). Max allowed angle is approx. +/- 5 degrees.
    for (let a = -Math.floor(NHYST / 20) * 2; a <= Math.floor(NHYST / 20) * 2; a += 2) {
        const h = new Int32Array(dx).fill(0);
        const nh = new Int32Array(dx).fill(0);

        // Gather histogramm.
        for (let j = 0; j < dy; j += ystep) {
            const y = searchy0 + j;

            // Affine transformation: x = x0 + (y0 + j) * a / NHYST
            // FIX: Use Math.trunc() to correctly replicate C's integer division, which truncates toward zero.
            let x = searchx0 + Math.trunc((searchy0 + j) * a / NHYST);

            for (let i = 0; i < dx; i++, x++) {
                if (x < 0 || x >= sizex) continue;
                const index = y * sizex + x;
                // Accumulate intensity sum
                h[i] += data[index];
                // Accumulate count of pixels used for normalization
                nh[i]++;
            }
        }

        // Normalize histogramm (Average intensity per pixel column).
        for (let i = 0; i < dx; i++) {
            if (nh[i] > 0) h[i] = Math.floor(h[i] / nh[i]);
        }

        // Find peaks and calculate weight (confidence).
        const { bestPeak, bestStep, weight } = findPeaks(h, dx);

        // Add small correction that prefers zero angle.
        const correctedWeight = (weight || 0) + 1.0 / (Math.abs(a) + 10.0);

        if (correctedWeight > maxweight) {
            maxweight = correctedWeight;
            bestxpeak = bestPeak + searchx0;
            bestxangle = a / NHYST;
            bestxstep = bestStep;
        }
    }

    // Analyse and save results.
    if (maxweight === 0.0 || bestxstep < NDOT) {
        const reason = maxweight === 0.0 ? "The algorithm failed to find any consistent peaks." : `The detected grid step (${bestxstep.toFixed(2)}px) is smaller than the required minimum block width (${NDOT}px).`;
        reportError(`No grid detected (vertical). ${reason} The image may be too blurry, skewed, or low-contrast.`);
        pdata.step = 0;
        return;
    }

    pdata.xpeak = bestxpeak;
    pdata.xstep = bestxstep;
    pdata.xangle = bestxangle;
    pdata.step++;
}

/**
 * Finds the angle and step of the horizontal grid lines (Y-direction periodicity).
 * (Corresponds to Getyangle in Decoder.c).
 *
 * @param {ProcData} pdata - The processing data structure.
 * @returns {void} Updates pdata.ypeak, pdata.ystep, pdata.yangle, and pdata.step.
 */
export function getYAngle(pdata) {
    const { sizex, sizey, data, searchx0, searchy0, searchx1, searchy1, reportError } = pdata;
    const dx = searchx1 - searchx0;
    const dy = searchy1 - searchy0;
    // Calculate horizontal step: 256 lines are sufficient.
    const xstep = Math.max(1, Math.floor(dx / 256));

    let maxweight = 0.0;
    let bestypeak = 0, bestyangle = 0, bestystep = 0;

    // Iterate through possible angles (a).
    for (let a = -Math.floor(NHYST / 20) * 2; a <= Math.floor(NHYST / 20) * 2; a += 2) {
        const h = new Int32Array(dy).fill(0);
        const nh = new Int32Array(dy).fill(0);

        for (let i = 0; i < dx; i += xstep) {
            const x = searchx0 + i;

            // Affine transformation: y = y0 + (x0 + i) * a / NHYST
            // FIX: Use Math.trunc() to correctly replicate C's integer division, which truncates toward zero.
            let y = searchy0 + Math.trunc((searchx0 + i) * a / NHYST);

            for (let j = 0; j < dy; j++, y++) {
                if (y < 0 || y >= sizey) break;
                const index = y * sizex + x;
                // Accumulate intensity sum
                h[j] += data[index];
                // Accumulate count of pixels used for normalization
                nh[j]++;
            }
        }

        // Normalize histogramm (Average intensity per pixel row).
        for (let j = 0; j < dy; j++) {
            if (nh[j] > 0) h[j] = Math.floor(h[j] / nh[j]);
        }

        // Find peaks and calculate weight (confidence).
        const { bestPeak, bestStep, weight } = findPeaks(h, dy);

        // Add small correction that prefers zero angle.
        const correctedWeight = (weight || 0) + 1.0 / (Math.abs(a) + 10.0);

        if (correctedWeight > maxweight) {
            maxweight = correctedWeight;
            bestypeak = bestPeak + searchy0;
            bestyangle = a / NHYST;
            bestystep = bestStep;
        }
    }

    // Analyse and save results.
    let errorReason = '';
    if (maxweight === 0.0) { errorReason = "The algorithm failed to find any consistent peaks."; }
    else if (bestystep < NDOT) { errorReason = `The detected grid step (${bestystep.toFixed(2)}px) is smaller than the required minimum block width (${NDOT}px).`; }
    // Check for disproportionate steps: bestystep < pdata->xstep*0.40 || bestystep > pdata->xstep*2.50.
    else if (bestystep < pdata.xstep * 0.40) { errorReason = `The detected horizontal step (${bestystep.toFixed(2)}px) is disproportionately smaller than the vertical step (${pdata.xstep.toFixed(2)}px). This suggests a distorted grid.`; }
    else if (bestystep > pdata.xstep * 2.50) { errorReason = `The detected horizontal step (${bestystep.toFixed(2)}px) is disproportionately larger than the vertical step (${pdata.xstep.toFixed(2)}px). This suggests a distorted grid.`; }

    if (errorReason) {
        reportError(`No grid detected (horizontal). ${errorReason} The image may be too blurry or skewed.`);
        pdata.step = 0;
        return;
    }

    pdata.ypeak = bestypeak;
    pdata.ystep = bestystep;
    pdata.yangle = bestyangle;
    pdata.step++;
}