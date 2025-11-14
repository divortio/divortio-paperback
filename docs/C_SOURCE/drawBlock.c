

// Service function, puts block of data to bitmap as a grid of 32x32 dots in
// the position with given index. Bitmap is treated as a continuous line of
// cells, where end of the line is connected to the start of the next line.
static void Drawblock(int index,t_data *block,uchar *bits,int width,int height,
    int border,int nx,int ny,int dx,int dy,int px,int py,int black
) {
    int i,j,x,y,m,n;
    uint32_t t;
    // Convert cell index into the X-Y bitmap coordinates.
    x=(index%nx)*(NDOT+3)*dx+2*dx+border;
    y=(index/nx)*(NDOT+3)*dy+2*dy+border;
    bits+=(height-y-1)*width+x;
    // Add CRC.
    block->crc=(ushort)(Crc16((uchar *)block,NDATA+sizeof(uint32_t))^0x55AA);
    // Add error correction code.
    Encode8((uchar *)block,block->ecc,127);
    // Print block. To increase the reliability of empty or half-empty blocks
    // and close-to-0 addresses, I XOR all data with 55 or AA.
    for (j=0; j<32; j++) {
        t=((uint32_t *)block)[j];
        if ((j & 1)==0)
            t^=0x55555555;
        else
            t^=0xAAAAAAAA;
        x=0;
        for (i=0; i<32; i++) {
            if (t & 1) {
                for (m=0; m<py; m++) {
                    for (n=0; n<px; n++) {
                        bits[x-m*width+n]=(uchar)black;
                    };
                };
            };
            t>>=1;
            x+=dx;
        };
        bits-=dy*width;
    };
};
