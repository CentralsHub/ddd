# Dec Filler - Workflow Visualization

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   USER STARTS HERE                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Upload Inspection Reports                          │
│  ────────────────────────────────────                       │
│  • Drag & drop or browse for files                          │
│  • Multiple PDFs or photos                                  │
│  • Supported: PDF, JPG, PNG, TIFF                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: OCR Processing (ocr_processor.py)                 │
│  ────────────────────────────────────────                   │
│  1. Convert PDF → Images (300 DPI)                          │
│  2. Preprocess images:                                      │
│     - Convert to grayscale                                  │
│     - Enhance contrast (2x)                                 │
│     - Sharpen (1.5x)                                        │
│  3. Extract text using Tesseract OCR                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: Data Parsing (data_parser.py)                     │
│  ────────────────────────────────────────                   │
│  Extract fields using regex patterns:                       │
│  • MTA Number:        MTA\s+(\d+)                           │
│  • Engine No:         Engine\s+No\s+([A-Z0-9]+)             │
│  • VIN:               VIN\s+([A-Z0-9]{17})                  │
│  • Registration:      Reg\s+([A-Z0-9]+)                     │
│  • Odometer:          Odometer\s+([0-9,]+)                  │
│  • Rego Expiry:       \d{1,2}/\d{1,2}/\d{2,4}               │
│  • Vehicle details:   Parse description line                │
│    → Year, Make, Model, Type, Transmission, Colour          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Review & Edit Data                                 │
│  ───────────────────────────                                │
│  • Display extracted data in table                          │
│  • All fields are editable                                  │
│  • User can correct any errors                              │
│  • Validate data before proceeding                          │
└─────────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼              ▼
        ┌──────────────┐   ┌──────────────┐
        │ Download     │   │ Download     │
        │ Excel        │   │ PDFs         │
        └──────────────┘   └──────────────┘
                │                  │
                ▼                  ▼
    ┌─────────────────┐   ┌─────────────────┐
    │ Excel Generator │   │ PDF Filler      │
    │ (openpyxl)      │   │ (reportlab)     │
    └─────────────────┘   └─────────────────┘
                │                  │
                ▼                  ▼
    ┌─────────────────┐   ┌─────────────────┐
    │ .xlsx file      │   │ Filled PDFs     │
    │ All vehicles    │   │ in ZIP file     │
    │ in spreadsheet  │   │ One per vehicle │
    └─────────────────┘   └─────────────────┘
```

## Example Data Transformation

### Input (OCR Text from Inspection Report)
```
CENTRAL AUTO AUCTIONS
Inspection Report

MTA 220902
03/08 - 03/08 MAZDA MAZDA3 NEO SPORT BK MY08 4D SEDAN
MULTI POINT F/INJ 2.0L 4CYL 5 SP MANUAL GREY

Odometer 186,521
Engine No LF10525984
VIN JM0BK10F200405930
Reg 279VKU
Rego Expiry 5/10/25
```

### Parsing Process
```
Regex Extraction:
├─ MTA Number:    "220902"
├─ Year:          "03/08"
├─ Make:          "MAZDA"
├─ Model:         "MAZDA3 NEO SPORT BK MY08"
├─ Type:          "4D SEDAN"
├─ Transmission:  "MANUAL" → "Manual"
├─ Colour:        "GREY" → "Grey"
├─ Engine No:     "LF10525984"
├─ VIN:           "JM0BK10F200405930"
├─ Reg:           "279VKU"
├─ Rego Expiry:   "5/10/25"
└─ Odometer:      "186,521" → "186521"
```

### Output (Structured Data)
```json
{
  "mta": "220902",
  "year": "03/08",
  "make": "MAZDA",
  "model": "MAZDA3 NEO SPORT BK MY08",
  "type": "4D SEDAN",
  "transmission": "Manual",
  "color": "Grey",
  "engine_no": "LF10525984",
  "vin": "JM0BK10F200405930",
  "reg": "279VKU",
  "rego_expiry": "5/10/25",
  "odometer": "186521"
}
```

### Final Output (PDF Declaration)
```
Target.pdf (template) + Data (overlay) = Filled Declaration

