/**
 * @author shaozilee
 *
 * BMP format decoder, ESM conversion.
 * Modified to use browser-native APIs (Uint8Array, DataView) instead of Buffer.
 * Supports 1, 4, 8, 15, 16, 24, and 32-bit BMP.
 */

class BmpDecoder {
    /**
     * @param {ArrayBuffer} arrayBuffer - The BMP file data.
     */
    constructor(arrayBuffer) {
        this.arrayBuffer = arrayBuffer;
        this.dataView = new DataView(arrayBuffer);
        this.uint8Array = new Uint8Array(arrayBuffer);
        this.pos = 0;
        this.bottom_up = true;

        const flag = String.fromCharCode(this.dataView.getUint8(0), this.dataView.getUint8(1));
        if (flag !== "BM") {
            throw new Error("Invalid BMP File: Missing 'BM' signature.");
        }
        this.pos += 2;

        this.parseHeader();
        this.parsePalette();
        this.parseRGBA();
    }

    // Helper methods to read from DataView
    _readUInt32LE() { const v = this.dataView.getUint32(this.pos, true); this.pos += 4; return v; }
    _readInt32LE() { const v = this.dataView.getInt32(this.pos, true); this.pos += 4; return v; }
    _readUInt16LE() { const v = this.dataView.getUint16(this.pos, true); this.pos += 2; return v; }
    _readUInt8() { return this.dataView.getUint8(this.pos++); }

    parseHeader() {
        this.fileSize = this._readUInt32LE();
        this.reserved = this._readUInt32LE();
        this.offset = this._readUInt32LE();
        this.headerSize = this._readUInt32LE();
        this.width = this._readUInt32LE();
        this.height = this._readInt32LE();
        this.planes = this._readUInt16LE();
        this.bitPP = this._readUInt16LE();
        this.compress = this._readUInt32LE();
        this.rawSize = this._readUInt32LE();
        this.hr = this._readUInt32LE();
        this.vr = this._readUInt32LE();
        this.colors = this._readUInt32LE();
        this.importantColors = this._readUInt32LE();

        if (this.height < 0) {
            this.height *= -1;
            this.bottom_up = false;
        }

        // Some 16-bit BMPs are encoded as 15-bit
        if (this.bitPP === 16 && this.compress === 3) {
            this.bitPP = 15;
        }
    }

    parsePalette() {
        this.palette = [];
        const numColors = this.colors === 0 && this.bitPP <= 8 ? 1 << this.bitPP : this.colors;

        for (let i = 0; i < numColors; i++) {
            const blue = this._readUInt8();
            const green = this._readUInt8();
            const red = this._readUInt8();
            const quad = this._readUInt8();
            this.palette.push({ red, green, blue, quad });
        }
    }

    parseRGBA() {
        this.pos = this.offset;
        const dataSize = this.width * this.height * 4;
        this.data = new Uint8Array(dataSize);

        const bitParser = this[`bit${this.bitPP}`];
        if (bitParser) {
            bitParser.call(this);
        } else {
            throw new Error(`Unsupported bit depth: ${this.bitPP}`);
        }
    }

    setPixel(line, x, color) {
        const pos = (line * this.width + x) * 4;
        this.data[pos] = color.red || 0;
        this.data[pos + 1] = color.green || 0;
        this.data[pos + 2] = color.blue || 0;
        this.data[pos + 3] = color.quad !== undefined ? color.quad : 0xff;
    }

    bit1() {
        const rowBytes = Math.ceil(this.width / 8);
        const padding = rowBytes % 4 === 0 ? 0 : 4 - (rowBytes % 4);

        for (let y = 0; y < this.height; y++) {
            const line = this.bottom_up ? this.height - 1 - y : y;
            for (let xByte = 0; xByte < rowBytes; xByte++) {
                const byte = this._readUInt8();
                for (let i = 0; i < 8; i++) {
                    const x = xByte * 8 + i;
                    if (x < this.width) {
                        const colorIndex = (byte >> (7 - i)) & 0x1;
                        this.setPixel(line, x, this.palette[colorIndex]);
                    }
                }
            }
            this.pos += padding;
        }
    }

    bit4() {
        const rowBytes = Math.ceil(this.width / 2);
        const padding = rowBytes % 4 === 0 ? 0 : 4 - (rowBytes % 4);

        for (let y = 0; y < this.height; y++) {
            const line = this.bottom_up ? this.height - 1 - y : y;
            for (let x = 0; x < this.width; x += 2) {
                const byte = this._readUInt8();
                const firstPixel = byte >> 4;
                const secondPixel = byte & 0x0f;
                this.setPixel(line, x, this.palette[firstPixel]);
                if ((x + 1) < this.width) {
                    this.setPixel(line, x + 1, this.palette[secondPixel]);
                }
            }
            this.pos += padding;
        }
    }

    bit8() {
        const padding = this.width % 4 === 0 ? 0 : 4 - (this.width % 4);
        for (let y = 0; y < this.height; y++) {
            const line = this.bottom_up ? this.height - 1 - y : y;
            for (let x = 0; x < this.width; x++) {
                const colorIndex = this._readUInt8();
                this.setPixel(line, x, this.palette[colorIndex]);
            }
            this.pos += padding;
        }
    }

    bit15() {
        const padding = (this.width * 2) % 4 === 0 ? 0 : 4 - ((this.width * 2) % 4);
        for (let y = 0; y < this.height; y++) {
            const line = this.bottom_up ? this.height - 1 - y : y;
            for (let x = 0; x < this.width; x++) {
                const word = this._readUInt16LE();
                const red = (word >> 10) & 0x1f;
                const green = (word >> 5) & 0x1f;
                const blue = word & 0x1f;
                this.setPixel(line, x, {
                    red: (red * 255) / 31,
                    green: (green * 255) / 31,
                    blue: (blue * 255) / 31,
                });
            }
            this.pos += padding;
        }
    }

    bit16() {
        const padding = (this.width * 2) % 4 === 0 ? 0 : 4 - ((this.width * 2) % 4);
        for (let y = 0; y < this.height; y++) {
            const line = this.bottom_up ? this.height - 1 - y : y;
            for (let x = 0; x < this.width; x++) {
                const word = this._readUInt16LE();
                const red = (word >> 11) & 0x1f;
                const green = (word >> 5) & 0x3f;
                const blue = word & 0x1f;
                this.setPixel(line, x, {
                    red: (red * 255) / 31,
                    green: (green * 255) / 63,
                    blue: (blue * 255) / 31,
                });
            }
            this.pos += padding;
        }
    }

    bit24() {
        // Row size must be a multiple of 4 bytes.
        const padding = (this.width * 3) % 4 === 0 ? 0 : 4 - ((this.width * 3) % 4);
        for (let y = 0; y < this.height; y++) {
            const line = this.bottom_up ? this.height - 1 - y : y;
            for (let x = 0; x < this.width; x++) {
                const blue = this._readUInt8();
                const green = this._readUInt8();
                const red = this._readUInt8();
                this.setPixel(line, x, { red, green, blue });
            }
            this.pos += padding;
        }
    }

    bit32() {
        // 32-bit BMPs have no padding.
        for (let y = 0; y < this.height; y++) {
            const line = this.bottom_up ? this.height - 1 - y : y;
            for (let x = 0; x < this.width; x++) {
                const blue = this._readUInt8();
                const green = this._readUInt8();
                const red = this._readUInt8();
                const alpha = this._readUInt8();
                this.setPixel(line, x, { red, green, blue, quad: alpha });
            }
        }
    }
}

/**
 * Decodes a BMP file buffer.
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