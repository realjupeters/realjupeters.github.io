# /// script
# dependencies = [
#   "Pillow",
# ]
# ///

#!/usr/bin/env python3
"""
Image Processing Script for Gallery

This script processes images in a year-based directory structure:
- Reads images from {year}/full/
- Creates optimized versions in thumb, small, medium, and large directories
- Handles EXIF orientation data
- Requires jpegtran for final optimization
- Automatically skips images that have already been processed

Usage:
    python processImages.py [year]
    python processImages.py [year] --force  # Force reprocessing
    python processImages.py --help

Dependencies:
    - PIL (Pillow): pip install Pillow
    - jpegtran: Install libjpeg-progs or similar package
"""

import argparse
import sys
import os
from pathlib import Path
from PIL import Image, ExifTags


def create_directories(year):
    """Create necessary directories for the given year."""
    directories = ['full', 'thumb', 'small', 'medium', 'large']
    
    for directory in directories:
        path = Path(year) / directory
        path.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {path}")


def check_dependencies():
    """Check if required dependencies are available."""
    try:
        from PIL import Image
    except ImportError:
        print("Error: PIL (Pillow) is required. Install with: pip install Pillow")
        return False
    
    
    return True


def get_image_orientation(image):
    """Get the orientation tag from EXIF data."""
    try:
        exif = image._getexif()
        if exif is not None:
            for tag, value in exif.items():
                if tag in ExifTags.TAGS and ExifTags.TAGS[tag] == 'Orientation':
                    return value
    except (AttributeError, KeyError):
        pass
    return None


def rotate_image_by_exif(image):
    """Rotate image based on EXIF orientation data."""
    orientation = get_image_orientation(image)
    
    if orientation == 3:
        return image.rotate(180, expand=True)
    elif orientation == 6:
        return image.rotate(270, expand=True)
    elif orientation == 8:
        return image.rotate(90, expand=True)
    
    return image


def create_thumbnail(image, size, quality=80):
    """Create a thumbnail of the given size."""
    thumb = image.copy()
    thumb.thumbnail(size, Image.Resampling.LANCZOS)
    return thumb


def optimize_jpeg(filepath):
    """Optimize JPEG using jpegtran."""
    try:
        cmd = f"jpegtran -optimize -progressive -copy none -outfile {filepath} {filepath}"
        result = os.system(cmd)
        if result != 0:
            print(f"Warning: jpegtran optimization failed for {filepath}")
    except Exception as e:
        print(f"Warning: Could not optimize {filepath}: {e}")


def is_already_processed(year, filename):
    """Check if image has already been processed."""
    full_path = Path(year) / 'full' / filename
    
    if not full_path.exists():
        return False
    
    # Check if all output files exist
    sizes = ['large', 'medium', 'small', 'thumb']
    output_paths = [Path(year) / size / filename for size in sizes]
    
    # If any output file doesn't exist, need to process
    for output_path in output_paths:
        if not output_path.exists():
            return False
    
    # Check if original file is newer than any output file
    original_mtime = full_path.stat().st_mtime
    for output_path in output_paths:
        if output_path.stat().st_mtime < original_mtime:
            return False
    
    return True


def process_image(year, filename, force=False):
    """Process a single image file."""
    full_path = Path(year) / 'full' / filename
    
    if not full_path.exists():
        print(f"Error: File {full_path} does not exist")
        return False
    
    # Check if already processed (unless forced)
    if not force and is_already_processed(year, filename):
        print(f"Skipping: {filename} (already processed)")
        return "skipped"
    
    try:
        print(f"Processing: {filename}")
        
        # Open and rotate image if needed
        with Image.open(full_path) as image:
            # Convert to RGB if necessary (handles RGBA, etc.)
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            # Handle EXIF orientation
            image = rotate_image_by_exif(image)
            
            # Create different sizes
            sizes = {
                'large': (3000, 3000, 80),
                'medium': (600, 600, 80),
                'small': (300, 300, 80),
                'thumb': (50, 50, 50)
            }
            
            for size_name, (width, height, quality) in sizes.items():
                thumb = create_thumbnail(image, (width, height), quality)
                output_path = Path(year) / size_name / filename
                thumb.save(output_path, optimize=True, quality=quality)
                
                # Optimize with jpegtran if available
                if filename.lower().endswith(('.jpg', '.jpeg')):
                    optimize_jpeg(output_path)
        
        return True
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description='Process images for gallery website',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python processImages.py 2024
    python processImages.py 2025
    python processImages.py 2025 --force  # Force reprocessing all images
    
Directory Structure:
    {year}/full/     - Original images (input)
    {year}/large/    - Large thumbnails (3000x3000)
    {year}/medium/   - Medium thumbnails (600x600)
    {year}/small/    - Small thumbnails (300x300)
    {year}/thumb/    - Tiny thumbnails (50x50)
        """
    )
    
    parser.add_argument(
        'year',
        help='Year directory to process (default: 2024)',
    )
    
    parser.add_argument(
        '--check-deps',
        action='store_true',
        help='Check if dependencies are installed'
    )
    
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force reprocessing of all images, even if already processed'
    )
    
    args = parser.parse_args()
    
    if args.check_deps:
        if check_dependencies():
            print("All dependencies are available!")
        else:
            print("Some dependencies are missing.")
        return
    
    year = args.year
    full_dir = Path(year) / 'full'
    
    # Check if the full directory exists
    if not full_dir.exists():
        print(f"Error: Directory {full_dir} does not exist.")
        print(f"Please create the directory and place your images there.")
        return 1
    
    # Get list of image files
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}
    image_files = [
        f.name for f in full_dir.iterdir() 
        if f.is_file() and f.suffix.lower() in image_extensions
    ]
    
    if not image_files:
        print(f"No image files found in {full_dir}")
        return 1
    
    print(f"Found {len(image_files)} image files to process")
    
    # Check dependencies
    has_jpegtran = check_dependencies()

    if not has_jpegtran:
        print("Warning: jpegtran is not available. Please install it.")
        return 1
    
    # Create directories
    create_directories(year)
    
    # Process images
    processed = 0
    skipped = 0
    failed = 0
    
    for filename in image_files:
        result = process_image(year, filename, force=args.force)
        if result == "skipped":
            skipped += 1
        elif result:
            processed += 1
        else:
            failed += 1
    
    print(f"\nProcessing complete!")
    print(f"Successfully processed: {processed} files")
    if skipped > 0:
        print(f"Skipped (already processed): {skipped} files")
    if failed > 0:
        print(f"Failed to process: {failed} files")
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
