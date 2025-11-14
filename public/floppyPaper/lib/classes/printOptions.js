

export class PrintOptions  {

    /**
     *
     * @type {number}
     */
    dpi;

    /**
     *
     * @type {number}
     */
    widthInch1000;
    /**
     *
     * @type {number}
     */
    heightInch1000;

    /**
     *
     * @type {number}
     */
    dotPercent;

    /**
     *
     * @type {number}
     */
    redundancy;

    /**
     * @public
     * @type {number}
     * @description Palette index of the dots color (0 for black on paper, 64 for dark gray on bitmap).
     * @default 0
     * @see C_TYPE: int (4 bytes)
     */
    blackColor;

    /**
     *
     * @type {boolean}
     */
    border;
    /**
     * @type {number}
     */
    compression;
    /**
     * @type {boolean}
     */
    encryption;
    /**
     * @type {string}
     */
    password;

    /**
     *
     * @param dpi {number}
     * @param widthInch1000 {number} - Paper width in 1/1000th of an inch (A4 standard).
     * @param heightInch1000 {number}  - Paper height in 1/1000th of an inch (A4 standard).
     * @param dotPercent {number} - value between 50 and 90, default=70
     * @param redundancy {number} - value between 1 and 10, default=5
     * @param blackColor {number} - Palette index of the dots color (0 for black on paper, 64 for dark gray on bitmap).
     * @param border {boolean|number} - True/False to print border around image, default=true
     * @param compress {number} - 0-9 compression level, 0 is disabled. default=9
     * @param password {string} - optional password string, if provided encryption is enabled.
     */
    constructor(dpi = 300,
                widthInch1000= 8270,
                heightInch1000= 11690,
                dotPercent = 70,
                redundancy = 5,
                blackColor=64,
                border = true,
                compress = 9,
                password = '',
    ) {
        this.widthInch1000 = widthInch1000;
        this.heightInch1000 = heightInch1000;

        /**
         *
         * @type {number}
         */
        this.dpi = dpi;
        /**
         *
         * @type {number}
         */
        this.dotPercent = dotPercent;
        /**
         *
         * @type {number}
         */
        this.redundancy = redundancy;
        /**
         *
         * @type {number}
         */
        this.blackColor = blackColor;
        /**
         *
         * @type {boolean}
         */
        this.border = compress instanceof Boolean && border === true || border instanceof Number && border === 1;
        /**
         *
         * @type {String|null}
         */
        this.password = password instanceof String && password.length > 0 ? password : null;
        /**
         *
         * @type {boolean}
         */
        this.encryption = !!this.password;

        /**
         *
         * @type {number}
         */
        this.compress = compress instanceof Number && compress > 0 ? 9: 0 ;



    }


}