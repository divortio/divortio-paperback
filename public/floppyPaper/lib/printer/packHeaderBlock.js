/**
 * @file packHeaderBlock.js
 * @overview
 * Utility to convert the logical SuperData instance (t_superdata) into its
 * raw, packed 128-byte binary format. This is necessary because C used a packed
 * struct while the JS class holds data in separate properties.
 */
import { ECC_SIZE, FILENAME_SIZE } from '../classes/constants.js';

/**
 * Packs a SuperData instance into a 128-byte Uint8Array/ArrayBuffer.
 *
 * @param {SuperData} headerBlock - The structured header block data.
 * @param {Uint8Array} [salt] - The 16-byte salt (if encryption is enabled).
 * @param {Uint8Array} [iv] - The 16-byte IV (if encryption is enabled).
 * @returns {Uint8Array} A 128-byte buffer representing the raw, packed t_superdata block.
 */
export function packHeaderBlock(headerBlock, salt=null, iv=null) {
    const BLOCK_SIZE = 128;
    const buffer = new ArrayBuffer(BLOCK_SIZE);
    const view = new DataView(buffer);
    let offset = 0;

    // The resulting packed buffer must match the memory layout defined by t_superdata.

    // 1. Core Metadata (4+4+4+4+1+1+2 = 20 bytes)
    view.setUint32(offset, headerBlock.addr, true); offset += 4; // addr (SUPERBLOCK)
    view.setUint32(offset, headerBlock.datasize, true); offset += 4; // datasize
    view.setUint32(offset, headerBlock.pagesize, true); offset += 4; // pagesize
    view.setUint32(offset, headerBlock.origsize, true); offset += 4; // origsize
    view.setUint8(offset, headerBlock.mode); offset += 1; // mode (uchar)
    view.setUint8(offset, headerBlock.attributes); offset += 1; // attributes (uchar)
    view.setUint16(offset, headerBlock.page, true); offset += 2; // page (ushort)

    // 2. Modified Time (FileTimePortable = 8 bytes)
    view.setUint32(offset, headerBlock.modified.dwLowDateTime, true); offset += 4;
    view.setUint32(offset, headerBlock.modified.dwHighDateTime, true); offset += 4;

    // 3. File CRC (2 bytes)
    view.setUint16(offset, headerBlock.filecrc, true); offset += 2;

    // 4. File Name + Padding (64 bytes)
    // C uses strncpy/memset. We use TextEncoder and fill the rest with zeros.
    const nameBytes = new TextEncoder().encode(headerBlock.name);
    const nameBuffer = new Uint8Array(buffer, offset, FILENAME_SIZE);
    nameBuffer.fill(0);
    nameBuffer.set(nameBytes.subarray(0, FILENAME_SIZE));
    offset += FILENAME_SIZE;

    // --- SPECIAL NOTE: SALTING/IV HACK ---
    // The original C decryption logic (in Fileproc.c) hacked Salt and IV into
    // the end of the NAME field, past the 32nd byte. We emulate this by overwriting
    // the latter half of the 64-byte name field if salt/iv is provided.
    // Name field is 64 bytes total. If name is shorter than 32 bytes, the hack space is guaranteed.
    const HACK_OFFSET = offset - FILENAME_SIZE + 32; // Offset to 32nd byte of name field

    if (salt && iv) {
        // C: salt=(uchar *)(pf->name)+32;
        // C: memcpy(iv, salt+16, 16); // IV is placed 16 bytes after the salt (byte 48)
        // This means Salt is bytes 32-47, IV is bytes 48-63.
        const hackBuffer = new Uint8Array(buffer, HACK_OFFSET, 32);
        hackBuffer.set(salt.subarray(0, 16), 0); // Salt (bytes 32-47)
        hackBuffer.set(iv.subarray(0, 16), 16);  // IV (bytes 48-63)
    }

    // 5. Checksum/ECC Fields (2 + 32 bytes)
    view.setUint16(offset, headerBlock.crc, true); offset += 2; // crc of previous fields
    // ECC field (32 bytes) is left at zero for now; drawBlock calculates and sets it later.
    // offset += ECC_SIZE (32);

    return new Uint8Array(buffer);
}