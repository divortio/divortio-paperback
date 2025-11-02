// public/js/lib/decoder/getGridIntensity.js

import { Reporterror } from '../../logging/log.js';
import { min, max } from '../../primitives/utils.js';

const NHYST = 1024;

/**
 * @typedef {import('./getAngle.js').ProcData} ProcData
 */

/**
 * Selects the optimal search range for the grid, determines the grid's intensity
 * statistics (min/max/mean), and estimates the image sharpness.
 * (Corresponds to Getgridintensity in Decoder.c).
 *
 * @param {ProcData} pdata - The processing data structure.
 * @returns {void} Updates pdata.searchX/Y0/1, pdata.cmean, pdata.cmin, pdata.cmax, pdata.sharpfactor, and pdata.step.
 */
export function getGridIntensity(pdata) {
    const { sizex, sizey, data, gridxmin, gridxmax, gridymin, gridymax } = pdata;

    // Select X and Y ranges to search for the grid, centered around the rough grid position.
    const centerx = Math.floor((gridxmin + gridxmax) / 2);
    const centery = Math.floor((gridymin + gridymax) / 2);

    // Initial search box size is NHYST (1024) pixels wide/high, centered.
    let searchx0 = centerx - Math.floor(NHYST / 2);
    searchx0 = max(0, searchx0);
    let searchx1 = searchx0 + NHYST;
    searchx1 = min(sizex, searchx1);

    let searchy0 = centery - Math.floor(NHYST / 2);
    searchy0 = max(0, searchy0);
    let searchy1 = searchy0 + NHYST;
    searchy1 = min(sizey, searchy1);

    const dx = searchx1 - searchx0;
    const dy = searchy1 - searchy0;

    if (dx <= 0 || dy <= 0) {
        Reporterror("Search area is invalid.");
        pdata.step = 0;
        return;
    }

    // Determine intensity and sharpness statistics of the central area.
    const distrc = new Int32Array(256).fill(0); // Histogram of pixel counts per intensity level (0-255)
    const distrd = new Int32Array(256).fill(0); // Histogram of absolute intensity differences between adjacent pixels (sharpness)

    let cmean = 0; // Sum of all pixel intensities
    let n = 0; // Total number of pixels sampled

    // Iterate over the search window, stopping one pixel short to allow for
    // difference calculations (pd[1] and pd[sizex]).
    for (let j = 0; j < dy - 1; j++) {
        // Start index for the row: (searchy0 + j) * sizex + searchx0
        let index = (searchy0 + j) * sizex + searchx0;
        for (let i = 0; i < dx - 1; i++, index++) {
            const currentPixel = data[index];

            distrc[currentPixel]++;
            cmean += currentPixel;
            n++;

            // Sharpness estimate: absolute difference with right and bottom neighbors
            distrd[Math.abs(data[index + 1] - currentPixel)]++;        // pd[1]-pd[0]
            distrd[Math.abs(data[index + sizex] - currentPixel)]++;    // pd[sizex]-pd[0]
        }
    }

    if (n === 0) {
        Reporterror("No pixel data in search area.");
        pdata.step = 0;
        return;
    }

    // Calculate mean intensity.
    // FIX: Use Math.floor() (truncation) to emulate C's integer division (cmean/=n).
    cmean = Math.floor(cmean / n);

    // Determine minimal and maximal intensity by dropping 3% of the extreme values.
    // limit = n / 33 (approx 3%).
    let limit = Math.floor(n / 33);
    let cmin = 0, sum = 0;
    for (cmin = 0, sum = 0; cmin < 255; cmin++) {
        sum += distrc[cmin];
        if (sum >= limit) break;
    }

    let cmax = 255;
    for (cmax = 255, sum = 0; cmax > 0; cmax--) {
        sum += distrc[cmax];
        if (sum >= limit) break;
    }

    // Check contrast.
    if (cmax - cmin < 1) {
        Reporterror("No image contrast found.");
        pdata.step = 0;
        return;
    }

    // Estimate image sharpness (Contrast value not exceeded by 5% of pixels).
    // limit = n / 10 (5% of points, since each pixel is counted twice).
    limit = Math.floor(n / 10);
    let contrast = 255;
    for (contrast = 255, sum = 0; contrast > 1; contrast--) {
        sum += distrd[contrast];
        if (sum >= limit) break;
    }

    // Empirical sharpness factor formula.
    pdata.sharpfactor = (cmax - cmin) / (2.0 * contrast) - 1.0;

    // Save results.
    pdata.searchx0 = searchx0;
    pdata.searchx1 = searchx1;
    pdata.searchy0 = searchy0;
    pdata.searchy1 = searchy1;
    pdata.cmean = cmean;
    pdata.cmin = cmin;
    pdata.cmax = cmax;

    // Step finished.
    pdata.step++;
}