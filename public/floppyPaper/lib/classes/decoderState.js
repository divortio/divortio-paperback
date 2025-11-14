/**
 * @file decoderState.js
 * @overview
 * This class mirrors the C structure `t_procdata`, which is the primary control
 * structure for the entire **decoding/scanning** pipeline (Computer Vision and Logic).
 * It manages the state machine (`step`), geometry parameters for the scanned grid,
 * temporary processing buffers, and statistics for the current page being decoded.
 *
 * It is located in the C source code in `wikinaut/paperback-cli/paperbak.h`.
 *
 * C Reference:
 * typedef struct t_procdata
 */
import { DataBlock } from './blocks/dataBlock.js';
import { DecodedBlock } from './decodedBlock.js';
import { DecodedHeaderBlock } from './decodedHeaderBlock.js';
import { M_BEST, NHYST, SUBDX } from './constants.js';

export class DecoderState {
    /**
     * Creates an instance of DecoderState, initializing properties to their C-style defaults (zeroed memory).
     * @param {object} [props={}] - Optional initial property values.
     */
    constructor(props = {}) {
        /**
         * @public
         * @type {number}
         * @description Next data processing step in the internal state machine (0 - idle).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.step = props.step !== undefined ? props.step : 0;

        /**
         * @public
         * @type {number}
         * @description Set of M_xxx flags, e.g., M_BEST (0x00000001) for best quality search mode.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.mode = props.mode !== undefined ? props.mode : 0;

        /**
         * @public
         * @type {null}
         * @description Pointer to the raw bitmap (scanned image) data loaded into memory.
         * @default null
         * @see C_TYPE: uchar *
         */
        this.data = null;

        /**
         * @public
         * @type {number}
         * @description X dimension (width) of the bitmap in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.sizex = props.sizex !== undefined ? props.sizex : 0;

        /**
         * @public
         * @type {number}
         * @description Y dimension (height) of the bitmap in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.sizey = props.sizey !== undefined ? props.sizey : 0;

        /**
         * @public
         * @type {number}
         * @description Rough minimal X grid limit, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.gridxmin = props.gridxmin !== undefined ? props.gridxmin : 0;

        /**
         * @public
         * @type {number}
         * @description Rough maximal X grid limit, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.gridxmax = props.gridxmax !== undefined ? props.gridxmax : 0;

        /**
         * @public
         * @type {number}
         * @description Rough minimal Y grid limit, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.gridymin = props.gridymin !== undefined ? props.gridymin : 0;

        /**
         * @public
         * @type {number}
         * @description Rough maximal Y grid limit, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.gridymax = props.gridymax !== undefined ? props.gridymax : 0;

        /**
         * @public
         * @type {number}
         * @description X grid search starting limit, in pixels. This limit is often influenced by NHYST (1024).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.searchx0 = props.searchx0 !== undefined ? props.searchx0 : 0;

        /**
         * @public
         * @type {number}
         * @description X grid search ending limit, in pixels. This limit is often influenced by NHYST (1024).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.searchx1 = props.searchx1 !== undefined ? props.searchx1 : 0;

        /**
         * @public
         * @type {number}
         * @description Y grid search starting limit, in pixels. This limit is often influenced by NHYST (1024).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.searchy0 = props.searchy0 !== undefined ? props.searchy0 : 0;

        /**
         * @public
         * @type {number}
         * @description Y grid search ending limit, in pixels. This limit is often influenced by NHYST (1024).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.searchy1 = props.searchy1 !== undefined ? props.searchy1 : 0;

        /**
         * @public
         * @type {number}
         * @description Mean grid intensity (0..255).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.cmean = props.cmean !== undefined ? props.cmean : 0;

        /**
         * @public
         * @type {number}
         * @description Minimal grid intensity found in the center area (darkest pixel value threshold).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.cmin = props.cmin !== undefined ? props.cmin : 0;

        /**
         * @public
         * @type {number}
         * @description Maximal grid intensity found in the center area (lightest pixel value threshold).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.cmax = props.cmax !== undefined ? props.cmax : 0;

        /**
         * @public
         * @type {number}
         * @description Estimated sharpness correction factor (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.sharpfactor = props.sharpfactor !== undefined ? props.sharpfactor : 0.0;

        /**
         * @public
         * @type {number}
         * @description Base X grid line position, in pixels (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.xpeak = props.xpeak !== undefined ? props.xpeak : 0.0;

        /**
         * @public
         * @type {number}
         * @description X grid step (distance between lines), in pixels (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.xstep = props.xstep !== undefined ? props.xstep : 0.0;

        /**
         * @public
         * @type {number}
         * @description X tilt (skew) angle, in radians (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.xangle = props.xangle !== undefined ? props.xangle : 0.0;

        /**
         * @public
         * @type {number}
         * @description Base Y grid line position, in pixels (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.ypeak = props.ypeak !== undefined ? props.ypeak : 0.0;

        /**
         * @public
         * @type {number}
         * @description Y grid step (distance between lines), in pixels (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.ystep = props.ystep !== undefined ? props.ystep : 0.0;

        /**
         * @public
         * @type {number}
         * @description Y tilt (skew) angle, in radians (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.yangle = props.yangle !== undefined ? props.yangle : 0.0;

        /**
         * @public
         * @type {number}
         * @description Relative width of border around a block (used for buffer sizing and block location calculation).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.blockborder = props.blockborder !== undefined ? props.blockborder : 0.0;

        /**
         * @public
         * @type {number}
         * @description PixelDimensions of the block processing buffers in X, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.bufdx = props.bufdx !== undefined ? props.bufdx : 0;

        /**
         * @public
         * @type {number}
         * @description PixelDimensions of the block processing buffers in Y, in pixels.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.bufdy = props.bufdy !== undefined ? props.bufdy : 0;

        /**
         * @public
         * @type {null}
         * @description Pointer to the first temporary buffer (for rotated and sharpened block data).
         * @default null
         * @see C_TYPE: uchar *
         */
        this.buf1 = null;

        /**
         * @public
         * @type {null}
         * @description Pointer to the second temporary buffer (for rotated and sharpened block data).
         * @default null
         * @see C_TYPE: uchar *
         */
        this.buf2 = null;

        /**
         * @public
         * @type {null}
         * @description Pointer to array holding X-axis data for block grid finding.
         * @default null
         * @see C_TYPE: int *
         */
        this.bufx = null;

        /**
         * @public
         * @type {null}
         * @description Pointer to array holding Y-axis data for block grid finding.
         * @default null
         * @see C_TYPE: int *
         */
        this.bufy = null;

        /**
         * @public
         * @type {null}
         * @description Pointer reference to either buf1 or buf2 holding the unsharpened image data.
         * @default null
         * @see C_TYPE: uchar *
         */
        this.unsharp = null;

        /**
         * @public
         * @type {null}
         * @description Pointer reference to either buf1 or buf2 holding the sharpened image data.
         * @default null
         * @see C_TYPE: uchar *
         */
        this.sharp = null;

        /**
         * @public
         * @type {number}
         * @description Exact block X position within the unsharp buffer (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.blockxpeak = props.blockxpeak !== undefined ? props.blockxpeak : 0.0;

        /**
         * @public
         * @type {number}
         * @description Exact block Y position within the unsharp buffer (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.blockypeak = props.blockypeak !== undefined ? props.blockypeak : 0.0;

        /**
         * @public
         * @type {number}
         * @description Exact block X dimension/step within the unsharp buffer (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.blockxstep = props.blockxstep !== undefined ? props.blockxstep : 0.0;

        /**
         * @public
         * @type {number}
         * @description Exact block Y dimension/step within the unsharp buffer (float).
         * @default 0.0
         * @see C_TYPE: float (4 bytes)
         */
        this.blockystep = props.blockystep !== undefined ? props.blockystep : 0.0;

        /**
         * @public
         * @type {number}
         * @description Total number of blocks detected/calculated in the X direction.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.nposx = props.nposx !== undefined ? props.nposx : 0;

        /**
         * @public
         * @type {number}
         * @description Total number of blocks detected/calculated in the Y direction.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.nposy = props.nposy !== undefined ? props.nposy : 0;

        /**
         * @public
         * @type {number}
         * @description Current block position to scan in X.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.posx = props.posx !== undefined ? props.posx : 0;

        /**
         * @public
         * @type {number}
         * @description Current block position to scan in Y.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.posy = props.posy !== undefined ? props.posy : 0;

        /**
         * @public
         * @type {DataBlock}
         * @description Data block instance to hold the uncorrected data (before ECC) for visual display/debugging.
         * @default new DataBlock()
         * @see C_TYPE: t_data
         */
        this.uncorrected = props.uncorrected instanceof DataBlock ? props.uncorrected : new DataBlock();

        /**
         * @public
         * @type {Array<DecodedBlock> | null}
         * @description List (array) of all decoded data/recovery blocks recognized on the current page.
         * @default null
         * @see C_TYPE: t_block *
         */
        this.blocklist = props.blocklist !== undefined ? props.blocklist : null;

        /**
         * @public
         * @type {DecodedHeaderBlock}
         * @description The most recently/most correctly decoded page header.
         * @default new DecodedHeaderBlock()
         * @see C_TYPE: t_superblock
         */
        this.superblock = props.superblock instanceof DecodedHeaderBlock ? props.superblock : new DecodedHeaderBlock();

        /**
         * @public
         * @type {number}
         * @description Maximal size of the single data dot in pixels (used for multi-pixel sampling optimization).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.maxdotsize = props.maxdotsize !== undefined ? props.maxdotsize : 0;

        /**
         * @public
         * @type {number}
         * @description Determined data block orientation (e.g., 0-7 for rotation/mirroring; -1: unknown).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.orientation = props.orientation !== undefined ? props.orientation : 0;

        /**
         * @public
         * @type {number}
         * @description Page statistics: number of successfully decoded blocks (data or recovery).
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.ngood = props.ngood !== undefined ? props.ngood : 0;

        /**
         * @public
         * @type {number}
         * @description Page statistics: number of unreadable/failed blocks.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.nbad = props.nbad !== undefined ? props.nbad : 0;

        /**
         * @public
         * @type {number}
         * @description Page statistics: number of good superblocks found.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.nsuper = props.nsuper !== undefined ? props.nsuper : 0;

        /**
         * @public
         * @type {number}
         * @description Page statistics: total number of bytes successfully restored by ECC on this page.
         * @default 0
         * @see C_TYPE: int (4 bytes)
         */
        this.nrestored = props.nrestored !== undefined ? props.nrestored : 0;
    }
}