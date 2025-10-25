// public/js/lib/scanner/index.js

import { Decoder } from '../decoder/index.js';
import { Message } from '../paperbak/user-interface.js';
// --- START OF FIX ---
// Updated the import path to point to the new directory.
import { decode } from '../../vendor/fast-png/lib/index.js';
// --- END OF FIX ---

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
    const threshold = 200;

    for (let i = 0; i < grayscaleData.length; i++) {
        const r = rgbaData[i * 4];
        const g = rgbaData[i * 4 + 1];
        const b = rgbaData[i * 4 + 2];
        const avg = (r + g + b) / 3;
        grayscaleData[i] = avg < threshold ? 0 : 255;
    }

    return new Decoder(grayscaleData, width, height, options);
}

export function decodeBitmap(file, options = {}) {
    const reportError = options.reportError || ((msg, err) => { console.error(msg, err); alert(msg); });

    return new Promise(async (resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            const errorMsg = "Please select a valid image file.";
            reportError(errorMsg);
            return reject(new Error(errorMsg));
        }

        Message(`Reading ${file.name}...`);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pngData = decode(arrayBuffer);

            if (!validateBitmap(reportError, pngData.width, pngData.height)) {
                return reject(new Error("Invalid bitmap properties."));
            }

            Message("Bitmap processed. Starting decoder...");
            const decoder = processPixelData(pngData.data, pngData.width, pngData.height, options);
            resolve(decoder);

        } catch (e) {
            const errorMsg = `Unsupported or corrupted image file: ${file.name}`;
            reportError(errorMsg, e);
            reject(e);
        }
    });
}