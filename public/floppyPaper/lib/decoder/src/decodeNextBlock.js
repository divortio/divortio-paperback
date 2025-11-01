/**
 * @fileoverview
 * Port of the `Decodenextblock` function from `Decoder.c`.
 * This function decodes a single block at the current (posx, posy)
 * coordinates, analyzes its content (data vs. superblock), and stores
 * it. It then advances the coordinates to the next block and returns
 * the current percentage complete.
 */

import { decodeBlock } from './decodeBlock.js';
import { NDATA, SUPERBLOCK } from '../../include/paperbak/constants.js';


// The 'Message' function from the original C code (paperbak.c)
// can be imported if progress/debug logging is desired.
// import { Message } from '../logging/log.js';

// C struct t_data: { addr: 4, data: 90, crc: 2, ecc: 32 }
// Offset for the 'data' field within the t_data struct
const T_DATA_DATA_OFFSET = 4; // sizeof(addr)

// C struct t_superdata (as layout within t_data's 128 bytes):
// { addr: 4, datasize: 4, pagesize: 4, origsize: 4, mode: 1,
//   attributes: 1, page: 2, modified: 8 (FILETIME), filecrc: 2, name: 64 }
// Offsets are from the start of the buffer.
const T_SUPERDATA_DATASIZE_OFFSET = 4;
const T_SUPERDATA_PAGESIZE_OFFSET = 8;
const T_SUPERDATA_ORIGSIZE_OFFSET = 12;
const T_SUPERDATA_MODE_OFFSET = 16;
const T_SUPERDATA_ATTRIBUTES_OFFSET = 17;
const T_SUPERDATA_PAGE_OFFSET = 18;
const T_SUPERDATA_MODIFIED_OFFSET = 20;
const T_SUPERDATA_FILECRC_OFFSET = 28;
const T_SUPERDATA_NAME_OFFSET = 30;
const T_SUPERDATA_NAME_LENGTH = 64;

/**
 * @typedef {import('./getAngle.js').PData} PData
 */

/**
 * Decodes the next block based on pdata's internal position (posx, posy)
 * and updates the pdata state.
 * Corresponds to `Decodenextblock` in `Decoder.c`.
 *
 * @param {PData} pdata - The processing data object, which is modified in place.
 * @returns {{pdata: PData, percent: number}} An object containing the modified
 * pdata object and the percentage of blocks processed.
 */
