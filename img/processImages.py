from PIL import Image, ExifTags
from os import listdir
import os

year = "2022"

if not os.path.exists("{}/full".format(year)):
    os.makedirs("{}/full".format(year))

if not os.path.exists("{}/large".format(year)):
    os.makedirs("{}/thumb".format(year))

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
    im.thumbnail((300, 300), 1)
    im.save("{}/thumb/{}".format(year, i), optimize=True, quality=80)

print("Done processing", len(files), "files")
