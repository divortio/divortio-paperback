# The qdPaper Data Block

The fundamental unit of data storage in the qdPaper format is the **Data Block**. Each block is a self-contained packet of information that holds a small chunk of the original file's data, along with addressing and robust error correction codes. All the data on a printed page is simply a grid of these blocks.

---

## Block Specification

Each data block consists of **128 bytes** of information, which are visually rendered as a 32x32 grid of dots (1024 dots total, with each dot representing one bit).

The 128-byte structure is broken down as follows:

* **Bytes 0-3: Address (4 bytes)**
    * This field serves as a unique identifier for the block, allowing the decoder to reassemble the file in the correct order, even if the pages are scanned out of sequence. It also contains metadata, such as the redundancy level used during encoding.

* **Bytes 4-93: Data Payload (90 bytes)**
    * This is the core of the block. It holds a 90-byte chunk of the user's (potentially compressed and encrypted) file data.

* **Bytes 94-95: CRC-16 Checksum (2 bytes)**
    * A checksum calculated from the first 94 bytes (Address + Data). The decoder uses this for a fast, initial check to see if the block was read correctly before attempting the more computationally expensive error correction.

* **Bytes 96-127: Reed-Solomon ECC (32 bytes)**
    * This is the block's powerful error correction payload. It is calculated from the preceding 96 bytes (Address + Data + CRC). These 32 bytes of redundant data allow the decoder to completely reconstruct the original 96 bytes even if a significant portion of the block is damaged or unreadable on the scanned page. For more details, see [Concept: Reed-Solomon Error Correction](./error-correction.md).

---

```[ 4-byte Address | 90-byte Data Payload | 2-byte CRC ] + [ 32-byte ECC ] ``` = 128 bytes total ( 96 bytes of primary information )

## Visual Representation

To create the visual 32x32 dot pattern, the 128-byte block is treated as 32 rows, where each row is a 32-bit number.

* **Orientation:** The C source code notes that a horizontal orientation was chosen for the bytes because it offers more resilience against certain printing artifacts (like inkjet row shifting), which might otherwise corrupt an entire 32-byte ECC code at once.

* **Pattern Balancing:** Before rendering, each 32-bit row is XORed with a checkerboard pattern (`0x55555555` or `0xAAAAAAAA`). This prevents long horizontal runs of solid black or white, which could interfere with the decoder's ability to lock onto the grid. It ensures a more balanced visual distribution of dots.



[<-- Back to Decoding Pipeline](./decoding-pipeline.md) | [Next: Error Correction -->](./error-correction.md)