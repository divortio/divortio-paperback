/**
 * @file bmpDecode.js
 * @author shaozilee
 *
 * MODIFIED FOR DIVORTIO-PAPERBACK
 * This file has been heavily refactored to align with the original C 'Scanner.c' source.
 * It NO LONGER outputs 32-bit RGBA.
 *
 * It now:
 * 1. Supports only uncompressed (BI_RGB) 8-bit and 24-bit BMPs.
 * 2. Performs grayscale conversion on the fly.
 * 3. Outputs a single 8-bit, 1-channel, BOTTOM-UP grayscale pixel buffer.
 *
 * This makes the 'processDIB.js' file redundant.
 */

class BmpDecoder {
    /**
     * @param {ArrayBuffer} arrayBuffer
     */
    constructor(arrayBuffer) {
        this.arrayBuffer = arrayBuffer;
        this.dataView = new DataView(arrayBuffer);
        this.uint8Array = new Uint8Array(arrayBuffer);
        this.pos = 0;
        this.bottom_up = true;
        this.palette = [];

        const flag = String.fromCharCode(this.dataView.getUint8(0), this.dataView.getUint8(1));
        if (flag !== "BM") {
            throw new Error("Invalid BMP File: Missing 'BM' signature.");
        }
        this.pos += 2; // Skip 'BM'

        this.parseHeader();
        if (this.bitPP === 8) {
            this.parsePalette();
        }
        this.parseGrayscale(); // This replaces parseRGBA()
    }

    // Helper methods to read from DataView
    _readUInt32LE() { const v = this.dataView.getUint32(this.pos, true); this.pos += 4; return v; }
    _readInt32LE() { const v = this.dataView.getInt32(this.pos, true); this.pos += 4; return v; }
    _readUInt16LE() { const v = this.dataView.getUint16(this.pos, true); this.pos += 2; return v; }
    _readUInt8() { const v = this.dataView.getUint8(this.pos); this.pos += 1; return v; }

    parseHeader() {
        this.fileSize = this._readUInt32LE();
        this.reserved = this._readUInt32LE();
        this.offset = this._readUInt32LE();

        // DIB Header
        this.headerSize = this._readUInt32LE();
        this.width = this._readInt32LE();
        this.height = this._readInt32LE();
        this.planes = this._readUInt16LE();
        this.bitPP = this._readUInt16LE();
        this.compress = this._readUInt32LE();
        this.rawSize = this._readUInt32LE();
        this.hr = this._readUInt32LE();
        this.vr = this._readUInt32LE();
        this.colors = this._readUInt32LE();
        this.importantColors = this._readUInt32LE();

        // C-Code validation: Check for uncompressed 8-bit or 24-bit
        if (this.compress !== 0) { // BI_RGB
            throw new Error(`Unsupported BMP compression: ${this.compress}`);
        }
        if (this.bitPP !== 8 && this.bitPP !== 24) {
            throw new Error(`Unsupported BMP bit depth: ${this.bitPP}. Only 8-bit and 24-bit are supported.`);
        }

        // C-Code validation: Check for negative height (top-down)
        // The original C code *only* supports bottom-up (positive height).
        if (this.height < 0) {
            this.height = -this.height;
            this.bottom_up = false;
            // Note: The C code would fail here, but we can support it.
            // Our CV pipeline *expects* bottom-up, so we will flip it.
        }
    }

    parsePalette() {
        const numColors = this.colors === 0 ? 256 : this.colors;
        for (let i = 0; i < numColors; i++) {
            this.palette.push({
                blue: this._readUInt8(),
                green: this._readUInt8(),
                red: this._readUInt8(),
                quad: this._readUInt8(),
            });
        }
    }

    parseGrayscale() {
        // Allocate the 8-bit grayscale destination buffer
        this.data = new Uint8Array(this.width * this.height);
        this.pos = this.offset;

        switch (this.bitPP) {
            case 8:
                this.bit8();
                break;
            case 24:
                this.bit24();
                break;
            default:
                throw new Error(`Unsupported bit depth: ${this.bitPP}`);
        }
    }

    bit8() {
        // C: offset=(offset+3) & 0xFFFFFFFC;
        const padding = this.width % 4 === 0 ? 0 : 4 - (this.width % 4);

        // Create the grayscale lookup table from the palette, just like C 'ProcessDIB'
        const scale = new Uint8Array(256);
        const numColors = this.palette.length > 0 ? this.palette.length : 256;

        if (this.palette.length > 0) {
            for (let i = 0; i < numColors; i++) {
                const pal = this.palette[i];
                scale[i] = (pal.red + pal.green + pal.blue) / 3;
            }
        } else {
            // No palette? Assume grayscale.
            for (let i = 0; i < 256; i++) scale[i] = i;
        }

        for (let y = 0; y < this.height; y++) {
            // C pipeline expects bottom-up data.
            // If BMP is bottom-up, we read row 0 and write to dest. row 0.
            // If BMP is top-down, we read row 0 and write to dest. row (h-1).
            const destRow = this.bottom_up ? y : this.height - 1 - y;
            const destOffset = destRow * this.width;

            for (let x = 0; x < this.width; x++) {
                const index = this._readUInt8();
                this.data[destOffset + x] = scale[index];
            }
            this.pos += padding; // Skip row padding
        }
    }

    bit24() {
        // C: offset=(offset+3) & 0xFFFFFFFC;
        const padding = (this.width * 3) % 4 === 0 ? 0 : 4 - ((this.width * 3) % 4);

        for (let y = 0; y < this.height; y++) {
            // C pipeline expects bottom-up data.
            const destRow = this.bottom_up ? y : this.height - 1 - y;
            const destOffset = destRow * this.width;

            for (let x = 0; x < this.width; x++) {
                const blue = this._readUInt8();
                const green = this._readUInt8();
                const red = this._readUInt8();

                // C: *pdata++=(uchar)((pbits[0]+pbits[1]+pbits[2])/3);
                this.data[destOffset + x] = (red + green + blue) / 3;
            }
            this.pos += padding; // Skip row padding
        }
    }
}

/**
 * Decodes a BMP file buffer into an 8-bit, bottom-up grayscale pixel array.
 * @param {ArrayBuffer} arrayBuffer - The buffer containing the BMP file data.
 * @returns {{data: Uint8Array, width: number, height: number}}
 */
export function decode(arrayBuffer) {
    const decoder = new BmpDecoder(arrayBuffer);
    return {
        data: decoder.data,
        width: decoder.width,
        height: decoder.height,
    };
}