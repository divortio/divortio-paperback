// public/floppyPaper/lib/decoder/src/getXAngle.js
// THIS FILE IS CORRECT.

import { findPeaks } from './findPeaks.js';
import { NDOT } from '../../primitives/constants.js';
import { Reporterror } from '../../logging/log.js';

const NHYST = 1024;

/**
 * @typedef {import('./getGridIntensity.js').PData} PData
 */

/**
 * Finds the angle and step of the vertical grid lines (X-direction periodicity)
 * (Corresponds to Getxangle in Decoder.c).
 *
 * @param {PData} pdata - The processing data structure.
 * @returns {void} Updates pdata.xpeak, pdata.xstep, pdata.xangle, and pdata.step.
 */
export function getXAngle(pdata) {
    const { sizex, data, searchx0, searchy0, searchx1, searchy1 } = pdata;

    const x0 = searchx0;
    const y0 = searchy0;
    const dx = searchx1 - x0;
    const dy = searchy1 - y0;

    const ystep = Math.max(1, Math.floor(dy / 256));
    let maxweight = 0.0;
    let bestxpeak = 0.0, bestxangle = 0.0, bestxstep = 0.0;

    const h = new Int32Array(NHYST);
    const nh = new Int32Array(NHYST);

    const a_limit = Math.floor(NHYST / 20) * 2;
    for (let a = -a_limit; a <= a_limit; a += 2) {
        h.fill(0, 0, dx);
        nh.fill(0, 0, dx);

        for (let j = 0; j < dy; j += ystep) {
            const y = y0 + j;
            const x_start = x0 + Math.floor((y0 + j) * a / NHYST);
            const pd_offset = y * sizex + x_start;

            for (let i = 0; i < dx; i++) {
                const x = x_start + i;
                if (x < 0) continue;
                if (x >= sizex) break;
                h[i] += data[pd_offset + i];
                nh[i]++;
            }
        }

        for (let i = 0; i < dx; i++) {
            if (nh[i] > 0) h[i] = Math.floor(h[i] / nh[i]);
        }

        const { bestPeak, bestStep, weight } = findPeaks(h, dx);
        const correctedWeight = (weight || 0) + 1.0 / (Math.abs(a) + 10.0);

        if (correctedWeight > maxweight) {
            maxweight = correctedWeight;
            // ** C-ALIGNED FIX **:
            // Only assign bestPeak and bestStep if findPeaks succeeded (weight > 0).
            if (weight > 0) {
                bestxpeak = bestPeak + searchx0;
                bestxangle = a / NHYST;
                bestxstep = bestStep;
            }
        }
    }
    if (!isFinite(bestxstep) || bestxstep > sizex) {
        Reporterror("No grid (X-axis step is invalid)");
        pdata.step = 0;
        return;
    }


    if (maxweight === 0.0 || bestxstep < NDOT) {
        Reporterror("No grid");
        pdata.step = 0;
        return;
    }

    pdata.xpeak = bestxpeak;
    pdata.xstep = bestxstep;
    pdata.xangle = bestxangle;
    pdata.step++;
}