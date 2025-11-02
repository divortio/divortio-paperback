// public/js/lib/decoder/recognizeBits.js

import { crc16 } from '../../crc16/crc16.js';
import { decode8 } from '../../ecc/decode8.js';
import { NDATA, NDOT, M_BEST } from '../../primitives/constants.js';

let lastgood = 0;

/**
 * Given a grid of recognized dots, extracts saved information by trying multiple
 * orientations and correction factors, then running ECC and CRC checks.
 * This is a direct port of the Recognizebits function in Decoder.c.
 * @param {object} pdata - The processing data object.
 * @param {Uint8Array} grid - A flattened 32x32 Uint8Array representing the grid intensities.
 * @returns {{answer: number, result: Uint8Array}} An object with the number of corrected errors and the final 128-byte data.
 */
export function recognizeBits(pdata, grid) {
    const { cmin, cmax } = pdata;
    let bestanswer = 17;
    let result = new Uint8Array(128);
    const resultView = new DataView(result.buffer);
    const bestresult = new Uint8Array(128);

    // Create a 2D array representation for easier access
    const grid1 = Array.from({ length: NDOT }, () => new Int32Array(NDOT));

    for (let r = 0; r < 8; r++) { // Try all 8 orientations
        if (pdata.orientation >= 0 && r !== pdata.orientation) continue;

        for (let k = 0; k < 9; k++) { // Try all 9 correction factors
            const q = (k + lastgood) % 9;
            let factor = 1000, lcorr = 0;
            switch (q) {
                case 0: factor = 1000; lcorr = 0; break;
                case 1: factor = 32; lcorr = 0; break;
                case 2: factor = 16; lcorr = 0; break;
                case 3: factor = 1000; lcorr = (cmin - cmax) / 16; break;
                case 4: factor = 32; lcorr = (cmin - cmax) / 16; break;
                case 5: factor = 16; lcorr = (cmin - cmax) / 16; break;
                case 6: factor = 1000; lcorr = (cmax - cmin) / 16; break;
                case 7: factor = 32; lcorr = (cmax - cmin) / 16; break;
                case 8: factor = 16; lcorr = (cmax - cmin) / 16; break;
            }

            let limit = 0;
            for (let j = 0; j < NDOT; j++) {
                for (let i = 0; i < NDOT; i++) {
                    let c = grid[j * NDOT + i] * factor;
                    if (i > 0) c -= grid[j * NDOT + (i - 1)]; else c -= cmax;
                    if (i < 31) c -= grid[j * NDOT + (i + 1)]; else c -= cmax;
                    if (j > 0) c -= grid[(j - 1) * NDOT + i]; else c -= cmax;
                    if (j < 31) c -= grid[(j + 1) * NDOT + i]; else c -= cmax;
                    grid1[j][i] = c;
                    limit += c;
                }
            }
            limit = limit / (NDOT * NDOT) + lcorr * factor;

            for (let j = 0; j < NDOT; j++) {
                let rowBits = 0;
                for (let i = 0; i < NDOT; i++) {
                    let c;
                    switch (r) {
                        case 0: c = grid1[j][i]; break;
                        case 1: c = grid1[i][NDOT - 1 - j]; break;
                        case 2: c = grid1[NDOT - 1 - j][NDOT - 1 - i]; break;
                        case 3: c = grid1[NDOT - 1 - i][j]; break;
                        case 4: c = grid1[i][j]; break;
                        case 5: c = grid1[j][NDOT - 1 - i]; break;
                        case 6: c = grid1[NDOT - 1 - i][NDOT - 1 - j]; break;
                        case 7: c = grid1[NDOT - 1 - j][i]; break;
                    }
                    if (c < limit) {
                        rowBits |= (1 << i);
                    }
                }
                const pattern = (j & 1) ? 0xAAAAAAAA : 0x55555555;
                resultView.setUint32(j * 4, rowBits ^ pattern, true);
            }

            pdata.uncorrected.set(result);
            const answer = decode8(result, null, 0, 127);

            if (answer >= 0 && answer <= 16) {
                const dataSlice = result.subarray(0, NDATA + 4);
                // --- START OF FIX: Remove incorrect XOR operation ---
                const calculatedCrc = crc16(dataSlice);
                // --- END OF FIX ---
                const storedCrc = new DataView(result.buffer).getUint16(NDATA + 4, true);

                if (calculatedCrc === storedCrc) {
                    pdata.orientation = r;
                    if (!(pdata.mode & M_BEST)) {
                        lastgood = q;
                        return { answer, result };
                    }
                    if (answer < bestanswer) {
                        bestanswer = answer;
                        bestresult.set(result);
                    }
                }
            }
        }
    }

    if (pdata.mode & M_BEST) {
        return { answer: bestanswer, result: bestresult };
    }
    return { answer: bestanswer, result };
}