Fields filled:
┌─────────────────────────────────────────┐
│ Year: 03/08     Make: MAZDA             │
│ Model: MAZDA3 NEO SPORT BK MY08         │
│ Type: 4D SEDAN  Auto/Man: Manual        │
│ Colour: Grey                            │
│                                         │
│ Eng Number: [L][F][1][0][5][2][5][9]... │
│ VIN: [J][M][0][B][K][1][0][F][2]...     │
│ Rego Number: 279VKU                     │
│ Rego Expires: 5/10/25  KMS: 186521      │
└─────────────────────────────────────────┘
```

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Browser (User)                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  index.html + app.js + styles.css               │    │
│  │  • File upload UI                               │    │
│  │  • Data table (editable)                        │    │
│  │  • Download buttons                             │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
                         │ HTTP
                         │ REST API
                         ▼
┌──────────────────────────────────────────────────────────┐
│             Flask Server (app.py)                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Endpoints:                                  │   │
│  │  • POST /api/upload → Process files              │   │
│  │  • POST /api/generate-excel → Create .xlsx      │   │
│  │  • POST /api/generate-pdfs → Create PDFs        │   │
│  │  • GET /api/health → Health check               │   │
│  └──────────────────────────────────────────────────┘   │
│              │                 │               │          │
│              ▼                 ▼               ▼          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ OCR         │  │ Data         │  │ PDF          │   │
│  │ Processor   │→ │ Parser       │→ │ Filler       │   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                External Dependencies                      │
│  • Tesseract OCR (text extraction)                       │
│  • Poppler (PDF to image conversion)                     │
│  • ReportLab (PDF generation)                            │
│  • openpyxl (Excel generation)                           │
└──────────────────────────────────────────────────────────┘
```

## File Processing Timeline

```
Time  Action
─────────────────────────────────────────────────────
0:00  User uploads file
0:01  Server receives file, saves to uploads/
0:02  OCR processing starts
      ├─ PDF → Images (if PDF)
      ├─ Image preprocessing
      └─ Tesseract extraction
0:05  OCR complete, text extracted
0:06  Data parsing starts
      ├─ Regex pattern matching
      ├─ Field extraction
      └─ Data validation
0:07  Parsed data sent to browser
0:08  User reviews/edits data
...   (user interaction time)
0:30  User clicks "Generate PDFs"
0:31  PDF filling starts
      ├─ Create overlay for each vehicle
      ├─ Merge with template
      └─ Save to temp folder
0:35  All PDFs created
0:36  Create ZIP file
0:37  Send ZIP to user
0:38  Clean up temp files
─────────────────────────────────────────────────────
Total: ~38 seconds (for 50 files)
```

## Error Handling Flow

```
Upload
  │
  ├─ File type check
  │   └─ Fail → Show error "Invalid file type"
  │
  ├─ OCR processing
  │   └─ Fail → Show error "Could not extract text"
  │
  ├─ Data parsing
  │   ├─ Missing fields → Set to empty, flag for review
  │   └─ Invalid format → Show warning, allow manual correction
  │
  └─ PDF generation
      └─ Fail → Show error "PDF generation failed"
```

## Performance Optimization

```
Optimization Techniques:
├─ Image preprocessing
│   └─ Contrast enhancement for better OCR accuracy
├─ Batch processing
│   └─ Process all files in parallel
├─ Automatic cleanup
│   └─ Delete temp files after 1 hour
└─ Client-side validation
    └─ Reduce server load
```

## Security Measures

```
Security Layer               Implementation
────────────────────────────────────────────────────
File validation             Check extensions
File size limits            50MB max per file
Local processing           No external API calls
Temporary storage          Auto-delete after 1hr
No authentication          Single-user local use
Input sanitization         Escape HTML in frontend
Path traversal prevention  Secure filename handling
```

---

This workflow ensures efficient, accurate, and secure processing of inspection reports to declarations.
