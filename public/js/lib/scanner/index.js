/**
 * @file Reads and processes a BMP image file for the decoder.
 * This module is the equivalent of Scanner.c in the original C implementation.
 */

import { Decoder } from '../decoder/index.js';
import { Message } from '../paperbak/user-interface.js';
import { decode as bmpDecode } from '../bmpImage/index.js';

/**
 * @typedef {import('../../decode-app.js').DecodeOptions} DecodeOptions
 */

/**
 * @typedef {object} BmpData
 * @property {Uint8Array} data - The raw pixel data (RGBA).
 * @property {number} width - The width of the image in pixels.
 * @property {number} height - The height of the image in pixels.
 */

/**
 * Validates the dimensions of the scanned bitmap against the allowed range.
 * This is a direct port of the validation logic in Scanner.c.
 * @param {function(string): void} reportError - The error reporting function.
 * @param {number} width - The width of the bitmap.
 * @param {number} height - The height of the bitmap.
 * @returns {boolean} True if dimensions are valid, false otherwise.
 */
function validateBitmap(reportError, width, height) {
    // Matches logic in Scanner.c: biWidth/biHeight limits
    if (width < 128 || width > 32768 || height < 128 || height > 32768) {
        const msg = `Unsupported bitmap dimensions: ${width}x${height}.`;
        reportError(msg);
        return false;
    }
    return true;
}

/**
 * Converts raw RGBA pixel data from a 24-bit BMP into a single-channel 8-bit grayscale array.
 * This function mirrors the grayscale conversion logic in ProcessDIB from Scanner.c.
 * @param {Uint8Array} rgbaData - The raw RGBA pixel data from the BMP decoder.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @returns {Uint8Array} A new array containing the 8-bit grayscale pixel data.
 */
function processPixelData(rgbaData, width, height) {
    const grayscaleData = new Uint8Array(width * height);

    // This loop is a direct 1:1 port of the C code's logic for 24-bit bitmaps:
    // *pdata++ = (uchar)((pbits[0] + pbits[1] + pbits[2]) / 3);
    // We use Math.floor() to correctly emulate C's integer division (truncation).
    for (let i = 0; i < grayscaleData.length; i++) {
        const r = rgbaData[i * 4];
        const g = rgbaData[i * 4 + 1];
        const b = rgbaData[i * 4 + 2];
        // The alpha channel (rgbaData[i * 4 + 3]) is ignored.
        grayscaleData[i] = Math.floor((r + g + b) / 3);
    }

    return grayscaleData;
}

/**
 * Reads a File object (assumed to be a BMP), decodes it, converts it to grayscale,
 * and initializes the PaperBack decoder. This function is the main entry point
 * for the scanning process and is equivalent to Decodebitmap in Scanner.c.
 * @param {File} file - The image file to decode.
 * @param {DecodeOptions} [options={}] - Options for the decoding process.
 * @returns {Promise<Decoder>} A promise that resolves with the initialized Decoder instance.
 */
export function decodeBitmap(file, options = {}) {
    const reportError = options.reportError || ((msg, err) => { console.error(msg, err); alert(msg); });

    return new Promise((resolve, reject) => {
        if (!file || file.type !== 'image/bmp') {
            const errorMsg = "Please select a valid BMP image file.";
            reportError(errorMsg);
            return reject(new Error(errorMsg));
        }

        Message(`Reading ${file.name}...`);

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                /** @type {ArrayBuffer} */
                const arrayBuffer = e.target.result;

                /** @type {BmpData} */
                const bmpData = bmpDecode(arrayBuffer);

                if (!validateBitmap(reportError, bmpData.width, bmpData.height)) {
                    return reject(new Error("Invalid bitmap properties."));
                }

                Message("Bitmap processed. Converting to grayscale...");
                const grayscaleData = processPixelData(bmpData.data, bmpData.width, bmpData.height);

                Message("Initializing decoder...");
                const decoder = new Decoder(grayscaleData, bmpData.width, bmpData.height, options);
                resolve(decoder);

            } catch (err) {
                const errorMsg = `Unsupported or corrupted BMP file: ${file.name}`;
                reportError(errorMsg, err);
                reject(err);
            }
        };

        reader.onerror = (e) => {
            const errorMsg = `Failed to read file: ${file.name}`;
            reportError(errorMsg, e);
            reject(new Error(errorMsg));
        };

        reader.readAsArrayBuffer(file);
    });
}