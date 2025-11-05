

```text

main (main.c) 
└── Printfile (Printer.c)
    │   // Initializes pb_printdata and sets step = 1
    └── while (pb_printdata.step != 0)
        └── Nextdataprintingstep (Printer.c) 
            
            // --- State 1: Open File and Allocate Buffers (Preparefiletoprint) ---
            ├── CASE 1: Preparefiletoprint (Printer.c)
            │   ├── OS-specific stat/attribute functions (e.g., GetFileTime/stat)
            │   ├── fopen (C stdlib) 
            │   ├── malloc (C stdlib) - Allocates main buffers (buf, readbuf)
            │   └── Reporterror/Message (paperbak.c)
            
            // --- State 2: Initialize Compressor (Preparecompressor) ---
            ├── CASE 2: Preparecompressor (Printer.c)
            │   └── BZ2_bzCompressInit (bzip2 library)
            
            // --- State 3: Read and Compress (Readandcompress) ---
            ├── CASE 3: Readandcompress (Printer.c)  // Loop until file fully read
            │   ├── fread (C stdlib) - Read file chunk
            │   ├── Message (paperbak.c) - Display progress
            │   └── BZ2_bzCompress (bzip2 library) - Compress chunk (if compression enabled)
            
            // --- State 4: Finalize Compression (Finishcompression) ---
            ├── CASE 4: Finishcompression (Printer.c)
            │   ├── BZ2_bzCompress (BZ_FINISH)
            │   ├── BZ2_bzCompressEnd 
            │   └── fclose (C stdlib) / free (C stdlib) - Clean up I/O buffers
            
            // --- State 5: Encrypt Data (Encryptdata) ---
            ├── CASE 5: Encryptdata (Printer.c) 
            │   // Note: Logic for CRC and AES is in this function (mostly commented out in C source)
            │   ├── (If active): Crc16 (Crc16.c)
            │   └── (If active): Getpassword (paperbak.c) / AES Encryption calls (aes.h/lib)
            
            // --- State 6: Initialize Printing Parameters (Initializeprinting) ---
            ├── CASE 6: Initializeprinting (Printer.c)
            │   ├── fnsplit/fnmerge (PortLibC) - Process file name for header
            │   ├── max/min (paperbak.c) - Calculate page geometry
            │   └── malloc (C stdlib) - Allocate final drawing buffer (drawbits)
            
            // --- State 7: Print Next Page (Printnextpage) ---
            ├── CASE 7: Printnextpage (Printer.c)  // Loop per page
            │   ├── Message (paperbak.c) - Display page progress
            │   ├── Fillblock (Printer.c) - Draw border raster
            │   ├── Drawblock (Printer.c) - Draw Superblocks and Data Blocks
            │   │   ├── Crc16 (Crc16.c) - Calculate Block CRC
            │   │   └── Encode8 (Ecc.c) - Generate Reed-Solomon ECC
            │   └── Bitmap Output (Save to File)
            │       ├── fnsplit/fnmerge (PortLibC) - Generate page-specific filename
            │       ├── fopen/fwrite (C stdlib) - Write BMP header, info, and raw data
            
            // --- State 8: Finish Printing (Stopprinting) ---
            └── CASE 8: Stopprinting (Printer.c) 
                ├── BZ2_bzCompressEnd (if compression active)
                └── free (C stdlib) - Release all buffers
```