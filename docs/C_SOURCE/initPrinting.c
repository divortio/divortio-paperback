// Prepares for printing. Despite its size, this routine is very quick.
static void Initializeprinting(t_printdata *print) {
  int i,dx,dy,px,py,nx,ny,width,height,success,rastercaps;
  char fil[MAXPATH],nam[MAXFILE],ext[MAXEXT],jobname[TEXTLEN];
  BITMAPINFO *pbmi;
  //SIZE extent; //For calculating header/footer space
  // Prepare superdata.
  print->superdata.addr=SUPERBLOCK;
  print->superdata.datasize=print->alignedsize;
  print->superdata.origsize=print->origsize;
  if (print->compression)
    print->superdata.mode|=PBM_COMPRESSED;
  if (print->encryption)
    print->superdata.mode|=PBM_ENCRYPTED;
  //mask windows values, otherwise leave *nix mode data alone
  print->superdata.attributes=(uchar)(print->attributes &
    (FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_HIDDEN|
    FILE_ATTRIBUTE_SYSTEM|FILE_ATTRIBUTE_ARCHIVE|
    FILE_ATTRIBUTE_NORMAL));
  print->superdata.modified=print->modified;
  print->superdata.filecrc=(ushort)print->bufcrc;
  int flags = fnsplit(print->infile,NULL,NULL,nam,ext);
  if (flags & EXTENSION)
    fnmerge(fil,NULL,NULL,nam,ext);
  else
    fnmerge(fil,NULL,NULL,nam,NULL);
  // Note that name in superdata may be not null-terminated.
  printf("Encoding %s to bitmap\n", fil);
  size_t dataSize = sizeof(print->superdata.name);
  strncpy(print->superdata.name,fil,dataSize);
  print->superdata.name[dataSize] = '\0'; // ensure that later string operations don't overflow into binary data
  // I treat printing to bitmap as a debugging feature and set some more or
  // less sound defaults.
  else {
    //print->dc=NULL;
    print->frompage=0;
    print->topage=9999;
    if (pb_resx==0 || pb_resy==0) {
      print->ppix=300; print->ppiy=300; }
    else {
      print->ppix=pb_resx; print->ppiy=pb_resy;
    };

     // Use default A4 size (210x292 mm)
    width=print->ppix*8270/1000;
    height=print->ppiy*11690/1000;
    //};
    //print->hfont6=NULL;
    //print->hfont10=NULL;
    //print->extratop=print->extrabottom=0;
    // To simplify recognition of grid on high-contrast bitmap, dots on the
    // bitmap are dark gray.
    print->black=64;
  };

  //FIXME should left border also be ppix/2
  print->borderleft=print->ppix;
  print->borderright=print->ppix/2;
  print->bordertop=print->ppiy/2;
  print->borderbottom=print->ppiy/2;
  //}
  // Calculate size of printable area, in the pixels of printer's resolution.
  width-=
    print->borderleft+print->borderright;
  height-=
    print->bordertop+print->borderbottom+print->extratop+print->extrabottom;
  // Calculate data point raster (dx,dy) and size of the point (px,py) in the
  // pixels of printer's resolution. Note that pixels, at least in theory, may
  // be non-rectangular.
  dx=max(print->ppix/pb_dpi,2);
  px=max((dx*pb_dotpercent)/100,1);
  dy=max(print->ppiy/pb_dpi,2);
  py=max((dy*pb_dotpercent)/100,1);
  // Calculate width of the border around the data grid.
  if (print->printborder)
    print->border=dx*16;
  else if (print->outbmp[0]!='\0')
    print->border=25;
  else
    print->border=0;
  // Calculate the number of data blocks that fit onto the single page. Single
  // page must contain at least redundancy data blocks plus 1 recovery checksum,
  // and redundancy+1 superblocks with name and size of the data. Data and
  // recovery blocks should be placed into different columns.
  nx=(width-px-2*print->border)/(NDOT*dx+3*dx);
  ny=(height-py-2*print->border)/(NDOT*dy+3*dy);
  if (nx<print->redundancy+1 || ny<3 || nx*ny<2*print->redundancy+2) {
    Reporterror("Printable area is too small, reduce borders or block size");
    Stopprinting(print);
    return; };
  // Calculate final size of the bitmap where I will draw the image.
  width=(nx*(NDOT+3)*dx+px+2*print->border+3) & 0xFFFFFFFC;
  height=ny*(NDOT+3)*dy+py+2*print->border;
  // Fill in bitmap header. To simplify processing, I use 256-color bitmap
  // (1 byte per pixel).
  pbmi=(BITMAPINFO *)print->bmi;
  memset(pbmi,0,sizeof(BITMAPINFOHEADER));
  pbmi->bmiHeader.biSize=sizeof(BITMAPINFOHEADER);
  pbmi->bmiHeader.biWidth=width;
  pbmi->bmiHeader.biHeight=height;
  pbmi->bmiHeader.biPlanes=1;
  pbmi->bmiHeader.biBitCount=8;
  pbmi->bmiHeader.biCompression=BI_RGB;
  pbmi->bmiHeader.biSizeImage=0;
  pbmi->bmiHeader.biXPelsPerMeter=0;
  pbmi->bmiHeader.biYPelsPerMeter=0;
  pbmi->bmiHeader.biClrUsed=256;
  pbmi->bmiHeader.biClrImportant=256;
  for (i=0; i<256; i++) {
    pbmi->bmiColors[i].rgbBlue=(uchar)i;
    pbmi->bmiColors[i].rgbGreen=(uchar)i;
    pbmi->bmiColors[i].rgbRed=(uchar)i;
    pbmi->bmiColors[i].rgbReserved=0; };

  if (print->outbmp[0]=='\0') {
    Reporterror("Outbmp unspecified, can not creat BMP");
    Stopprinting(print);
    return;
  }
  else {                               // Save to bitmap
    print->drawbits=(uchar *)malloc(width*height);
    if (print->drawbits==NULL) {
      Reporterror("Low memory, can't create bitmap");
      return;
    };
  };
  // Calculate the total size of useful data, bytes, that fits onto the page.
  // For each redundancy blocks, I create one recovery block. For each chain, I
  // create one superblock that contains file name and size, plus at least one
  // superblock at the end of the page.
  print->pagesize=((nx*ny-print->redundancy-2)/(print->redundancy+1))*
    print->redundancy*NDATA;
  print->superdata.pagesize=print->pagesize;
  // Save calculated parameters.
  print->width=width;
  print->height=height;
  print->dx=dx;
  print->dy=dy;
  print->px=px;
  print->py=py;
  print->nx=nx;
  print->ny=ny;

  print->step++;
};
