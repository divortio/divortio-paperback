import createDataBlock from './createDataBlock.js';


/**
 * Creates a new, zero-filled t_printdata object (printer state).
 * C: t_printdata
 * @return {{dpi: number, dotpercent: number, step: number, infile: string, outbmp: string, hfile: null, modified: bigint, attributes: number, origsize: number, readsize: number, datasize: number, alignedsize: number, pagesize: number, password: string, compression: number, encryption: number, printheader: number, printborder: number, redundancy: number, buf: null, bufsize: number, readbuf: null, bufcrc: number, superdata: (Uint8Array | any), frompage: number, topage: number, ppix: number, ppiy: number, width: number, height: number, extratop: number, extrabottom: number, black: number, borderleft: number, borderright: number, bordertop: number, borderbottom: number, dx: number, dy: number, px: number, py: number, nx: number, ny: number, border: number, drawbits: null, bmi: Uint8Array<ArrayBuffer>, startdoc: number}}
 */
export  function createPrintData() {
    return {
        dpi: 300,
        dotpercent: 70,
        step: 0,
        infile: '',
        outbmp: '',
        hfile: null, // Will be File object
        modified: 0n,
        attributes: 0,
        origsize: 0,
        readsize: 0,
        datasize: 0,
        alignedsize: 0,
        pagesize: 0,
        password: '',
        compression: 0,
        encryption: 0,
        printheader: 0,
        printborder: 0,
        redundancy: 0,
        buf: null, // Uint8Array
        bufsize: 0,
        readbuf: null, // Uint8Array
        // bzstream is handled by compression library
        bufcrc: 0,
        superdata: createDataBlock(), // This is a t_superdata block (128 bytes)
        frompage: 0,
        topage: 100,
        ppix: 0,
        ppiy: 0,
        width: 0,
        height: 0,
        extratop: 0,
        extrabottom: 0,
        black: 0,
        borderleft: 0,
        borderright: 0,
        bordertop: 0,
        borderbottom: 0,
        dx: 0,
        dy: 0,
        px: 0,
        py: 0,
        nx: 0,
        ny: 0,
        border: 0,
        drawbits: null, // Uint8Array
        // C: uchar bmi[sizeof(BITMAPINFO)+256*sizeof(RGBQUAD)];
        // BITMAPINFOHEADER (40) + 256 * RGBQUAD (4) = 40 + 1024 = 1064
        bmi: new Uint8Array(1064),
        startdoc: 0,
    };
}