// public/js/lib/scanner/index.js

import { Decoder } from '../decoder/index.js';
import { Message } from '../paperbak/user-interface.js';
import { decode } from '../../vendor/fast-png/lib/index.js';

function validateBitmap(reportError, width, height) {
    if (width < 128 || width > 32768 || height < 128 || height > 32768) {
        const msg = `Unsupported bitmap dimensions: ${width}x${height}.`;
        reportError(msg);
        return false;
    }
    return true;
}

function processPixelData(rgbaData, width, height, options) {
    const grayscaleData = new Uint8Array(width * height);

    // Now that we have reliable high-contrast data, we can apply a simple
    // grayscale conversion, which is a 1:1 port of the C code's logic.
    for (let i = 0; i < grayscaleData.length; i++) {
        const r = rgbaData[i * 4];
        const g = rgbaData[i * 4 + 1];
        const b = rgbaData[i * 4 + 2];
        grayscaleData[i] = Math.round((r + g + b) / 3);
    }

    return new Decoder(grayscaleData, width, height, options);
}

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
                const arrayBuffer = e.target.result;

                // Decode the raw buffer with fast-png, bypassing the browser's rendering engine.
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