// src/decoder/getGridPosition.js
import { Reporterror } from '../paperbak/user-interface.js';
import { NDOT, max, min } from '../include/paperbak/index.js';

/**
 * Determines the rough position of the data grid within the bitmap.
 * @param {object} pdata - The processing data object.
 */
export function getGridPosition(pdata) {
    const { sizex, sizey, data } = pdata;

    if (sizex <= 3 * NDOT || sizey <= 3 * NDOT) {
        Reporterror("Bitmap is too small to process");
        pdata.step = 0;
        return;
    }

    // Select horizontal and vertical lines to check for grid location.
    const stepx = Math.floor(sizex / 256) + 1;
    const nx = Math.min(Math.floor((sizex - 2) / stepx), 256);
    const stepy = Math.floor(sizey / 256) + 1;
    const ny = Math.min(Math.floor((sizey - 2) / stepy), 256);

    const distrx = new Int32Array(nx).fill(0);
    const distry = new Int32Array(ny).fill(0);

    // Calculate intensity changes to distinguish the grid from flat borders.
    for (let j = 0; j < ny; j++) {
        let offset = j * stepy * sizex;
        for (let i = 0; i < nx; i++, offset += stepx) {
            let cmin = data[offset];
            let cmax = data[offset];

            cmax = max(cmax, data[offset + 2]);
            cmin = min(cmin, data[offset + 2]);
            cmax = max(cmax, data[offset + sizex + 1]);
            cmin = min(cmin, data[offset + sizex + 1]);
            cmax = max(cmax, data[offset + 2 * sizex]);
            cmin = min(cmin, data[offset + 2 * sizex]);
            cmax = max(cmax, data[offset + 2 * sizex + 2]);
            cmin = min(cmin, data[offset + 2 * sizex + 2]);

            distrx[i] += cmax - cmin;
            distry[j] += cmax - cmin;
        }
    }

    // Get rough bitmap limits (at 50% of maximum intensity change).
    let limit = 0;
    for (let i = 0; i < nx; i++) {
        if (distrx[i] > limit) limit = distrx[i];
    }
    limit /= 2;

    let gridxmin = 0;
    for (let i = 0; i < nx - 1; i++) {
        if (distrx[i] >= limit) {
            gridxmin = i * stepx;
            break;
        }
    }
    pdata.gridxmin = gridxmin;

    let gridxmax = 0;
    for (let i = nx - 1; i > 0; i--) {
        if (distrx[i] >= limit) {
            gridxmax = i * stepx;
            break;
        }
    }
    pdata.gridxmax = gridxmax;

    limit = 0;
    for (let j = 0; j < ny; j++) {
        if (distry[j] > limit) limit = distry[j];
    }
    limit /= 2;

    let gridymin = 0;
    for (let j = 0; j < ny - 1; j++) {
        if (distry[j] >= limit) {
            gridymin = j * stepy;
            break;
        }
    }
    pdata.gridymin = gridymin;

    let gridymax = 0;
    for (let j = ny - 1; j > 0; j--) {
        if (distry[j] >= limit) {
            gridymax = j * stepy;
            break;
        }
    }
    pdata.gridymax = gridymax;

    pdata.step++;
}