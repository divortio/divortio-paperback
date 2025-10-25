// public/js/lib/scanner/scanner.worker.js

import { Decoder } from '../decoder/index.js';
// --- START OF FIX ---
import { decode } from '../../vendor/fast-png/lib/index.js';
// --- END OF FIX ---

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

export function decodeBitmapWorker(imageBuffer, options = {}) {
    const pngData = decode(imageBuffer);
    const decoder = processPixelData(pngData.data, pngData.width, pngData.height, options);
    return decoder;
}