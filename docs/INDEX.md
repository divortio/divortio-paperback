# Introduction to qdPaper

**qdPaper** ("Quantized Dot Paper" or "Quantized Data Paper") is a modern web application for creating high-density, resilient paper backups of digital files. It transforms any digital file into a printable image composed of a dense pattern of black and white dots. This image can be printed, stored physically, and later scanned to perfectly recover the original file.

The project is a testament to a robust, time-tested algorithm, representing the latest evolution in a lineage of software dating back nearly 20 years:

1.  **[Paperbak (2007)](https://ollydbg.de/Paperbak/):** The original concept and application created by Oleh Yuschuk (ollydbg) for Windows. It established the core principles of using high-density dot patterns and Reed-Solomon error correction for physical data storage.
2.  **[paperback-cli (2017)](https://github.com/wikinaut/paperback-cli):** A faithful C port by the Wikinaut community, which made the algorithm cross-platform and accessible via the command line.
3.  **[qdPaper (2025)](https://github.com/divortio/qdPaper) (Present):** Our modern JavaScript port, which brings this powerful technology to the web, making it accessible to anyone with a browser, printer, and scanner.

The core philosophy of qdPaper is resilience. It is designed to create non-electronic backups that are characteristically unaffected by common digital threats like bit rot, hardware failure, and electromagnetic disturbances.

---

## Table of Contents

### Core Concepts
* [**The Anatomy of a qdPaper Page**](./physical-format.md): Understand what you see on the printed paper, explained for both non-technical and technical audiences.
* [**From File to Paper: The Encoding Pipeline**](./encoding-pipeline.md): A step-by-step overview of how a digital file is transformed into a printable image.
* [**From Paper to File: The Decoding Pipeline**](./decoding-pipeline.md): Learn how a scanned image is processed to recover the original file.

### Technical Deep Dive
* [**The qdPaper Data Block**](./data-structure.md): A detailed specification of the fundamental 32x32 data block structure.
* [**Concept: Reed-Solomon Error Correction**](./error-correction.md): An accessible explanation of how the system can repair physical damage to the printed page.
* [**Concept: Grid Recognition and Perspective Correction**](./computer-vision.md): Learn about the computer vision algorithms used to find and read the data from a scanned image.

### Advanced Documentation
* [**Advanced/Galois Field Arithmetic**](./advanced/galois-field-arithmetic.md): The foundational mathematics behind Reed-Solomon error correction.
* [**Advanced/Reed-Solomon Deep Dive**](./advanced/reed-solomon-deep-dive.md): A detailed walkthrough of the Reed-Solomon encoding and decoding algorithms.