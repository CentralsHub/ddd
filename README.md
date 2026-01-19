# Daryls Declaration Decoder

Automated Inspection Report to Declaration Converter

## Features

- 🚗 OCR extraction from inspection reports (PDF & images)
- 📝 Auto-fill vehicle declaration forms
- 📊 Export to Excel for easy editing
- 📄 Batch PDF generation
- 🎨 Smart auto-corrections for VIN, reg numbers
- 💾 Seller name autocomplete with memory
- 🔒 Password protected

## Setup

### Local Development

1. Install Python dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Install Tesseract OCR:
```bash
brew install tesseract  # macOS
```

3. Run the server:
```bash
cd server
python3 app.py
```

4. Open http://localhost:5001

### GitHub Pages (Frontend Only)

The web interface can be hosted on GitHub Pages for demo purposes. Note: Without the Python backend, OCR processing won't work, but you can view the UI.

To deploy:
1. Push to GitHub
2. Go to Settings → Pages
3. Select branch: `main` and folder: `/web`
4. Access at: https://yourusername.github.io/ddd

## Password

Default password: `HelloDaryl`

## Usage

1. Enter password to unlock
2. Upload inspection report PDFs or photos
3. Review extracted data
4. Fill in seller names (autocomplete remembers previous entries)
5. Download Excel spreadsheet or filled PDF declarations

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Python Flask
- **OCR**: Tesseract
- **PDF Processing**: PyPDF2, ReportLab, pdf2image

---

Made with ❤️ for Daryl
