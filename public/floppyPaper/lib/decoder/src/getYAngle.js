// public/floppyPaper/lib/decoder/src/getYAngle.js
// THIS FILE IS CORRECT.

import { findPeaks } from './findPeaks.js';
import { NDOT } from '../../primitives/constants.js';
import { Reporterror } from '../../logging/log.js';

const NHYST = 1024;

/**
 * @typedef {import('./getGridIntensity.js').PData} PData
 */

/**
 * Finds the angle and step of the horizontal grid lines (Y-direction periodicity).
 * (Corresponds to Getyangle in Decoder.c).
 *
 * @param {PData} pdata - The processing data structure.
 * @returns {void} Updates pdata.ypeak, pdata.ystep, pdata.yangle, and pdata.step.
 */
export function getYAngle(pdata) {
    const { sizex, sizey, data, searchx0, searchy0, searchx1, searchy1, xstep: pdata_xstep } = pdata;

    const x0 = searchx0;
    const y0 = searchy0;
    const dx = searchx1 - x0;
    const dy = searchy1 - y0;

    const xstep_sample = Math.max(1, Math.floor(dx / 256));
    let maxweight = 0.0;
    let bestypeak = 0.0,
        bestyangle = 0.0,
        bestystep = 0.0;

    const h = new Int32Array(NHYST);
    const nh = new Int32Array(NHYST);

    const a_limit = Math.floor(NHYST / 20) * 2;
    for (let a = -a_limit; a <= a_limit; a += 2) {
        h.fill(0, 0, dy);
        nh.fill(0, 0, dy);

        for (let i = 0; i < dx; i += xstep_sample) {
            const x = x0 + i;
            const y_start = y0 + Math.floor((x0 + i) * a / NHYST);

            for (let j = 0; j < dy; j++) {
                const y = y_start + j;
                if (y < 0) continue;
                if (y >= sizey) break;
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
            bestypeak = bestPeak + searchy0;
            bestyangle = parseFloat(`${a}.0`) / NHYST;
            bestystep = bestStep;
            maxweight = correctedWeight;
        }
    }
    if (!isFinite(bestystep) || bestystep > sizey) {
        Reporterror("No grid (Y-axis step is invalid)");
        pdata.step = 0;
        return;
    }

    // Analyse and save results.
    // C: if (maxweight==0.0 || bestystep<NDOT ||
    // C:   bestystep<pdata->xstep*0.40 ||
    // C:   bestystep>pdata->xstep*2.50
    if (maxweight === 0.0 || bestystep < NDOT ||
        bestystep < pdata_xstep * 0.40 ||
        bestystep > pdata_xstep * 2.50
    ) {
        Reporterror("No grid");
        pdata.step = 0;
        return;
    }

    pdata.ypeak = bestypeak;
    pdata.ystep = bestystep;
    pdata.yangle = bestyangle;
    pdata.step++;
}