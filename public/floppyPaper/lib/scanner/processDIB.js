/**
 * @fileoverview
 * Port of the `ProcessDIB` function from `Scanner.c`.
 *
 * This function's role is to be an ADAPTER.
 * It takes the 32-bit RGBA (Top-Down) pixel buffer from `bmpDecode.js`
 * and converts it into the 8-bit Grayscale (Bottom-Up) buffer that the
 * C-ported CV pipeline (getXAngle, decodeBlock, etc.) expects.
 */

// startBitmapDecoding is the first step in the decoder pipeline,
// which this function calls on success.
import { startBitmapDecoding } from '../decoder/src/startBitmapDecoding.js';
import { Reporterror } from '../logging/log.js';

/**
 * @typedef {import('./getGridIntensity.js').PData} PData
 * @typedef {import('../bmpImage/bmpDecode.js').BitmapImage} BitmapImage
 */

// From C: #define BI_RGB 0
const BI_RGB = 0;

/**
 * Processes a parsed bitmap image, converts it to 8-bit grayscale,
 * and passes the result to the decoding pipeline.
 *
 * Corresponds to `ProcessDIB` in `Scanner.c`.
 *
 * @param {PData} pdata - The main processing data object.
 * @param {BitmapImage} image - The parsed bitmap object from bmpDecode {data, width, height}.
 * @param {boolean} pb_bestquality - Global flag for best quality mode.
 * @returns {number} 0 on success, -1 on error.
 */
export function processDIB(pdata, image, pb_bestquality) {
    // C: sizex=pdib->bmiHeader.biWidth;
    // C: sizey=pdib->bmiHeader.biHeight;
    const sizex = image.width;
    const sizey = image.height;
    const totalPixels = sizex * sizey;

    // C: data=(uchar *)malloc(sizex*sizey);
    // C: pdata=data;
    // This allocates the destination 8-bit grayscale buffer.
    const grayscaleData = new Uint8Array(totalPixels);

    // The bmpDecode.js library provides 32-bit RGBA data.
    // We must convert this to 8-bit grayscale.
    //
    // ** CRITICAL FIX **
    // The original C decoder pipeline (Decoder.c) expects the pixel
    // buffer to be in BOTTOM-UP orientation (first scanline is the last row).
    // The `bmpDecode.js` library provides a TOP-DOWN pixel buffer.
    // We must perform the grayscale conversion *and* flip the image vertically
    // to match the C code's expectation.

    // C: *pdata++=(uchar)((pbits[0]+pbits[1]+pbits[2])/3);
    for (let y = 0; y < sizey; y++) {
        for (let x = 0; x < sizex; x++) {
            // Source index (reads from top-down, 32-bit RGBA buffer)
            const src_idx = (y * sizex + x) * 4;
            // Dest. index (writes to bottom-up, 8-bit grayscale buffer)
            const dest_idx = ((sizey - 1 - y) * sizex + x);

            // Use the same simple average as the original C code
            // (C code averages B,G,R. We average R,G,B. Sum is identical.)
            grayscaleData[dest_idx] = (image.data[src_idx] + image.data[src_idx + 1] + image.data[src_idx + 2]) / 3;
        }
    }

    // C: // Decode bitmap. This is what we are for here.
    // C: Startbitmapdecoding(&pb_procdata,data,sizex,sizey);
    //
    // Pass the newly created 8-bit, bottom-up, grayscale buffer
    // to the CV pipeline.
    startBitmapDecoding(pdata, grayscaleData, sizex, sizey, pb_bestquality);

    // C: return 0;
    return 0; // Success
}