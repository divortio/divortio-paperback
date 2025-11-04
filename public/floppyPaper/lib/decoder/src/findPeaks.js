// public/js/lib/decoder/findPeaks.js
// THIS FILE INCLUDES ALL CRITICAL NUMERICAL FIXES

import { max } from '../../primitives/utils.js';

const NHYST = 1024;
const NPEAK = 32;

/**
 * @typedef {Object} PeakDetectionResult
 * @property {number} [bestPeak] - The calculated phase/position (x0) of the grid, corrected to be float.
 * @property {number} [bestStep] - The calculated step/period of the grid, corrected to be float.
 * @property {number} weight - The confidence score (moment/sn). 0.0 on failure.
 */

/**
 * Given a histogram (h) of intensity sums, locates black peaks (valleys in intensity)
 * and determines the phase (peak) and step (period) of the grid.
 * This is a direct port of the static float Findpeaks function in Decoder.c.
 *
 * @param {Int32Array} h - The histogram array (intensity sums).
 * @param {number} n - The length of the histogram (h).
 * @returns {PeakDetectionResult} An object containing bestPeak, bestStep, and weight.
 */
export function findPeaks(h, n) {
    // I expect at least 16 and at most NHYST points in the histogramm.
    if (n < 16) return { weight: 0 };
    if (n > NHYST) n = NHYST;

    // 1. Get absolute minimum and maximum.
    let amin = h[0], amax = h[0];
    for (let i = 1; i < n; i++) {
        if (h[i] < amin) amin = h[i];
        if (h[i] > amax) amax = h[i];
    }

    // 2. Remove gradients by shadowing over 32 pixels.
    // C: d=(amax-amin+16)/32;
    const d = Math.floor((amax - amin + 16) / 32);
    const l = new Int32Array(NHYST);
    let ampl = h[0];
    for (let i = 0; i < n; i++) {
        ampl = max(ampl - d, h[i]);
        l[i] = ampl;
    }

    let amax_shadow = 0;
    for (let i = n - 1; i >= 0; i--) {
        ampl = max(ampl - d, l[i]);
        l[i] = ampl - h[i];
        amax_shadow = max(amax_shadow, l[i]);
    }

    // 3. Set peak limit to 3/4 of the highest peak's amplitude.
    let limit = Math.floor(amax_shadow * 3 / 4);
    if (limit === 0) limit = 1;

    // 4. Find all peaks.
    let i = 0;
    let npeak = 0;
    const peaks = new Float32Array(NPEAK);
    const weights = new Float32Array(NPEAK);
    const heights = new Int32Array(NPEAK);

    while (i < n && l[i] > limit) i++;

    while (i < n && npeak < NPEAK) {
        while (i < n && l[i] <= limit) i++;

        let area = 0.0;
        let moment = 0.0;
        let peak_amax = 0;

        while (i < n && l[i] > limit) {
            const peak_ampl = l[i] - limit;
            area += peak_ampl;
            moment += peak_ampl * i;
            peak_amax = max(peak_amax, l[i]);
            i++;
        }

        if (i >= n) break;

        if (npeak > 0) {
            if (peak_amax * 8 < heights[npeak - 1]) continue;
            if (peak_amax > heights[npeak - 1] * 8) npeak--;
        }

        peaks[npeak] = moment / area;
        weights[npeak] = area;
        heights[npeak] = peak_amax;
        npeak++;
    }

    if (npeak < 2) return { weight: 0 };

    // 5. Calculate all possible distances between peaks.
    l.fill(0, 0, n);
    for (let i = 0; i < npeak - 1; i++) {
        for (let j = i + 1; j < npeak; j++) {
            const dist_int = Math.trunc(peaks[j] - peaks[i]);
            if (dist_int >= 0 && dist_int < n) {
                l[dist_int]++;
            }
        }
    }

    // 6. Find the group with the maximal number of peaks (best distance).
    let bestDist = 0;
    let bestcount = 0;
    for (let i = 16; i < n; i++) {
        if (l[i] === 0) continue;
        let sum = 0;
        // C: for (j=i; j<=i+i/33+1 && j<n; j++) sum+=l[j];
        // ** BUG FIX 1 **: Replicate C's integer division (i/33)
        const j_limit = i + Math.floor(i / 33) + 1;
        for (let j = i; j <= j_limit && j < n; j++) {
            sum += l[j];
        }
        if (sum > bestcount) {
            bestDist = i;
            bestcount = sum;
        }
    }

    if (bestDist === 0) return { weight: 0 };

    // 7. Determine parameters of the sequence (Linear Regression).
    let sn = 0.0, sx = 0.0, sy = 0.0, sxx = 0.0, syy = 0.0, sxy = 0.0;
    let totalHeight = 0.0;

    for (let i = 0; i < npeak - 1; i++) {
        for (let j = i + 1; j < npeak; j++) {
            const dist = peaks[j] - peaks[i];

            // C: if (dist<bestdist || dist>=bestdist+bestdist/33+1) continue;
            // ** BUG FIX 2 **: Replicate C's integer division (bestdist/33)
            if (dist < bestDist || dist >= (bestDist + Math.floor(bestDist / 33) + 1)) continue;

            let k = 0;
            if (sn !== 0) {
                const divisor = (sx * sx - sn * sxx);
                if (divisor === 0) continue;
                const x0 = (sx * sxy - sxx * sy) / divisor;
                const step = (sx * sy - sn * sxy) / divisor;

                // C line: k=(peak[i]-x0+step/2.0)/step;
                // ** BUG FIX 4 **: Add check for step being zero to prevent division by zero.
                if (step === 0) continue;
                // ** BUG FIX 3 **: Replicate C's (int) cast (truncation), not Math.round().
                k = Math.trunc((peaks[i] - x0 + (step / 2.0)) / step);
            }

            sn += 2.0;
            sx += k * 2 + 1;
            sy += peaks[i] + peaks[j];
            sxx += k * k + (k + 1) * (k + 1);
            sxy += peaks[i] * k + peaks[j] * (k + 1);
            totalHeight += heights[i] + heights[j];
        }
    }

    if (sn === 0) return { weight: 0 };

    const divisor = (sx * sx - sn * sxx);
    if (divisor === 0) return { weight: 0 };

    const bestPeak = (sx * sxy - sxx * sy) / divisor;
    const bestStep = (sx * sy - sn * sxy) / divisor;
    const weight = totalHeight / sn;

    return { bestPeak, bestStep, weight };
}