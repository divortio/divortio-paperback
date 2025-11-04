/**
 * @fileoverview
 * Port of the `Decodebitmap` function from `Scanner.c`.
 * This is the main entry point for the scanning/decoding process.
 * It takes a raw BMP file buffer, parses it, validates the headers,
 * and then passes the parsed image to processDIB for grayscale conversion
 * and to kick off the decoding pipeline.
 */

// bmpDecode is the JS equivalent of C's fopen, fread, and manual header parsing
import { decode } from '../bmpImage/bmpDecode.js';
// processDIB is the next step, which this function calls on success
import { processDIB } from './processDIB.js';
import { Message, Reporterror } from '../logging/log.js';

/**
 * @typedef {import('../decoder/src/getAngle.js').PData} PData
 */

// From C: #define BI_RGB 0
const BI_RGB = 0;

/**
 * Opens and decodes a bitmap from an ArrayBuffer.
 * Corresponds to `Decodebitmap` in `Scanner.c`.
 *
 * @param {PData} pdata - The main processing data object.
 * @param {ArrayBuffer} fileBuffer - The ArrayBuffer of the BMP file.
 * @param {boolean} pb_bestquality - Global flag for best quality mode.
 * @returns {number} 0 on success, -1 on error.
 */
export function decodeBitmap(pdata, fileBuffer, pb_bestquality) {
    // C: char s[TEXTLEN+MAXPATH],fil[MAXFILE],ext[MAXEXT];
    // C: ...
    // C: sprintf(s,"Reading %s%s...",fil,ext);
    Message(`[0%] Reading bitmap...`);

    let bmpData;
    try {
        // This call returns { data: Uint8Array, width: number, height: number }
        // The data is 32-bit RGBA.
        // bmpDecode.js throws an error if the file is not a valid BMP.
        bmpData = decode(fileBuffer);
    } catch (e) {
        // If the bmpDecode library fails, we throw our own error.
        throw new Error(`Unable to read or parse bitmap file. Original error: ${e.message}`);
    }

    // C: if (pbfh->bfType!=CHAR_BM ||
    //    pbih->biSize!=sizeof(BITMAPINFOHEADER) || pbih->biPlanes!=1 ||
    //    (pbih->biBitCount!=8 && pbih->biBitCount!=24) ||
    //    (pbih->biBitCount==24 && pbih->biClrUsed!=0) ||
    //    pbih->biCompression!=BI_RGB ||
    //    pbih->biWidth<128 || pbih->biWidth>32768 ||
    //    pbih->biHeight<128 || pbih->biHeight>32768
    // ) {
    // We only validate the dimensions, as bmpDecode.js has already validated the format
    // and converted the pixel data.
    if (
        // C: pbih->biWidth<128 || pbih->biWidth>32768 ||
        (bmpData.width < 128 || bmpData.width > 32768) ||

        // C: pbih->biHeight<128 || pbih->biHeight>32768
        (bmpData.height < 128 || bmpData.height > 32768)
    ) {
        // C: sprintf(s,"Unsupported bitmap type: %s%s\",fil,ext);
        // C: Reporterror(s);
        Reporterror(`Unsupported bitmap dimensions. Must be between 128x128 and 32768x32768 pixels.`);
        // C: fclose(f); return -1; };
        return -1;
    }

    // C: // Allocate buffer and read file.
    // C: fseek(f,0,SEEK_END);
    // C: size=ftell(f)-sizeof(BITMAPFILEHEADER);
    // C: data=(uchar *)malloc(size);
    // C: if (data==NULL) { ... }
    // C: fseek(f,sizeof(BITMAPFILEHEADER),SEEK_SET);
    // C: i=fread(data,1,size,f);
    //
    // JS: The `bmpData` object from `bmpDecode` already contains the pixel data.
    // The `processDIB` function will access it via `bmpData.data`.

    // C: Processdib(pbih,data,pdata);
    // We now pass the {data, width, height} object to processDIB
    return processDIB(pdata, bmpData, pb_bestquality);
}