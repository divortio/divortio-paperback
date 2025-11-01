import {createSuperblock} from "./createSuperBlock.js";

/**
 * Creates a new, zero-filled t_procdata object (decoder state).
 * C: t_procdata
 * @returns {import('../decoder/getAngle.js').PData}
 */
export function createPData() {
    return {
        step: 0,
        mode: 0,
        data: null, // Uint8Array
        sizex: 0,
        sizey: 0,
        gridxmin: 0,
        gridxmax: 0,
        gridymin: 0,
        gridymax: 0,
        searchx0: 0,
        searchx1: 0,
        searchy0: 0,
        searchy1: 0,
        cmean: 0,
        cmin: 0,
        cmax: 0,
        sharpfactor: 0.0,
        xpeak: 0.0,
        xstep: 0.0,
        xangle: 0.0,
        ypeak: 0.0,
        ystep: 0.0,
        yangle: 0.0,
        blockborder: 0.0,
        bufdx: 0,
        bufdy: 0,
        buf1: null, // Uint8Array
        buf2: null, // Uint8Array
        bufx: null, // Int32Array
        bufy: null, // Int32Array
        unsharp: null,
        sharp: null,
        blockxpeak: 0.0,
        blockxstep: 0.0,
        blockypeak: 0.0,
        blockystep: 0.0,
        nposx: 0,
        nposy: 0,
        posx: 0,
        posy: 0,
        uncorrected: new Uint8Array(128), // C: t_data uncorrected
        blocklist: [],     // Array of t_block objects
        superblock: createSuperblock(),
        maxdotsize: 0,
        orientation: -1,
        ngood: 0,
        nbad: 0,
        nsuper: 0,
        nrestored: 0,
    };
}