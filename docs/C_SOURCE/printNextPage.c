// Prints one complete page or saves one bitmap.
static void Printnextpage(t_printdata *print) {
  int dx,dy,px,py,nx,ny,width,height,border,redundancy,black;
  int i,j,k,l,n,success,basex,nstring,npages,rot;
  char s[TEXTLEN],ts[TEXTLEN/2];
  char drv[MAXDRIVE],dir[MAXDIR],nam[MAXFILE],ext[MAXEXT],path[MAXPATH+32];
  uchar *bits;
  uint32_t u,size,pagesize,offset;
  t_data block,cksum;
  //HANDLE hbmpfile;
  FILE *hbmpfile;
  BITMAPFILEHEADER bmfh;
  BITMAPINFO *pbmi;
  // Calculate offset of this page in data.
  offset=print->frompage*print->pagesize;
  if (offset>=print->datasize || print->frompage>print->topage) {
    // All requested pages are printed, finish this step.
    print->step++;
    return;
  };
  // Report page.
  npages=(print->datasize+print->pagesize-1)/print->pagesize;
  sprintf(s,"Processing page %i of %i...",print->frompage+1,npages);
  Message(s,0);
  // Get frequently used variables.
  dx=print->dx;
  dy=print->dy;
  px=print->px;
  py=print->py;
  nx=print->nx;
  ny=print->ny;
  width=print->width;
  border=print->border;
  size=print->alignedsize;
  pagesize=print->pagesize;
  redundancy=print->redundancy;
  black=print->black;
  bits=print->drawbits;
  // Check if we can reduce the vertical size of the table on the last page.
  // To assure reliable orientation, I request at least 3 rows.
  l=min(size-offset,pagesize);
  n=(l+NDATA-1)/NDATA;                 // Number of pure data blocks on page
  nstring=                             // Number of groups (length of string)
    (n+redundancy-1)/redundancy;
  n=(nstring+1)*(redundancy+1)+1;      // Total number of blocks to print
  n=max((n+nx-1)/nx,3);                // Number of rows (at least 3)
  if (ny>n) ny=n;
  height=ny*(NDOT+3)*dy+py+2*border;
  // Initialize bitmap to all white.
  memset(bits,255,height*width);
  // Draw vertical grid lines.
  for (i=0; i<=nx; i++) {
    if (print->printborder) {
      basex=i*(NDOT+3)*dx+border;
      for (j=0; j<ny*(NDOT+3)*dy+py+2*border; j++,basex+=width) {
        for (k=0; k<px; k++) bits[basex+k]=0;
      };
    }
    else {
      basex=i*(NDOT+3)*dx+width*border+border;
      for (j=0; j<ny*(NDOT+3)*dy; j++,basex+=width) {
        for (k=0; k<px; k++) bits[basex+k]=0;
      };
    };
  };
  // Draw horizontal grid lines.
  for (j=0; j<=ny; j++) {
    if (print->printborder) {
      for (k=0; k<py; k++) {
        memset(bits+(j*(NDOT+3)*dy+k+border)*width,0,width);
      };
    }
    else {
      for (k=0; k<py; k++) {
        memset(bits+(j*(NDOT+3)*dy+k+border)*width+border,0,
            nx*(NDOT+3)*dx+px);
      };
    };
  };
  // Fill borders with regular raster.
  if (print->printborder) {
    for (j=-1; j<=ny; j++) {
      Fillblock(-1,j,bits,width,height,border,nx,ny,dx,dy,px,py,black);
      Fillblock(nx,j,bits,width,height,border,nx,ny,dx,dy,px,py,black);
    };
    for (i=0; i<nx; i++) {
      Fillblock(i,-1,bits,width,height,border,nx,ny,dx,dy,px,py,black);
      Fillblock(i,ny,bits,width,height,border,nx,ny,dx,dy,px,py,black);
    };
  };
  // Update superblock.
  print->superdata.page=
    (ushort)(print->frompage+1);       // Page number is 1-based
  // First block in every string (including redundancy string) is a superblock.
  // To improve redundancy, I avoid placing blocks belonging to the same group
  // in the same column (consider damaged diode in laser printer).
  for (j=0; j<=redundancy; j++) {
    k=j*(nstring+1);
    if (nstring+1>=nx)
      k+=(nx/(redundancy+1)*j-k%nx+nx)%nx;
    Drawblock(k,(t_data *)&print->superdata,
        bits,width,height,border,nx,ny,dx,dy,px,py,black);
  };
  // Now the most important part - encode and draw data, group by group!
  for (i=0; i<nstring; i++) {
    // Prepare redundancy block.
    cksum.addr=offset ^ (redundancy<<28);
    memset(cksum.data,0xFF,NDATA);
    // Process data group.
    for (j=0; j<redundancy; j++) {
      // Fill block with data.
      block.addr=offset;
      if (offset<size) {
        l=size-offset;
        if (l>NDATA) l=NDATA;
        memcpy(block.data,print->buf+offset,l);
      }
      else
        l=0;
      // Bytes beyond the data are set to 0.
      while (l<NDATA)
        block.data[l++]=0;
      // Update redundancy block.
      for (l=0; l<NDATA; l++) cksum.data[l]^=block.data[l];
      // Find cell where block will be placed on the paper. The first block in
      // every string is the superblock.
      k=j*(nstring+1);
      if (nstring+1<nx)
        k+=i+1;
      else {
        // Optimal shift between the first columns of the strings is
        // nx/(redundancy+1). Next line calculates how I must rotate the j-th
        // string. Best understandable after two bottles of Weissbier.
        rot=(nx/(redundancy+1)*j-k%nx+nx)%nx;
        k+=(i+1+rot)%(nstring+1); };
      Drawblock(k,&block,bits,width,height,border,nx,ny,dx,dy,px,py,black);
      offset+=NDATA;
    };
    // Process redundancy block in the similar way.
    k=redundancy*(nstring+1);
    if (nstring+1<nx)
      k+=i+1;
    else {
      rot=(nx/(redundancy+1)*redundancy-k%nx+nx)%nx;
      k+=(i+1+rot)%(nstring+1);
    };
    Drawblock(k,&cksum,bits,width,height,border,nx,ny,dx,dy,px,py,black);
  };


  // Print superblock in all remaining cells.
  for (k=(nstring+1)*(redundancy+1); k<nx*ny; k++) {
    Drawblock(k,(t_data *)&print->superdata,
        bits,width,height,border,nx,ny,dx,dy,px,py,black);
  };

    // Save bitmap to file. First, get file name.
    fnsplit(print->outbmp,drv,dir,nam,ext);
    if (ext[0]=='\0') strcpy(ext,".bmp");
    if (npages>1)
      sprintf(path,"%s%s%s_%04i%s",drv,dir,nam,print->frompage+1,ext);
    else
      sprintf(path,"%s%s%s%s",drv,dir,nam,ext);
    // Create bitmap file.
    //hbmpfile=CreateFile(path,GENERIC_WRITE,0,NULL,
    //  CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,NULL);
    hbmpfile = fopen (path, "wb");
    //if (hbmpfile==INVALID_HANDLE_VALUE) //
    if (hbmpfile == NULL) {
      Reporterror("Unable to create bitmap file");
      Stopprinting(print);
      return;
    };
    // Create and save bitmap file header.
    success=1;
    n=sizeof(BITMAPINFOHEADER)+256*sizeof(RGBQUAD);
    bmfh.bfType=CHAR_BM; //First two bytes are 'BM'
    bmfh.bfSize=sizeof(bmfh)+n+width*height;
    bmfh.bfReserved1=bmfh.bfReserved2=0;
    bmfh.bfOffBits=sizeof(bmfh)+n;
    u = fwrite (&bmfh, sizeof(char), sizeof(bmfh), hbmpfile);
    //if (WriteFile(hbmpfile,&bmfh,sizeof(bmfh),&u,NULL)==0 || u!=sizeof(bmfh))
    if (u != sizeof(bmfh)) {
      success=0;
    }
    // Update and save bitmap info header and palette.
    if (success) {
      pbmi=(BITMAPINFO *)print->bmi;
      pbmi->bmiHeader.biWidth=width;
      pbmi->bmiHeader.biHeight=height;
      pbmi->bmiHeader.biXPelsPerMeter=(print->ppix*10000)/254;
      pbmi->bmiHeader.biYPelsPerMeter=(print->ppiy*10000)/254;
      u = fwrite (pbmi, sizeof(char), n, hbmpfile);
      if (u != (uint32_t)n ) {
        success = 0;
      }
.
      if (success) {
        u = fwrite (bits, sizeof(char), width*height, hbmpfile);
        //if (WriteFile(hbmpfile,bits,width*height,&u,NULL)==0 ||
        //  u!=(uint32_t)(width*height))
        if (u != (ulong)(width*height))
          success=0;
      };
      fclose(hbmpfile);
      //CloseHandle(hbmpfile);
      if (success==0) {
        Reporterror("Unable to save bitmap");
        Stopprinting(print);
        return;
      };
    };
    // Page printed, proceed with next.
    print->frompage++;
}
