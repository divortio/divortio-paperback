/**
 * @file checksumBlock.js
 * @overview
 * This class mirrors the C variable `cksum` in Printer.c:Printnextpage.
 * Since `cksum` is declared as type `t_data`, this class inherits all structural
 * properties and methods from DataBlock. Its function is to accumulate the XOR
 * redundancy checksum for a group of data blocks.
 *
 * C Reference:
 * t_data cksum;
 * typedef struct __attribute__ ((packed)) t_data
 */
import { DataBlock } from './dataBlock.js';

export class ChecksumBlock extends DataBlock {
    /**
     * Creates an instance of ChecksumBlock.
     * It inherits the structure, properties, and the pack() method from DataBlock.
     * @see C_TYPE: t_data
     * @param addr {number}
     * @param data {Uint8Array}
     * @param crc {number}
     * @param ecc {number}
     */
    constructor(addr=0,data=null, crc=0,ecc=0) {
        super(addr,data, crc,ecc);
        // No additional fields are needed as it uses the base t_data structure.
    }
}