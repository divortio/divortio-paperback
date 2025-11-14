import {PrintImage} from "./printImage.js";


export class PrintPage extends PrintImage {

    /**
     * @param pageNum {number}
     * @param dpi {number}
     * @param widthInch1000 {number} - Paper width in 1/1000th of an inch (A4 standard).
     * @param heightInch1000 {number}  - Paper height in 1/1000th of an inch (A4 standard).
     * @param redundancy {number}
     * @param dotPercent {number}
     * @param border {boolean}
     */
    constructor(pageNum,
                dpi = 300,
                widthInch1000 = 8270,
                heightInch1000 = 11690,
                redundancy = 5,
                dotPercent = 70,
                border = true
    ) {
        super(widthInch1000, heightInch1000, redundancy, dotPercent, dpi, border);
        /**
         *
         * @type {number}
         */
        this.pageNum = pageNum;
    }












}