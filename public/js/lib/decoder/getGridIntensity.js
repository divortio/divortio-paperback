// src/decoder/getGridIntensity.js
import { Reporterror } from '../paperbak/user-interface.js';

const NHYST = 1024;

/**
 * Selects search range, determines grid intensity, and estimates sharpness.
 * @param {object} pdata - The processing data object.
 */
export function getGridIntensity(pdata) {
    const { sizex, sizey, data } = pdata;

    // Select search ranges based on the rough grid position.
    const centerx = Math.floor((pdata.gridxmin + pdata.gridxmax) / 2);
    const centery = Math.floor((pdata.gridymin + pdata.gridymax) / 2);

    const searchx0 = Math.max(0, centerx - Math.floor(NHYST / 2));
    const searchx1 = Math.min(sizex, searchx0 + NHYST);
    const searchy0 = Math.max(0, centery - Math.floor(NHYST / 2));
    const searchy1 = Math.min(sizey, searchy0 + NHYST);

    const dx = searchx1 - searchx0;
    const dy = searchy1 - searchy0;

    const distrc = new Int32Array(256).fill(0); // Intensity distribution
    const distrd = new Int32Array(256).fill(0); // Intensity difference distribution
    let cmean = 0;
    let n = 0;

    for (let j = 0; j < dy - 1; j++) {
        const rowOffset = (searchy0 + j) * sizex + searchx0;
        for (let i = 0; i < dx - 1; i++) {
            const offset = rowOffset + i;
            const pixelValue = data[offset];

            distrc[pixelValue]++;
            cmean += pixelValue;
            n++;

            distrd[Math.abs(data[offset + 1] - pixelValue)]++;
            distrd[Math.abs(data[offset + sizex] - pixelValue)]++;
        }
    }

    if (n === 0) {
        Reporterror("No image data in the search area.");
        pdata.step = 0;
        return;
    }

    cmean /= n;

    // Calculate min/max intensity, excluding the extreme 3% of pixels.
    const limit = n / 33;
    let sum = 0;
    let cmin = 0;
    for (cmin = 0; cmin < 255; cmin++) {
        sum += distrc[cmin];
        if (sum >= limit) break;
    }

    sum = 0;
    let cmax = 255;
    for (cmax = 255; cmax > 0; cmax--) {
        sum += distrc[cmax];
        if (sum >= limit) break;
    }

    if (cmax - cmin < 1) {
        Reporterror("No image contrast.");
        pdata.step = 0;
        return;
    }

    // Estimate image sharpness based on contrast.
    const sharpLimit = n / 10;
    sum = 0;
    let contrast = 255;
    for (contrast = 255; contrast > 1; contrast--) {
        sum += distrd[contrast];
        if (sum >= sharpLimit) break;
    }

    pdata.sharpfactor = (cmax - cmin) / (2.0 * contrast) - 1.0;
    pdata.searchx0 = searchx0;
    pdata.searchx1 = searchx1;
    pdata.searchy0 = searchy0;
    pdata.searchy1 = searchy1;
    pdata.cmean = cmean;
    pdata.cmin = cmin;
    pdata.cmax = cmax;

    pdata.step++;
}