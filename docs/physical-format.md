# The Anatomy of a qdPaper Page

A printed qdPaper page can look like an abstract pattern of dots, but every element is precisely designed to store data reliably. This document explains the physical layout of a printed page.

---

## For the Everyday User

Imagine a qdPaper page as a high-tech checkerboard where every square is either black or white. This dense pattern of dots is a visual representation of your digital file.

When you look at a printed page, you will see a few key features:

* **The Data Field:** This is the main rectangular area filled with thousands of tiny black and white dots. This field holds the core data of your file.
* **The Header (Optional):** You might see a small block of readable text at the top of the dot pattern. This header contains basic information like the original filename and file size, allowing you to identify the contents of the paper backup without needing to scan it.
* **The Border (Optional):** A thin, black border may frame the entire data field. This helps visually separate the data from the rest of the page.



---

## For the Technical User

A qdPaper page is a monochrome bitmap rendered from a grid of fundamental units called **Data Blocks**.

* **Data Blocks:** Each block is a 32x32 matrix of dots (or "points"). These blocks are the atomic units that contain a chunk of the file's data, plus metadata and error correction codes. For a full specification, see [The qdPaper Data Block](./data-structure.md).
* **Grid Layout:** The data blocks themselves are arranged in a larger grid (`Nx` blocks wide by `Ny` blocks high) to fill the page. The decoding software uses the inherent grid structure for alignment, which allows for a higher data density compared to formats that require large, dedicated alignment markers.
* **Human-Readable Header:** If enabled, the very first data block is reserved for a human-readable header containing file metadata.
* **Optional Border:** If enabled, a 1-pixel black border is drawn around the entire data area. This is a direct port of the original Paperbak feature.

---

## Printing & Scanning Recommendations

The reliability of qdPaper depends on a clean print and scan. The algorithm was designed with the physical properties of paper, ink, and scanners in mind.

* **Resolution (DPI):** The most critical setting is the relationship between printing and scanning resolution. The original author's recommendation is to **print at a DPI that is half of your scanner's native resolution**.
    * *Example:* If your scanner's maximum resolution is 600 DPI, you should print your qdPaper at 300 DPI.
    * *Why?* This ensures that each printed dot is captured by a 2x2 square of scanner pixels, providing a clear, unambiguous signal for the decoding software to analyze.
* **Dot Size:** The default dot size is 70%. This is intentionally less than 100% to account for "ink bleeding," where ink spreads slightly on the paper. This gap between dots prevents them from merging and becoming unreadable.
* **Rotation Tolerance:** The decoding algorithm can automatically correct for rotation, but it has limits. A scanned page should not be tilted more than **+/- 7 degrees** from the horizontal axis.

<br>

[<-- Back to Introduction](./index.md) | [Next: The Encoding Pipeline -->](./encoding-pipeline.md)