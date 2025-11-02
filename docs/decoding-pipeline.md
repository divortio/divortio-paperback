# From Paper to File: The Decoding Pipeline

Recovering a digital file from a printed qdPaper page is a reverse-engineering challenge that relies heavily on computer vision and error correction algorithms. The process reconstructs the original data by finding the grid, reading the dots, and repairing any physical damage.

---

### 1. Image Loading & Grayscale Conversion

* **Action:** The scanned `.bmp` file is loaded into memory and converted into a simple, single-channel grayscale format.
* **Analogy:** Think of this like an MRI scan. Instead of processing complex colors, the computer sees only a map of light and dark intensities (a value from 0 to 255 for each pixel). This simplifies the task of finding the data dots against the paper background. The conversion uses a simple average of the red, green, and blue color channels for each pixel.
* **Source Code:** [`/public/js/lib/scanner/crc16.js`](../public/floppyPaper/lib/scanner/index.js)

### 2. Computer Vision: Grid & Angle Detection

* **Action:** The software analyzes the grayscale image to find the precise location, angle, and perspective of the data grid.
* **Analogy:** This is a pure computer vision task, much like a self-driving car identifying lane lines on a road. The software scans the image for the repeating patterns of black and white dots to calculate the grid's orientation, even if the page was scanned at a slight angle. The algorithm can tolerate a rotation of up to **+/- 7 degrees**.
* **Source Code:** [`/public/js/lib/decoder/getAngle.js`](../public/floppyPaper/lib/decoder/src/getAngle.js), [`/public/js/lib/decoder/findPeaks.js`](../public/floppyPaper/lib/decoder/src/findPeaks.js)

### 3. Bit Recognition

* **Action:** Using the grid position information from the previous step, the software samples the pixel intensity at the center of each dot's expected location. Based on a calculated threshold, it determines if the dot represents a binary `1` (black) or `0` (white).
* **Purpose:** To convert the analog, visual pattern of dots into a digital stream of ones and zeros.
* **Source Code:** [`/public/js/lib/decoder/recognizeBits.js`](../public/floppyPaper/lib/decoder/src/recognizeBits.js)

### 4. Block Assembly

* **Action:** The raw stream of bits is grouped back into 128-byte chunks, reassembling the original 32x32 [Data Blocks](./data-structure.md).
* **Analogy:** This is like piecing together a shredded document. The software knows the exact dimensions of each piece (1024 bits) and reassembles them in the correct order.
* **Source Code:** [`/public/js/lib/decoder/decodeBlock.js`](../public/floppyPaper/lib/decoder/src/decodeBlock.js)

### 5. Error Correction Decoding

* **Action:** This is the most critical step for resilience. The decoder uses the 32-byte Reed-Solomon ECC within each block to detect and correct errors.
* **Analogy:** Think of this as a powerful "spell-checker" for physical data. If a coffee stain, scratch, or fold has made some dots unreadable, the decoder uses the redundant ECC data to mathematically reconstruct the missing or incorrect bits, perfectly repairing the damage. Learn more at [Concept: Reed-Solomon Error Correction](./error-correction.md).
* **Source Code:** [`/public/js/lib/ecc/crc16.js`](../public/floppyPaper/lib/ecc/index.js)

### 6. Data De-framing & Reassembly

* **Action:** With all blocks successfully decoded and repaired, the software extracts the core 90-byte data payload from each one, discarding the address, CRC, and ECC bytes. These payloads are then stitched together in the correct order to form a single, continuous data stream.
* **Source Code:** [`/public/js/lib/fileproc/dataRecovery.js`](../public/floppyPaper/lib/fileproc/dataRecovery.js)

### 7. Decompression & Decryption (Optional)

* **Action:** The reassembled data stream is processed to reverse the optional encoding steps.
    * **Decompression:** If the data was compressed, it is now decompressed using the Gzip algorithm.
    * **Decryption:** If the data was encrypted, the user-provided password is used to decrypt it with AES.
* **Analogy:** This is the final "unwrapping" of the file—first unzipping it, then unlocking it.
* **Source Code:** [`/public/js/lib/printer/compression.js`](../public/floppyPaper/lib/printer/compression.js), [`/public/js/lib/printer/encrypt.js`](../public/floppyPaper/lib/printer/encryption.js)

The result is a bit-for-bit perfect copy of the original digital file.

<br>

[<-- Back to Encoding Pipeline](./encoding-pipeline.md) | [Next: The qdPaper Data Block -->](./data-structure.md)