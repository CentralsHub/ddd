# Use official Python runtime as base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (Tesseract OCR and Poppler)
RUN apt-get update && \
    apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Render will override with PORT env var)
EXPOSE 10000

# Run gunicorn with proper module path and logging
CMD gunicorn --bind 0.0.0.0:$PORT --chdir /app --pythonpath /app server.app:app --workers 1 --timeout 120 --log-level debug --access-logfile - --error-logfile -
