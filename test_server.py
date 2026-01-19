#!/usr/bin/env python3
"""
Quick test script to verify the server works
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

print("Testing Dec Filler components...")
print("=" * 60)

# Test imports
try:
    print("1. Testing OCR Processor import...", end=" ")
    from ocr_processor import OCRProcessor
    print("✓ OK")
except Exception as e:
    print(f"✗ FAILED: {e}")
    sys.exit(1)

try:
    print("2. Testing Data Parser import...", end=" ")
    from data_parser import DataParser
    print("✓ OK")
except Exception as e:
    print(f"✗ FAILED: {e}")
    sys.exit(1)

try:
    print("3. Testing PDF Filler import...", end=" ")
    from pdf_filler import PDFFiller
    print("✓ OK")
except Exception as e:
    print(f"✗ FAILED: {e}")
    sys.exit(1)

try:
    print("4. Testing Flask app import...", end=" ")
    import app
    print("✓ OK")
except Exception as e:
    print(f"✗ FAILED: {e}")
    sys.exit(1)

# Test file existence
print("\n5. Checking required files...")
files_to_check = [
    ('Target.pdf', 'Declaration template'),
    ('Source.pdf', 'Example inspection report'),
    ('web/index.html', 'Web interface'),
    ('web/app.js', 'Frontend JavaScript'),
    ('web/styles.css', 'Stylesheet'),
]

base_dir = os.path.dirname(__file__)
all_files_exist = True

for file_path, description in files_to_check:
    full_path = os.path.join(base_dir, file_path)
    exists = os.path.exists(full_path)
    status = "✓" if exists else "✗"
    print(f"   {status} {description}: {file_path}")
    if not exists:
        all_files_exist = False

print("\n" + "=" * 60)
if all_files_exist:
    print("All tests passed! ✓")
    print("\nTo start the server:")
    print("  cd server")
    print("  python app.py")
    print("\nThen open http://localhost:5000 in your browser")
else:
    print("Some files are missing! ✗")
    sys.exit(1)
