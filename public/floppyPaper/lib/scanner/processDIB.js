/**
 * @fileoverview
 * Port of the `ProcessDIB` function from `Scanner.c`.
 * This function converts a parsed BMP (Device Independent Bitmap)
 * from 8-bit (paletted) or 24-bit (RGB) into an 8-bit grayscale
 * pixel array, which is required by the decoding engine.
 *
 * *MODIFIED*: This file has been updated to accept the 32-bit RGBA
 * output from `bmpDecode.js` and convert it to 8-bit grayscale.
 */

// startBitmapDecoding is the first step in the decoder pipeline,
// which this function calls on success.
import { startBitmapDecoding } from '../decoder/src/startBitmapDecoding.js';
import { Reporterror } from '../logging/log.js';

/**
 * @typedef {import('../decoder/src/getAngle.js').PData} PData
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
    const sizex = image.width;
    const sizey = image.height;
    const totalPixels = sizex * sizey;

    // C: data=(uchar *)malloc(sizex*sizey);
    // C: pdata=data;
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
            const src_idx = (y * sizex + x) * 4; // Source index (top-down)
            const dest_idx = ((sizey - 1 - y) * sizex + x); // Dest. index (bottom-up)

            // Use the same simple average as the original C code
            grayscaleData[dest_idx] = (image.data[src_idx] + image.data[src_idx + 1] + image.data[src_idx + 2]) / 3;
        }
    }

    // C: // Decode bitmap. This is what we are for here.
    // C: Startbitmapdecoding(pdata,data,sizex,sizey);
    // This function (from `startBitmapDecoding.js`) kicks off the
    // actual decoding pipeline (find grid, find angles, etc.)
    startBitmapDecoding(pdata, grayscaleData, sizex, sizey, pb_bestquality);

    // C: return 0;
    return 0;
}