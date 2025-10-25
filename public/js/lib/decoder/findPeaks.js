// public/js/lib/decoder/findPeaks.js

import { max } from '../include/paperbak/index.js';

const NHYST = 1024;
const NPEAK = 32;

export function findPeaks(h, n) {
    if (n < 16) return { weight: 0 };
    if (n > NHYST) n = NHYST;

    let amin = h[0], amax = h[0];
    for (let i = 1; i < n; i++) {
        if (h[i] < amin) amin = h[i];
        if (h[i] > amax) amax = h[i];
    }

    const l = new Int32Array(NHYST);
    const d = Math.floor((amax - amin + 16) / 32);
    let ampl = h[0];
    for (let i = 0; i < n; i++) {
        ampl = max(ampl - d, h[i]);
        l[i] = ampl;
    }

    amax = 0;
    for (let i = n - 1; i >= 0; i--) {
        ampl = max(ampl - d, l[i]);
        l[i] = ampl - h[i];
        amax = max(amax, l[i]);
    }

    const limit = Math.floor(amax * 3 / 4) || 1;

    const peaks = [], heights = [];
    let i = 0;
    while (i < n && l[i] > limit) i++;

    let strongestPeakHeight = 0;
    while (i < n && peaks.length < NPEAK) {
        while (i < n && l[i] <= limit) i++;
        let area = 0, moment = 0, peakAmax = 0;
        while (i < n && l[i] > limit) {
            ampl = l[i] - limit;
            area += ampl;
            moment += ampl * i;
            peakAmax = max(peakAmax, l[i]);
            i++;
        }
        if (i >= n) break;
        if (peaks.length > 0) {
            if (peakAmax * 8 < heights[heights.length - 1]) continue;
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

    if (peaks.length < 2) return { weight: 0 };

    const distCounts = new Int32Array(n).fill(0);
    for (let i = 0; i < peaks.length - 1; i++) {
        for (let j = i + 1; j < peaks.length; j++) {
            const dist = Math.floor(peaks[j] - peaks[i]);
            if (dist < n) distCounts[dist]++;
        }
    }

    let bestDist = 0, bestCount = 0;
    for (let i = 16; i < n; i++) {
        if (distCounts[i] === 0) continue;
        let sum = 0;
        const end = i + Math.floor(i / 33) + 1;
        for (let j = i; j <= end && j < n; j++) sum += distCounts[j];
        if (sum > bestCount) {
            bestDist = i;
            bestCount = sum;
        }
    }

    if (bestDist === 0) return { weight: 0 };

    let sn = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, totalHeight = 0;
    const heightThreshold = strongestPeakHeight / 4; // Ignore peaks weaker than 25% of the strongest

    for (let i = 0; i < peaks.length - 1; i++) {
        // --- START OF FINAL FIX ---
        // Add a check to only use strong peaks in the final calculation.
        if (heights[i] < heightThreshold) continue;
        // --- END OF FINAL FIX ---

        for (let j = i + 1; j < peaks.length; j++) {
            // --- START OF FINAL FIX ---
            if (heights[j] < heightThreshold) continue;
            // --- END OF FINAL FIX ---

            const dist = peaks[j] - peaks[i];
            if (dist < bestDist || dist >= bestDist + bestDist / 33 + 1) continue;
            let k = 0;
            if (sn !== 0) {
                const divisor = (sx * sx - sn * sxx);
                if (divisor === 0) continue;
                const x0 = (sx * sxy - sxx * sy) / divisor;
                const step = (sx * sy - sn * sxy) / divisor;
                k = Math.round((peaks[i] - x0) / step);
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