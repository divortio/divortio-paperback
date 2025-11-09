/**
 * @file testPageBytes.js
 * @overview
 * Sweeps through various DPI and Redundancy combinations, calculating page geometry
 * and capacity (pagesize) and outputting the results as a GFM Markdown table.
 */
import { PrintPage } from '../lib/classes/printPage.js';

// Global Configuration
const CONFIG = {
    DPI: { min: 100, max: 900, step: 100 },
    REDUNDANCY: { min: 2, max: 10, step: 1 }
};

// --- Helper Functions ---

/**
 * Converts bytes to a human-readable string (KB, MB, GB) with 1 decimal precision.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Fixed to 1 decimal place and includes the unit suffix.
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Converts pixels to a float representing MegaPixels with 1 decimal precision.
 * @param {number} pixels
 * @returns {number}
 */
function formatMegaPixels(pixels) {
    // Fixed to 1 decimal place and returned as a number without suffix.
    return parseFloat((pixels / 1000000).toFixed(1));
}

// --- Execution ---

console.log('--- PrintPage Geometry and Capacity Test Suite (GFM Markdown) ---');

// Get arrays of values in reverse order
const dpis = [];
for (let d = CONFIG.DPI.max; d >= CONFIG.DPI.min; d -= CONFIG.DPI.step) {
    dpis.push(d);
}

const redundancies = [];
for (let r = CONFIG.REDUNDANCY.max; r >= CONFIG.REDUNDANCY.min; r -= CONFIG.REDUNDANCY.step) {
    redundancies.push(r);
}

// --- GFM Table Header (camelCase) ---
// Added ImageSizeBytes and ImageSizeH columns, renamed capacity columns.
console.log('| DPI | Redundancy | BlocksX | BlocksY | MegaPixels | ImageSizeBytes | ImageSizeH | CapacityBytes | CapacityH |');
console.log('| :-- | :--------- | :------ | :------ | :--------- | :------------- | :--------- | :------------ | :-------- |');

// 1. Iterate over DPI (Reverse)
for (const dpi of dpis) {

    // 2. Iterate over Redundancy (Reverse)
    for (const redundancy of redundancies) {

        // Fixed dot percent, and border is true per instructions.
        const dotPercent = 70;

        try {
            const page = new PrintPage(
                dpi,
                dotPercent,
                true, // printBorderEnabled
                redundancy
            );

            // Calculate Metrics
            const totalPixels = page.finalImageWidth * page.finalImageHeight;
            const megaPixelsFormatted = formatMegaPixels(totalPixels);

            // NEW: Get Image Size Metrics
            const imageSizeBytes = page.imageSizeBytes;
            const imageSizeH = formatBytes(imageSizeBytes);

            // Capacity Metrics (Renamed)
            const capacityBytes = page.pagesize;
            const capacityH = formatBytes(capacityBytes);

            // Log the results as a GFM row
            console.log(
                `| ${dpi} ` +
                `| ${redundancy} ` +
                `| ${page.blocksX} ` +
                `| ${page.blocksY} ` +
                `| ${megaPixelsFormatted} ` +
                `| ${imageSizeBytes} ` + // NEW
                `| ${imageSizeH} ` +     // NEW
                `| ${capacityBytes} ` +  // RENAMED
                `| ${capacityH} |`       // RENAMED
            );

        } catch (e) {
            // Log errors within the table structure
            console.log(
                `| ${dpi} ` +
                `| ${redundancy} ` +
                `| ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |`
            );
        }
    }
}