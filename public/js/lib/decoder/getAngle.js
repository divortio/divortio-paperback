// public/js/lib/decoder/getAngle.js (Corrected)

import { findPeaks } from './findPeaks.js';
import { NDOT } from '../include/paperbak/index.js';

const NHYST = 1024;

export function getXAngle(pdata) {
    const { sizex, data, searchx0, searchy0, searchx1, searchy1, reportError } = pdata;
    const dx = searchx1 - searchx0;
    const dy = searchy1 - searchy0;
    const ystep = Math.max(1, Math.floor(dy / 256));

    let maxweight = 0.0;
    let bestxpeak = 0, bestxangle = 0, bestxstep = 0;

    for (let a = -Math.floor(NHYST / 20) * 2; a <= Math.floor(NHYST / 20) * 2; a += 2) {
        const h = new Int32Array(dx).fill(0);
        const nh = new Int32Array(dx).fill(0);

        for (let j = 0; j < dy; j += ystep) {
            const y = searchy0 + j;
            let x = searchx0 + Math.floor((searchy0 + j) * a / NHYST);
            for (let i = 0; i < dx; i++, x++) {
                if (x < 0 || x >= sizex) continue;
                h[i] += data[y * sizex + x];
                nh[i]++;
            }
        }

        for (let i = 0; i < dx; i++) {
            if (nh[i] > 0) h[i] = Math.floor(h[i] / nh[i]);
        }
        // --- START OF DIAGNOSTIC LOGGING ---
        if (a === 0) { // Log the histogram for the straight-on (0 degree) scan
            console.log("--- Vertical Scan Histogram Data (getXAngle) ---");
            console.log(JSON.stringify(Array.from(h)));
            console.log("-------------------------------------------------");
        }
        // --- END OF DIAGNOSTIC LOGGING ---

        const { bestPeak, bestStep, weight } = findPeaks(h, dx);
        const correctedWeight = (weight || 0) + 1.0 / (Math.abs(a) + 10.0);

        if (correctedWeight > maxweight) {
            maxweight = correctedWeight;
            bestxpeak = bestPeak + searchx0;
            bestxangle = a / NHYST;
            bestxstep = bestStep;
        }
    }

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

export function getYAngle(pdata) {
    const { sizex, sizey, data, searchx0, searchy0, searchx1, searchy1, reportError } = pdata;
    const dx = searchx1 - searchx0;
    const dy = searchy1 - searchy0;
    const xstep = Math.max(1, Math.floor(dx / 256));

    let maxweight = 0.0;
    let bestypeak = 0, bestyangle = 0, bestystep = 0;

    for (let a = -Math.floor(NHYST / 20) * 2; a <= Math.floor(NHYST / 20) * 2; a += 2) {
        const h = new Int32Array(dy).fill(0);
        const nh = new Int32Array(dy).fill(0);
        for (let i = 0; i < dx; i += xstep) {
            const x = searchx0 + i;
            // --- START OF BUG FIX ---
            // The affine transformation must be based on the horizontal position 'i' (or 'x'), not the vertical position 'j'.
            let y = searchy0 + Math.floor((searchx0 + i) * a / NHYST);
            // --- END OF BUG FIX ---
            for (let j = 0; j < dy; j++, y++) {
                if (y < 0 || y >= sizey) break;
                h[j] += data[y * sizex + x];
                nh[j]++;
            }
        }
        for (let j = 0; j < dy; j++) {
            if (nh[j] > 0) h[j] = Math.floor(h[j] / nh[j]);
        }
        const { bestPeak, bestStep, weight } = findPeaks(h, dy);
        const correctedWeight = (weight || 0) + 1.0 / (Math.abs(a) + 10.0);

        if (correctedWeight > maxweight) {
            maxweight = correctedWeight;
            bestypeak = bestPeak + searchy0;
            bestyangle = a / NHYST;
            bestystep = bestStep;
        }
    }

    let errorReason = '';
    if (maxweight === 0.0) { errorReason = "The algorithm failed to find any consistent peaks."; }
    else if (bestystep < NDOT) { errorReason = `The detected grid step (${bestystep.toFixed(2)}px) is smaller than the required minimum block width (${NDOT}px).`; }
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