export function decodeNextBlock(pdata) {
    // C: int answer,ngroup,percent;
    // C: char s[TEXTLEN];
    // C: t_data result;

    // C: // Display percent of executed data and, if known, data name in progress bar.
    // C: //if (pdata->superblock.name[0]=='\0')
    // C: //  sprintf(s,"Processing image");
    // C: //else {
    // C: //  sprintf(s,"%.64s (page %i)",
    // C: //      pdata->superblock.name,pdata->superblock.page);
    // C: //}
    // C: //percent=(pdata->posy*pdata->nposx+pdata->posx)*100/
    // C: //  (pdata->nposx*pdata->nposy);
    // C: //  Message(s,percent);
    const percent = Math.floor(
        ((pdata.posy * pdata.nposx + pdata.posx) * 100) / (pdata.nposx * pdata.nposy)
    );
    // if (typeof Message === 'function') {
    //     let s = "Processing image";
    //     if (pdata.superblock.name[0] !== 0) {
    //         const decoder = new TextDecoder();
    //         const name = decoder.decode(pdata.superblock.name.subarray(0, pdata.superblock.name.indexOf(0)));
    //         s = `${name} (page ${pdata.superblock.page})`;
    //     }
    //     Message(s, percent);
    // }

    // C: // Decode block.
    // C: answer=Decodeblock(pdata,pdata->posx,pdata->posy,&result);
    // Note: 'result' here is the 128-byte Uint8Array (t_data)
    const { answer, result } = decodeBlock(pdata, pdata.posx, pdata.posy);

    // C: // If we are unable to locate block, probably we are outside the raster.
    // C: if (answer<0)
    // C:   goto finish;
    if (answer >= 0) {
        // Block was located, analyze it.
        // We need a DataView to read C struct fields from the Uint8Array buffer
        const resultDataView = new DataView(result.buffer);

        // C: // If this is the very first block located on the page, show it in the block
        // C: // display window.
        // C: //if (pdata->ngood==0 && pdata->nbad==0 && pdata->nsuper==0)
        // C: //  Displayblockimage(pdata,pdata->posx,pdata->posy,answer,&result);

        // (This is where Displayblockimage logic would go if implemented)

        // C: // Analyze answer.
        // C: if (answer>=17) {
        if (answer >= 17) {
            // C: // Error, block is unreadable.
            // C: pdata->nbad++; }
            pdata.nbad++;
        }
        // C: else if (result.addr==SUPERBLOCK) {
        else if (resultDataView.getUint32(0, true) === SUPERBLOCK) {
            // C: // Superblock.
            // C: pdata->superblock.addr=SUPERBLOCK;
            pdata.superblock.addr = SUPERBLOCK;

            // C: pdata->superblock.datasize=((t_superdata *)&result)->datasize;
            pdata.superblock.datasize = resultDataView.getUint32(T_SUPERDATA_DATASIZE_OFFSET, true);
            // C: pdata->superblock.pagesize=((t_superdata *)&result)->pagesize;
            pdata.superblock.pagesize = resultDataView.getUint32(T_SUPERDATA_PAGESIZE_OFFSET, true);
            // C: pdata->superblock.origsize=((t_superdata *)&result)->origsize;
            pdata.superblock.origsize = resultDataView.getUint32(T_SUPERDATA_ORIGSIZE_OFFSET, true);
            // C: pdata->superblock.mode=((t_superdata *)&result)->mode;
            pdata.superblock.mode = resultDataView.getUint8(T_SUPERDATA_MODE_OFFSET);
            // C: pdata->superblock.attributes=((t_superdata *)&result)->attributes;
            pdata.superblock.attributes = resultDataView.getUint8(T_SUPERDATA_ATTRIBUTES_OFFSET);
            // C: pdata->superblock.page=((t_superdata *)&result)->page;
            pdata.superblock.page = resultDataView.getUint16(T_SUPERDATA_PAGE_OFFSET, true);

            // C: pdata->superblock.modified=((t_superdata *)&result)->modified;
            // The 'modified' field is a 64-bit FILETIME (t_superdata is 128 bytes)
            pdata.superblock.modified = resultDataView.getBigUint64(T_SUPERDATA_MODIFIED_OFFSET, true);

            // C: pdata->superblock.filecrc=((t_superdata *)&result)->filecrc;
            pdata.superblock.filecrc = resultDataView.getUint16(T_SUPERDATA_FILECRC_OFFSET, true);

            // C: memcpy(pdata->superblock.name,((t_superdata *)&result)->name,64);
            const nameBytes = result.subarray(T_SUPERDATA_NAME_OFFSET, T_SUPERDATA_NAME_OFFSET + T_SUPERDATA_NAME_LENGTH);
            pdata.superblock.name.set(nameBytes);

            pdata.nsuper++;
            // C: pdata->nrestored+=answer; }
            pdata.nrestored += answer;
        }
        // C: else if (pdata->ngood<pdata->nposx*pdata.nposy) {
        else if (pdata.ngood < pdata.nposx * pdata.nposy) {
            // C: // Success, place data block into the intermediate buffer.
            const blockAddr = resultDataView.getUint32(0, true); // C: result.addr

            // C: pdata->blocklist[pdata->ngood].addr=result.addr & 0x0FFFFFFF;
            pdata.blocklist[pdata.ngood].addr = blockAddr & 0x0FFFFFFF;

            // C: ngroup=(result.addr>>28) & 0x0000000F;
            const ngroup = (blockAddr >> 28) & 0x0F;

            // C: if (ngroup>0) { ... }
            if (ngroup > 0) { // Recovery block
                // C: pdata->blocklist[pdata->ngood].recsize=ngroup*NDATA;
                pdata.blocklist[pdata.ngood].recsize = ngroup * NDATA;
                // C: pdata->superblock.ngroup=ngroup; }
                pdata.superblock.ngroup = ngroup;
            } else { // Data block
                // C: pdata->blocklist[pdata->ngood].recsize=0;
                pdata.blocklist[pdata.ngood].recsize = 0;
            }

            // C: memcpy(pdata->blocklist[pdata->ngood].data,result.data,NDATA);
            // 'result.data' is at offset 4 in the t_data struct (after addr).
            const dataBytes = result.subarray(T_DATA_DATA_OFFSET, T_DATA_DATA_OFFSET + NDATA);
            pdata.blocklist[pdata.ngood].data.set(dataBytes);

            pdata.ngood++;
            // C: // Number of bytes corrected by ECC may be misleading...
            // C: pdata->nrestored+=answer; };
            pdata.nrestored += answer;
        }

        // C: // Add block to quality map.
        // C: //Addblocktomap(pdata->posx,pdata->posy,answer);
    }

    // C: // Block processed, set new coordinates.
    // C: finish:
    // C: pdata->posx++;
    pdata.posx++;
    // C: if (pdata->posx>=pdata->nposx) {
    if (pdata.posx >= pdata.nposx) {
        // C: pdata->posx=0;
        pdata.posx = 0;
        // C: pdata->posy++;
        pdata.posy++;
        // C: if (pdata->posy>=pdata.nposy) {
        if (pdata.posy >= pdata.nposy) {
            // C: pdata->step++;                   // Page processed
            pdata.step++;
            // C: };
        }
        // C: };
    }
    // C: };

    // Return the modified pdata object (by reference) and the percent.
    return { pdata, percent };
}