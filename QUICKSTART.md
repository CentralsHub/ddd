# Dec Filler - Quick Start Guide

## First Time Setup (5 minutes)

1. **Install required software**:
   ```bash
   brew install tesseract poppler
   ```

2. **Set up Python environment** (from Terminal):
   ```bash
   cd "/Users/mitchelldown/developer/Dec Filler"
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## Daily Use

### Starting the Server

**Easy Way** (double-click in Finder):
1. Navigate to the `Dec Filler` folder
2. Right-click `start_server.sh` → Open With → Terminal

**Command Line Way**:
```bash
cd "/Users/mitchelldown/developer/Dec Filler"
./start_server.sh
```

The server will start and open at `http://localhost:5000`

### Using the Application

1. **Upload Files**
   - Drag and drop your inspection report PDFs or photos
   - Or click to browse and select files
   - You can upload multiple files at once

2. **Review Data**
   - The system automatically extracts vehicle information
   - Check the table for accuracy
   - Edit any incorrect fields directly in the table

3. **Download Results**
   - Click "Download Excel" to get all data in a spreadsheet
   - Click "Download Filled PDFs" to get declaration forms
   - PDFs come in a ZIP file

### Stopping the Server

Press `Ctrl+C` in the Terminal window where the server is running.

## Tips for Best Results

### Photographing Documents
- Use good lighting (avoid shadows)
- Hold camera straight (not at an angle)
- Keep the document in focus
- Ensure all text is visible

### Common Issues

**"Server not found" error**:
- Make sure you started the server first
- Check that Terminal shows "Running on http://localhost:5000"

**Data extraction errors**:
- Check photo quality and retake if needed
- Manually correct errors in the review step
- Try scanning instead of photographing for best results

**Port already in use**:
```bash
lsof -ti:5000 | xargs kill
```

## What Gets Extracted

- MTA Number
- Vehicle Year, Make, Model, Type
- Transmission (Auto/Manual)
- Colour
- Engine Number
- VIN (17 digits)
- Registration Number
- Registration Expiry
- Odometer Reading (KMS)

## File Locations

- **Uploads**: Automatically cleaned up after 1 hour
- **Generated Files**: Saved to `output/` folder
  - Excel files: `inspection_data_TIMESTAMP.xlsx`
  - PDF ZIP files: `declarations_TIMESTAMP.zip`

## Support

For detailed information, see the full README.md file in this folder.

---

**Dec Filler v1.0** - Streamlining your vehicle documentation workflow
