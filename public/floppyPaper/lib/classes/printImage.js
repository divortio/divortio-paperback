import {ImageDimensions} from './dimensions/imageDimensions.js';


/**
 * @augments ImageDimensions
 */
export class PrintImage extends ImageDimensions {

    /**
     *
     * @type {Uint8Array<ArrayBuffer>}
     */
    _drawbits;

    /**
     *
     * @param dpi {number}
     * @param widthInch1000 {number} - Paper width in 1/1000th of an inch (A4 standard).
     * @param heightInch1000 {number}  - Paper height in 1/1000th of an inch (A4 standard).
     * @param redundancy {number}
     * @param dotPercent {number}
     * @param border {boolean}
     */
    constructor(dpi = 300,
                widthInch1000 = 8270,
                heightInch1000 = 11690,
                redundancy = 5,
                dotPercent = 70,
                border = true
    ) {
        super(widthInch1000, heightInch1000, redundancy, dotPercent, dpi, border);
        this._drawbits = null;
    }

    /**
     * Lazily allocates and returns the Uint8Array buffer that holds the raw pixel data (drawbits).
     * This saves memory until the buffer is absolutely needed for drawing.
     * @returns {Uint8Array} The pixel buffer array, sized (finalImageWidth * finalImageHeight).
     */
    get drawbits() {
        if (this._drawbits === null) {
            const bufferSize = this.width.pixels * this.height.pixels;
        // The C equivalent uses malloc, but in JS we use new Uint8Array.
            this._drawbits = new Uint8Array(bufferSize);
            // Optionally check size: if (bufferSize === 0) Reporterror("Low memory", etc.)
        }
        return this._drawbits;
    }

}