# From File to Paper: The Encoding Pipeline

The process of converting a digital file into a printable qdPaper image is a multi-stage pipeline. Each step prepares the data for the next, adding layers of compression, security, and resilience before the final image is rendered. This document outlines that process.

---

### 1. Data Preparation

* **Action:** The application first reads the selected digital file from the user's disk into a raw binary buffer (`Uint8Array`).
* **Purpose:** To get the file's contents into memory for processing. Metadata such as the filename and modification date is also stored for potential inclusion in the [optional header](./physical-format.md).
* **Source Code:** [`/public/js/lib/printer/prepareFile.js`](../public/js/lib/printer/prepareFile.js)

### 2. Compression (Optional)

* **Action:** If enabled, the raw file data is compressed using the Gzip algorithm.
* **Purpose:** To reduce the total amount of data that needs to be encoded, which in turn reduces the number of printed pages. This is most effective for uncompressed file types (like text files, `.bmp` images, etc.).
* **Source Code:** [`/public/js/lib/printer/compression.js`](../public/js/lib/printer/compression.js)

### 3. Encryption (Optional)

* **Action:** If enabled, the (potentially compressed) data is encrypted using AES.
* **Purpose:** To secure the data. Without the correct password, the scanned data is indecipherable. This is a direct port of the feature from the original Paperbak application.
* **Source Code:** [`/public/js/lib/printer/encryption.js`](../public/js/lib/printer/encryption.js)

### 4. Data Framing & Blocking

* **Action:** The processed data stream is segmented into small, 90-byte chunks. Each chunk becomes the payload for a **Data Block**. If the Header option is enabled, a special block containing the file's metadata is added to the very beginning of this sequence.
* **Purpose:** To break the large file into manageable units that can be individually encoded with error correction and rendered onto the page.
* **Source Code:** [`/public/js/lib/printer/initializePrint.js`](../public/js/lib/printer/initializePrint.js)

### 5. Error Correction Encoding

* **Action:** For each 90-byte data chunk, a series of mathematical operations are performed to generate a 32-byte **Reed-Solomon Error Correction Code (ECC)**. This ECC is appended to the data.
* **Purpose:** This is the core of qdPaper's resilience. These extra bytes contain redundant information that allows the decoder to detect and **repair physical damage** (e.g., scratches, ink smudges, folds) to the printed page. Learn more at [Concept: Reed-Solomon Error Correction](./error-correction.md).
* **Source Code:** [`/public/js/lib/ecc/index.js`](../public/js/lib/ecc/index.js)

### 6. Image Rendering

* **Action:** The final stage takes each complete data block (now 128 bytes: 4-byte address, 90-byte data, 2-byte CRC, 32-byte ECC) and renders it as a 32x32 grid of black and white dots into a 1-channel grayscale pixel buffer.
* **Purpose:** To create the final visual representation of the data. This raw pixel buffer is then passed to an encoder to create the final, downloadable `.bmp` file.
* **Source Code:** [`/public/js/lib/printer/printPage.js`](../public/js/lib/printer/printPage.js), [`/public/js/lib/printer/drawBlock.js`](../public/js/lib/printer/drawBlock.js)

<br>

[<-- Back to Physical Format](./physical-format.md) | [Next: The Decoding Pipeline -->](./decoding-pipeline.md)