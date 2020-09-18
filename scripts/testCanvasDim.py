# Test bounding boxes for inserting images
# depending on plate parameters

# Parameters of the plate
plateWidth, plateHeight = (12, 8)
wellWidth, wellHeight = (3, 3)
imWidth, imHeight = (1360, 1024)
paddingFOV = 5 #pixels; padding between FOV in a well
paddingWell = 30 #pixels; padding between wells in a plate

plateCol = range(0, plateWidth)
plateRow = range(0, plateHeight)

wellFOVs = range(0, wellWidth*wellHeight)

imWellWidth  = int(imWidth*wellWidth  + paddingFOV*(wellWidth-1))
imWellHeight = int(imHeight*wellHeight + paddingFOV*(wellHeight-1))

DEB = 1

def processWell(inRow, inCol):
    locIrow = inRow
    locIcol = inCol

    if (DEB):
        print('Row ', inRow, 'Col', inCol, '\n')

    for locIfov in wellFOVs:
        if (DEB):
            print('\nIfov', locIfov)

        locWellCol = locIfov % wellWidth
        locWellRow = locIfov // wellWidth

        if (DEB):
            print('WellCol', locWellCol, 'WellRow', locWellRow)

        locWellPosW = locWellCol * (imWidth + paddingFOV)
        locWellPosE = locWellPosW + imWidth
        locWellPosN = locWellRow * (imHeight + paddingFOV)
        locWellPosS = locWellPosN + imHeight

        # bounding box for inserting the image into the canvas
        locBbox = (locWellPosW, locWellPosN, locWellPosE, locWellPosS)

        if (DEB):
            print('Bounding box for inserting FOV image into Well canvas:')
            print(locBbox)


for iRow in plateRow:
    for iCol in plateCol:
        # Add image to montage canvas

        platePosW = iCol * (imWellWidth + paddingWell)
        platePosE = platePosW + imWellWidth
        platePosN = iRow * (imWellHeight + paddingWell)
        platePosS = platePosN + imWellHeight
        bbox = (platePosW, platePosN, platePosE, platePosS)

        if (DEB):
            print('\nBounding box for inserting Well image into Plate canvas:')
            print(bbox)

        processWell(iRow + 1, iCol + 1)
