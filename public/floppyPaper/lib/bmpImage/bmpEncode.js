/**
 * @file bmpEncode.js
 * @author shaozilee
 *
 * MODIFIED FOR DIVORTIO-PAPERBACK
 * This file has been heavily refactored to align with the original C 'Printer.c' source.
 * It NO LONGER encodes 24-bit or 32-bit RGBA images.
 *
 * It now:
 * 1. Expects an 8-bit, 1-channel, BOTTOM-UP grayscale pixel buffer (e.g., from printPage.js).
 * 2. Encodes a standard Windows v3 8-bit paletted BMP file.
 * 3. Writes a 256-color grayscale palette.
 */

class BmpEncoder {
    /**
     * @param {object} imgData
     * @param {Uint8Array} imgData.data - Raw 8-bit BOTTOM-UP grayscale pixel data.
     * @param {number} imgData.width
     * @param {number} imgData.height
     */
    constructor(imgData) {
        this.width = imgData.width;
        this.height = imgData.height;
        this.dataBuffer = imgData.data; // This is now 8-bit grayscale

        // 8-bit (1 byte per pixel) padding
        this.extraBytes = this.width % 4 === 0 ? 0 : 4 - (this.width % 4);
        this.pixelDataSize = this.height * (this.width + this.extraBytes);

        this.headerInfoSize = 40; // BITMAPINFOHEADER
        this.paletteSize = 256 * 4; // 256 colors * 4 bytes (B, G, R, 0)
        this.offset = 14 + this.headerInfoSize + this.paletteSize; // 1078 bytes
        this.fileSize = this.pixelDataSize + this.offset;
    }

    /**
     * Encodes the 8-bit grayscale data into a BMP file buffer.
     * @returns {{data: Uint8Array, width: number, height: number}}
     */
    encode() {
        const arrayBuffer = new ArrayBuffer(this.fileSize);
        const dataView = new DataView(arrayBuffer);
        const bmpBuffer = new Uint8Array(arrayBuffer);
        let pos = 0;

        // 1. File Header (14 bytes)
        dataView.setUint8(pos++, 'B'.charCodeAt(0)); // 'B'
        dataView.setUint8(pos++, 'M'.charCodeAt(0)); // 'M'
        dataView.setUint32(pos, this.fileSize, true); pos += 4; // fileSize
        dataView.setUint32(pos, 0, true); pos += 4; // reserved
        dataView.setUint32(pos, this.offset, true); pos += 4; // offset

        // 2. DIB Header (BITMAPINFOHEADER - 40 bytes)
        dataView.setUint32(pos, this.headerInfoSize, true); pos += 4;
        dataView.setUint32(pos, this.width, true); pos += 4;
        dataView.setUint32(pos, this.height, true); pos += 4; // Bottom-up
        dataView.setUint16(pos, 1, true); pos += 2; // planes
        dataView.setUint16(pos, 8, true); pos += 2; // bitPP (8-bit)
        dataView.setUint32(pos, 0, true); pos += 4; // compression (BI_RGB)
        dataView.setUint32(pos, this.pixelDataSize, true); pos += 4; // imageSize
        dataView.setUint32(pos, 0, true); pos += 4; // xPelsPerMeter
        dataView.setUint32(pos, 0, true); pos += 4; // yPelsPerMeter
        dataView.setUint32(pos, 256, true); pos += 4; // colors
        dataView.setUint32(pos, 256, true); pos += 4; // importantColors

        // 3. Color Palette (256 * 4 bytes)
        // (This matches the C code's grayscale palette)
        for (let i = 0; i < 256; i++) {
            dataView.setUint8(pos++, i); // Blue
            dataView.setUint8(pos++, i); // Green
            dataView.setUint8(pos++, i); // Red
            dataView.setUint8(pos++, 0); // Reserved
        }

        // 4. Pixel Data (Bottom-up 8-bit)
        // This assumes the input this.dataBuffer is *already* bottom-up,
        // which matches the output of printPage.js.
        pos = this.offset;
        for (let y = 0; y < this.height; y++) {
            const rowOffset = y * this.width;
            for (let x = 0; x < this.width; x++) {
                bmpBuffer[pos++] = this.dataBuffer[rowOffset + x];
            }
            // Add padding
            for (let p = 0; p < this.extraBytes; p++) {
                bmpBuffer[pos++] = 0;
            }
        }

        return {
            data: bmpBuffer,
            width: this.width,
            height: this.height,
        };
    }
}

/**
 * Encodes 8-bit grayscale image data into an 8-bit paletted BMP buffer.
 * @param {object} imgData
 * @param {Uint8Array} imgData.data - Raw 8-bit BOTTOM-UP grayscale pixel data.
 * @param {number} imgData.width
 * @param {number} imgData.height
 * @returns {ArrayBuffer} The complete BMP file as an ArrayBuffer.
 */
export function encode(imgData) {
    const encoder = new BmpEncoder(imgData);
    const bmp = encoder.encode();
    return bmp.data.buffer;
}