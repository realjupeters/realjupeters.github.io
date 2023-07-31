from PIL import Image, ExifTags
from os import listdir
import os

year = "2023"

if not os.path.exists("{}/full".format(year)):
    os.makedirs("{}/full".format(year))

if not os.path.exists("{}/thumb".format(year)):
    os.makedirs("{}/thumb".format(year))

if not os.path.exists("{}/small".format(year)):
    os.makedirs("{}/small".format(year))

if not os.path.exists("{}/medium".format(year)):
    os.makedirs("{}/medium".format(year))

if not os.path.exists("{}/large".format(year)):
    os.makedirs("{}/large".format(year))

files = listdir("{}/full".format(year))

for i in files:
    print(i)
    im = Image.open("{}/full/{}".format(year, i))

    for orientation in ExifTags.TAGS.keys():
        if ExifTags.TAGS[orientation] == "Orientation":
            break

    exif = im._getexif()

    if exif and orientation in exif:
        if exif[orientation] == 3:
            im = im.rotate(180, expand=True)
        elif exif[orientation] == 6:
            im = im.rotate(270, expand=True)
        elif exif[orientation] == 8:
            im = im.rotate(90, expand=True)

    im.thumbnail((3000, 3000), 1)
    im.save("{}/large/{}".format(year, i), optimize=True, quality=80)
    im.thumbnail((600, 600), 1)
    im.save("{}/medium/{}".format(year, i), optimize=True, quality=80)
    im.thumbnail((300, 300), 1)
    im.save("{}/small/{}".format(year, i), optimize=True, quality=80)
    im.thumbnail((50, 50), 1)
    im.save("{}/thumb/{}".format(year, i), optimize=True, quality=50)

    # Run jpegtran to optimize the image
    os.system(
        "jpegtran -optimize -progressive -copy none -outfile {}/large/{} {}/large/{}".format(
            year, i, year, i
        )
    )

    os.system(
        "jpegtran -optimize -progressive -copy none -outfile {}/medium/{} {}/medium/{}".format(
            year, i, year, i
        )
    )

    os.system(
        "jpegtran -optimize -progressive -copy none -outfile {}/thumb/{} {}/thumb/{}".format(
            year, i, year, i
        )
    )

    os.system(
        "jpegtran -optimize -progressive -copy none -outfile {}/small/{} {}/small/{}".format(
            year, i, year, i
        )
    )

print("Done processing", len(files), "files")
