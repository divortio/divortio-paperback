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
     * @param {object} [props={}] - Optional initial property values.
     * @see C_TYPE: t_data
     */
    constructor(props = {}) {
        super(props);
        // No additional fields are needed as it uses the base t_data structure.
    }
}