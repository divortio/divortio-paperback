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
    // C: Message(s,0);
    Message("Reading bitmap...", 0);
    // C: //Updatebuttons();

    // C: // Open file and verify that this is the valid bitmap of known type.
    // C: f=fopen(pb_inbmp,"rb");
    // C: i=fread(buf,1,sizeof(buf),f);
    // ... all C file I/O and manual parsing is replaced by bmpDecode ...
    const image = decode(fileBuffer);

    // C: if (f==NULL) { ... return -1; };
    // C: if (i!=sizeof(buf)) { ... return -1; };
    if (!image || !image.header) {
        // C: sprintf(s,"Unable to read %s%s",fil,ext);
        // C: Reporterror(s);
        Reporterror("Unable to read or parse bitmap file.");
        return -1;
    }

    // C: pbfh=(BITMAPFILEHEADER *)buf;
    // C: pbih=(BITMAPINFOHEADER *)(buf+sizeof(BITMAPFILEHEADER));
    // We get the header info directly from the bmpDecode result.
    const pbih = image.header;

    // C: if (pbfh->bfType!=CHAR_BM || ...
    // Note: The `bmpDecode` library already checks the 'BM' magic number (bfType).
    // We just need to port the validation checks for the BITMAPINFOHEADER.
    if (
        // C: pbih->biSize!=sizeof(BITMAPINFOHEADER) || pbih->biPlanes!=1 ||
        // (biSize is checked by bmpDecode)
        (pbih.biPlanes !== 1) ||

        // C: (pbih->biBitCount!=8 && pbih->biBitCount!=24) ||
        (pbih.biBitCount !== 8 && pbih.biBitCount !== 24) ||

        // C: (pbih->biBitCount==24 && pbih->biClrUsed!=0) ||
        (pbih.biBitCount === 24 && pbih.biClrUsed !== 0) ||

        // C: pbih->biCompression!=BI_RGB ||
        (pbih.biCompression !== BI_RGB) ||

        // C: pbih->biWidth<128 || pbih->biWidth>32768 ||
        (pbih.biWidth < 128 || pbih.biWidth > 32768) ||

        // C: pbih->biHeight<128 || pbih->biHeight>32768
        (pbih.biHeight < 128 || pbih.biHeight > 32768)
    ) {
        // C: sprintf(s,"Unsupported bitmap type: %s%s",fil,ext);
        // C: Reporterror(s);
        Reporterror(`Unsupported bitmap type. Must be 8-bit or 24-bit uncompressed, 
            with dimensions between 128x128 and 32768x32768.`);
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
    // C: fclose(f);
    // C: if (i!=size) { ... }
    // (All C memory allocation and file reading is handled by bmpDecode)

    // C: // Process bitmap.
    // C: ProcessDIB(data,pbfh->bfOffBits-sizeof(BITMAPFILEHEADER));
    // In our port, we pass the *parsed image object* to processDIB,
    // which is much cleaner than passing the raw data and an offset.
    const result = processDIB(pdata, image, pb_bestquality);

    // C: free(data);
    // (No manual free needed in JS)

    // C: return 0;
    return result;
}