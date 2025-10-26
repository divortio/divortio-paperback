// public/js/lib/scanner/index.js

import { Decoder } from '../decoder/index.js';
import { Message } from '../paperbak/user-interface.js';
import { decode } from '../../vendor/fast-png/lib/index.js';

/**
 * @typedef {Object} DecodeOptions
 * @property {function(string, Error=): void} [reportError] - Function to handle and report errors.
 * @property {boolean} [pb_bestquality=false] - Flag to enable best quality search mode (M_BEST).
 * @property {number} [blockborder=0.0] - Manual setting for the block border (0.0 for auto-select).
 */

/**
 * @typedef {Object} PngData
 * @property {Uint8Array} data - The raw pixel data (RGBA).
 * @property {number} width - The width of the image in pixels.
 * @property {number} height - The height of the image in pixels.
 */

/**
 * Validates the dimensions of the scanned bitmap against the allowed range.
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
 * Converts raw RGBA pixel data into a single-channel 8-bit grayscale array.
 * @param {Uint8Array} rgbaData - The raw RGBA pixel data.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @param {DecodeOptions} options - The decoding options.
 * @returns {Decoder} A new Decoder instance initialized with the grayscale data.
 */
function processPixelData(rgbaData, width, height, options) {
    const grayscaleData = new Uint8Array(width * height);

    // Apply grayscale conversion using (R+G+B)/3 with truncation,
    // which is a 1:1 port of the C code's integer division logic (pbits[0]+pbits[1]+pbits[2])/3.
    for (let i = 0; i < grayscaleData.length; i++) {
        const r = rgbaData[i * 4];
        const g = rgbaData[i * 4 + 1];
        const b = rgbaData[i * 4 + 2];
        // FIX: Change Math.round() to Math.floor() to correctly emulate C's integer division (truncation).
        grayscaleData[i] = Math.floor((r + g + b) / 3);
    }

    return new Decoder(grayscaleData, width, height, options);
}

/**
 * Reads a File object (assumed to be a PNG), decodes it to raw pixel data,
 * converts the data to grayscale, and initializes the PaperBack decoder.
 * @param {File} file - The image file to decode.
 * @param {DecodeOptions} [options={}] - Options for the decoding process.
 * @returns {Promise<Decoder>} A promise that resolves with the initialized Decoder instance.
 */
export function decodeBitmap(file, options = {}) {
    const reportError = options.reportError || ((msg, err) => { console.error(msg, err); alert(msg); });

    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            const errorMsg = "Please select a valid image file.";
            reportError(errorMsg);
            return reject(new Error(errorMsg));
        }

        Message(`Reading ${file.name}...`);

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                /** @type {ArrayBuffer} */
                const arrayBuffer = e.target.result;

                // Decode the raw buffer with fast-png, bypassing the browser's rendering engine.
                /** @type {PngData} */
                const pngData = decode(arrayBuffer);

                if (!validateBitmap(reportError, pngData.width, pngData.height)) {
                    return reject(new Error("Invalid bitmap properties."));
                }

                Message("Bitmap processed. Starting decoder...");
                const decoder = processPixelData(pngData.data, pngData.width, pngData.height, options);
                resolve(decoder);

            } catch (err) {
                const errorMsg = `Unsupported or corrupted image file: ${file.name}`;
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