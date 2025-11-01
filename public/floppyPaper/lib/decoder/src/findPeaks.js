// public/js/lib/decoder/findPeaks.js

import { max } from '../../include/paperbak/utils.js';

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

    // 2. Remove gradients by shadowing over 32 pixels (smoothing).
    const l = new Int32Array(NHYST); // This acts as the smoothed, inverted histogram
    const d = Math.floor((amax - amin + 16) / 32);
    let ampl = h[0];
    for (let i = 0; i < n; i++) {
        // ampl = max(ampl-d, h[i]);
        ampl = max(ampl - d, h[i]);
        l[i] = ampl;
    }

    // Second pass to finalize the inverted profile (l[i] = smoothed[i] - h[i]).
    amax = 0;
    for (let i = n - 1; i >= 0; i--) {
        // ampl = max(ampl-d, l[i]);
        ampl = max(ampl - d, l[i]);
        l[i] = ampl - h[i];
        amax = max(amax, l[i]);
    }

    // 3. Find peaks (valleys in the original image intensity).
    const limit = Math.floor(amax * 3 / 4) || 1; // Limit is 3/4 of the highest peak's amplitude.

    const peaks = []; // Floating-point peak position (moment / area)
    const heights = []; // Max amplitude of the peak (amax)
    let i = 0;

    // Skip incomplete first peak.
    while (i < n && l[i] > limit) i++;

    let strongestPeakHeight = 0;
    while (i < n && peaks.length < NPEAK) {
        // Find next peak.
        while (i < n && l[i] <= limit) i++;

        let area = 0, moment = 0, peakAmax = 0;
        const startI = i;

        // Calculate peak parameters.
        while (i < n && l[i] > limit) {
            ampl = l[i] - limit;
            area += ampl;
            moment += ampl * i;
            peakAmax = max(peakAmax, l[i]);
            i++;
        }

        // Don't process incomplete peaks.
        if (i >= n) break;

        // Add peak to the list, removing weak artefacts.
        if (peaks.length > 0) {
            // artifact check 1: if peak is 8x smaller than previous, skip.
            if (peakAmax * 8 < heights[heights.length - 1]) continue;
            // artifact check 2: if peak is 8x larger than previous, replace previous.
            if (peakAmax > heights[heights.length - 1] * 8) {
                peaks.pop();
                heights.pop();
            }
        }

        peaks.push(moment / area);
        heights.push(peakAmax);
        if (peakAmax > strongestPeakHeight) {
            strongestPeakHeight = peakAmax;
        }
    }

    // At least two peaks are necessary to detect the step.
    if (peaks.length < 2) return { weight: 0 };

    // 4. Calculate all possible distances between the found peaks.
    const distCounts = new Int32Array(n).fill(0);
    for (let i = 0; i < peaks.length - 1; i++) {
        for (let j = i + 1; j < peaks.length; j++) {
            const dist = Math.floor(peaks[j] - peaks[i]);
            if (dist < n) distCounts[dist]++;
        }
    }

    // 5. Find group with the maximal number of peaks (the step).
    let bestDist = 0, bestCount = 0;
    // Distances under 16 pixels are too short to be real.
    for (let i = 16; i < n; i++) {
        if (distCounts[i] === 0) continue;
        let sum = 0;
        // Allow for approximately 3% dispersion (i + i/33 + 1).
        const end = i + Math.floor(i / 33) + 1;
        for (let j = i; j <= end && j < n; j++) sum += distCounts[j];
        if (sum > bestCount) {               // Shorter is better
            bestDist = i;
            bestCount = sum;
        }
    }

    if (bestDist === 0) return { weight: 0 };

    // 6. Determine the parameters of the sequence using linear regression.
    let sn = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, totalHeight = 0;

    for (let i = 0; i < peaks.length - 1; i++) {
        for (let j = i + 1; j < peaks.length; j++) {
            const dist = peaks[j] - peaks[i];
            // Only include pairs whose distance falls within the allowed dispersion of bestDist.
            if (dist < bestDist || dist >= bestDist + bestDist / 33 + 1) continue;

            let k = 0;
            if (sn !== 0) {
                // Calculate preliminary x0 and step to find the theoretical index k for peak[i].
                const divisor = (sx * sx - sn * sxx);
                if (divisor === 0) continue; // Avoid division by zero
                const x0 = (sx * sxy - sxx * sy) / divisor;
                const step = (sx * sy - sn * sxy) / divisor;

                // C line: k=(peak[i]-x0+step/2.0)/step;
                // Since this is C integer math, we must replicate the implicit floor/truncation
                // C code is effectively using a rounding scheme for k, so we use Math.round().
                k = Math.round((peaks[i] - x0) / step);
            }

            // Accumulate linear regression variables
            sn += 2.0;
            sx += k * 2 + 1;
            sy += peaks[i] + peaks[j];
            sxx += k * k + (k + 1) * (k + 1);
            sxy += peaks[i] * k + peaks[j] * (k + 1);
            totalHeight += heights[i] + heights[j]; // moment.
        }
    }

    if (sn === 0) return { weight: 0 };

    // Final linear regression calculation.
    const divisor = (sx * sx - sn * sxx);
    if (divisor === 0) return { weight: 0 }; // Should not happen with real data, but safe check

    const bestPeak = (sx * sxy - sxx * sy) / divisor;
    const bestStep = (sx * sy - sn * sxy) / divisor;
    const weight = totalHeight / sn;

    return { bestPeak, bestStep, weight };
}