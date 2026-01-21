# Windows Setup Guide for Daryl's Declaration Decoder

## Prerequisites

1. **Install Python 3.11+**
   - Download from: https://www.python.org/downloads/
   - ✅ Check "Add Python to PATH" during installation
   - Verify: Open Command Prompt and type `python --version`

2. **Install Tesseract OCR**
   - Download installer: https://github.com/UB-Mannheim/tesseract/wiki
   - Download: `tesseract-ocr-w64-setup-5.3.3.20231005.exe`
   - Install to default location: `C:\Program Files\Tesseract-OCR`
   - Add to PATH (installer should do this automatically)

3. **Install Poppler for PDF support**
   - Download: https://github.com/oschwartz10612/poppler-windows/releases/
   - Extract to: `C:\poppler`
   - Add `C:\poppler\Library\bin` to System PATH

## Installation Steps

1. **Download the project**
   ```
   Download ZIP from GitHub or use git clone
   ```

2. **Install Python dependencies**
   ```
   cd Dec-Filler
   pip install -r requirements.txt
   ```

3. **Test the installation**
   ```
   python server/app.py
   ```

## Running the Server

### Easy Way (Double-click):
1. Double-click `START_SERVER.bat`
2. Browser will open to http://localhost:5001
3. Use the app!
4. Press Ctrl+C in the window to stop

### Manual Way:
1. Open Command Prompt
2. Navigate to project folder
3. Run: `python server/app.py`
4. Open browser to http://localhost:5001

## Troubleshooting

### "python is not recognized"
- Python not installed or not in PATH
- Reinstall Python with "Add to PATH" checked

### "tesseract is not recognized"
- Tesseract not installed or not in PATH
- Add to PATH: `C:\Program Files\Tesseract-OCR`

### "poppler not found"
- Download poppler-windows
- Add to PATH: `C:\poppler\Library\bin`

### Port 5001 already in use
- Close other programs using port 5001
- Or edit `server/app.py` and change the port number

## Usage Tips

- **Much faster than the online version!**
- No internet needed once set up
- Process multiple files quickly
- Works on phone too (use PC's local network IP)

## Phone Access (Optional)

To use from your phone on the same WiFi:

1. Find your PC's IP address:
   ```
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. On your phone, open:
   ```
   http://192.168.1.100:5001
   ```

3. Make sure Windows Firewall allows port 5001
