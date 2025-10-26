
class BmpEncoder {
    /**
     * @param {object} imgData
     * @param {Uint8ClampedArray|Uint8Array} imgData.data - The raw pixel data (RGBA).
     * @param {number} imgData.width - The width of the image.
     * @param {number} imgData.height - The height of the image.
     */
    constructor(imgData) {
        this.width = imgData.width;
        this.height = imgData.height;
        this.rgbaBuffer = imgData.data;

        this.extraBytes = this.width % 4;
        this.rgbSize = this.height * (3 * this.width + this.extraBytes);
        this.headerInfoSize = 40;
        this.offset = 54;
        this.fileSize = this.rgbSize + this.offset;
    }

    /**
     * Encodes the image data into a BMP file buffer.
     * @returns {{data: Uint8Array, width: number, height: number}}
     */
    encode() {
        const arrayBuffer = new ArrayBuffer(this.fileSize);
        const dataView = new DataView(arrayBuffer);
        const bmpBuffer = new Uint8Array(arrayBuffer);
        let pos = 0;

        // File Header
        dataView.setUint8(pos++, 'B'.charCodeAt(0));
        dataView.setUint8(pos++, 'M'.charCodeAt(0));
        dataView.setUint32(pos, this.fileSize, true); pos += 4;
        dataView.setUint32(pos, 0, true); pos += 4; // reserved
        dataView.setUint32(pos, this.offset, true); pos += 4;

        // DIB Header (BITMAPINFOHEADER)
        dataView.setUint32(pos, this.headerInfoSize, true); pos += 4;
        dataView.setUint32(pos, this.width, true); pos += 4;
        dataView.setUint32(pos, this.height, true); pos += 4; // Use positive height for bottom-up
        dataView.setUint16(pos, 1, true); pos += 2; // planes
        dataView.setUint16(pos, 24, true); pos += 2; // bitPP
        dataView.setUint32(pos, 0, true); pos += 4; // compress
        dataView.setUint32(pos, this.rgbSize, true); pos += 4;
        dataView.setUint32(pos, 0, true); pos += 4; // hr
        dataView.setUint32(pos, 0, true); pos += 4; // vr
        dataView.setUint32(pos, 0, true); pos += 4; // colors
        dataView.setUint32(pos, 0, true); pos += 4; // importantColors

        // Pixel Data (Bottom-up BGR)
        pos = this.offset;
        for (let y = this.height - 1; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                const p = (y * this.width + x) * 4; // 4 bytes per pixel (RGBA)
                bmpBuffer[pos++] = this.rgbaBuffer[p + 2]; // Blue
                bmpBuffer[pos++] = this.rgbaBuffer[p + 1]; // Green
                bmpBuffer[pos++] = this.rgbaBuffer[p];     // Red
            }
            // Add padding for 4-byte alignment
            pos += this.extraBytes;
        }

        return {
            data: bmpBuffer,
            width: this.width,
            height: this.height,
        };
    }
}

/**
 * Encodes RGBA image data into a 24-bit BMP buffer.
 * @param {object} imgData - Image data object.
 * @param {Uint8ClampedArray|Uint8Array} imgData.data - Raw RGBA pixel data.
 * @param {number} imgData.width - The width of the image.
 * @param {number} imgData.height - The height of the image.
 * @returns {{data: Uint8Array, width: number, height: number}}
 */
export function encode(imgData) {
    const encoder = new BmpEncoder(imgData);
    return encoder.encode();
}