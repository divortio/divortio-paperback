

```text
main (main.c) 
└── if (mode == MODE_DECODE)
    └── nextBitmap (main.c) // Function wrapper for single or multiple pages
        └── Decodebitmap (Scanner.c)
            ├── fopen/fread (C stdlib) - Read BMP file header and content
            └── ProcessDIB (Scanner.c)
                ├── Bitmap conversion (to 8-bit grayscale)
                └── Startbitmapdecoding (Decoder.c) // Initializes pb_procdata and sets step = 1
                
        └── while (pb_procdata.step != 0)
            └── Nextdataprocessingstep (Decoder.c)
            
                // --- State 1: Initialization (Remove previous images/GUI cleanup) ---
                ├── CASE 1: [Internal state transition]
                
                // --- State 2: Rough Grid Detection ---
                ├── CASE 2: Getgridposition (Decoder.c)
                
                // --- State 3: Intensity & Sharpness Analysis ---
                ├── CASE 3: Getgridintensity (Decoder.c)
                
                // --- State 4: Determine X-Axis Geometry ---
                ├── CASE 4: Getxangle (Decoder.c)
                │   └── Findpeaks (Decoder.c) // Finds phase, step, and angle of vertical grid lines
                
                // --- State 5: Determine Y-Axis Geometry ---
                ├── CASE 5: Getyangle (Decoder.c)
                │   └── Findpeaks (Decoder.c) // Finds phase, step, and angle of horizontal grid lines
                
                // --- State 6: Prepare for Block Decoding ---
                ├── CASE 6: Preparefordecoding (Decoder.c) // Calculates block matrix size (nposx/y) & allocates block buffers
                
                // --- State 7: Decode Next Block (Core Processing Loop) ---
                ├── CASE 7: Decodenextblock (Decoder.c) // Runs until all blocks scanned
                │   └── Decodeblock (Decoder.c)
                │       ├── Affine Transformation (Rotate block and compensate for skew)
                │       ├── Sharpening Filter (if needed)
                │       ├── Findpeaks (Decoder.c) // Find exact grid lines inside current block
                │       └── Recognizebits (Decoder.c) // Main bit extraction and error check loop
                │           ├── (Loop 8 orientations x 9 thresholds)
                │           ├── Decode8 (Ecc.c) // Apply Reed-Solomon Error Correction
                │           └── Crc16 (Crc16.c) // Verify corrected data against block CRC
                
                // --- State 8: Finalize Page and Assemble File ---
                └── CASE 8: Finishdecoding (Decoder.c)
                    ├── Startnextpage (Fileproc.c) // Matches page to an incomplete file descriptor (t_fproc)
                    ├── for each block in blocklist
                    │   └── Addblock (Fileproc.c) // Inserts decoded block into file buffer
                    └── Finishpage (Fileproc.c)
                        ├── Block Restoration (XORing blocks with checksum blocks if only one is missing)
                        └── if (File is Complete - ndata == nblock)
                            └── Saverestoredfile (Fileproc.c) // Final file assembly
                                ├── (If Encrypted): Getpassword (paperbak.c) 
                                ├── (If Encrypted): AES Decryption (aes_cbc_decrypt, Crc16 validation)
                                ├── (If Compressed): BZ2_bzBuffToBuffDecompress (bzip2 library)
                                └── fopen/fwrite (C stdlib) // Write final output file to disk
```