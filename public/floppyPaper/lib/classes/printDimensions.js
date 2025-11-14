
import {PaperDimensions} from "./dimensions/paperDimensions.js";
import {ImageDimensions} from "./dimensions/imageDimensions.js";


export class PrintDimensions {

    /**
     *
     * @type {PaperDimensions}
     */
    paper;

    /**
     *
     * @type {ImageDimensions}
     */
    image;

    /**
     * @param dpi {number} - Target resolution in dots per inch.
     * @param widthInch1000 {number} - Paper width in 1/1000th of an inch (A4 standard).
     * @param heightInch1000 {number}  - Paper height in 1/1000th of an inch (A4 standard).
     * @param redundancy {number} - The data redundancy ratio (pb_redundancy).
     * @param dotPercent {number} - Percentage in whole integer of cell size to use as dot mark
     * @param border {boolean=true}
     */
    constructor(dpi = 300,
                widthInch1000 = 8270,
                heightInch1000 = 11690,
                redundancy = 5,
                dotPercent = 70,
                border = true
    ) {
        this.paper =  new PaperDimensions(dpi, widthInch1000, heightInch1000);
        this.image = new ImageDimensions(this.paper.width.pixels,this.paper.height.pixels, redundancy, dotPercent, dpi, border);

    }
}