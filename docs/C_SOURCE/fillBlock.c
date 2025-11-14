
// Service function, clips regular 32x32-dot raster to bitmap in the position
// with given block coordinates (may be outside the bitmap).
static void Fillblock(int blockx,int blocky,uchar *bits,int width,int height,
  int border,int nx,int ny,int dx,int dy,int px,int py,int black
) {
  int i,j,x0,y0,x,y,m,n;
  uint32_t t;
  // Convert cell coordinates into the X-Y bitmap coordinates.
  x0=blockx*(NDOT+3)*dx+2*dx+border;
  y0=blocky*(NDOT+3)*dy+2*dy+border;
  // Print raster.
  for (j=0; j<32; j++) {
    if ((j & 1)==0)
      t=0x55555555;
    else {
      if (blocky<0 && j<=24) t=0;
      else if (blocky>=ny && j>8) t=0;
      else if (blockx<0) t=0xAA000000;
      else if (blockx>=nx) t=0x000000AA;
      else t=0xAAAAAAAA; };
    for (i=0; i<32; i++) {
      if (t & 1) {
        for (m=0; m<py; m++) {
          for (n=0; n<px; n++) {
            x=x0+i*dx+n;
            y=y0+j*dy+m;
            if (x<0 || x>=width || y<0 || y>=height)
              continue;
            bits[(height-y-1)*width+x]=(uchar)black;
          };
        };
      };
      t>>=1;
    };
  };
};