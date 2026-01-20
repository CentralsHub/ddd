#!/usr/bin/env bash
# Render build script - installs system dependencies and Python packages

set -o errexit

echo "Installing system dependencies..."
apt-get update
apt-get install -y tesseract-ocr poppler-utils

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Build complete!"
