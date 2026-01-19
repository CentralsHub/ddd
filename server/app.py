"""
Flask Backend Server
Handles file uploads, OCR processing, and PDF generation
"""

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import shutil
import zipfile
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill

from ocr_processor import OCRProcessor
from data_parser import DataParser
from pdf_filler import PDFFiller

app = Flask(__name__, static_folder='../web', static_url_path='')
CORS(app)

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'output')
TEMP_FOLDER = os.path.join(BASE_DIR, 'temp')
TEMPLATE_PDF = os.path.join(BASE_DIR, 'Target.pdf')

# Create folders if they don't exist
for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER, TEMP_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp'}

# Initialize processors
ocr_processor = OCRProcessor()
data_parser = DataParser()
pdf_filler = PDFFiller(TEMPLATE_PDF)


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def cleanup_old_files():
    """Clean up old upload and temp files"""
    for folder in [UPLOAD_FOLDER, TEMP_FOLDER]:
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            try:
                if os.path.isfile(file_path):
                    # Delete files older than 1 hour
                    if os.path.getmtime(file_path) < (datetime.now().timestamp() - 3600):
                        os.unlink(file_path)
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")


@app.route('/')
def index():
    """Serve the main web interface"""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/upload', methods=['POST'])
def upload_files():
    """
    Handle file upload and OCR processing
    Returns extracted data for all uploaded files
    """
    try:
        # Clean up old files
        cleanup_old_files()

        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400

        files = request.files.getlist('files')

        if not files or files[0].filename == '':
            return jsonify({'error': 'No files selected'}), 400

        results = []

        for file in files:
            if file and allowed_file(file.filename):
                # Save uploaded file
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                unique_filename = f"{timestamp}_{filename}"
                file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(file_path)

                try:
                    # Process file with OCR
                    ocr_text = ocr_processor.process_file(file_path)

                    # DEBUG: Print raw OCR text
                    import sys
                    print("=" * 80, flush=True)
                    print(f"OCR TEXT FOR {filename}:", flush=True)
                    print("-" * 80, flush=True)
                    print(ocr_text, flush=True)
                    print("=" * 80, flush=True)

                    # Parse extracted text
                    extracted_data = data_parser.parse_text(ocr_text)

                    # DEBUG: Print extracted data
                    print("EXTRACTED DATA:", flush=True)
                    print(extracted_data, flush=True)
                    print("=" * 80, flush=True)

                    # Add source filename
                    extracted_data['source_filename'] = filename
                    extracted_data['ocr_text'] = ocr_text[:500]  # Include first 500 chars for debugging

                    results.append({
                        'filename': filename,
                        'status': 'success',
                        'data': extracted_data
                    })

                except Exception as e:
                    results.append({
                        'filename': filename,
                        'status': 'error',
                        'error': str(e)
                    })

            else:
                results.append({
                    'filename': file.filename,
                    'status': 'error',
                    'error': 'Invalid file type'
                })

        return jsonify({
            'status': 'success',
            'results': results
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate-pdfs', methods=['POST'])
def generate_pdfs():
    """
    Generate filled PDF declarations from extracted data
    Returns a ZIP file containing all PDFs
    """
    try:
        data_list = request.json.get('data', [])

        if not data_list:
            return jsonify({'error': 'No data provided'}), 400

        # Create unique output folder for this batch
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        batch_folder = os.path.join(TEMP_FOLDER, f'batch_{timestamp}')
        os.makedirs(batch_folder, exist_ok=True)

        # Generate PDFs (each data entry has its own seller_name)
        pdf_files = pdf_filler.fill_multiple_forms(data_list, batch_folder)

        # Create ZIP file
        zip_path = os.path.join(OUTPUT_FOLDER, f'SN_{timestamp}.zip')
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for pdf_file in pdf_files:
                zipf.write(pdf_file, os.path.basename(pdf_file))

        # Clean up individual PDF files
        shutil.rmtree(batch_folder)

        return send_file(zip_path, as_attachment=True, download_name=f'SN_{timestamp}.zip')

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate-excel', methods=['POST'])
def generate_excel():
    """
    Generate Excel file with all extracted data
    """
    try:
        data_list = request.json.get('data', [])

        if not data_list:
            return jsonify({'error': 'No data provided'}), 400

        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Inspection Data"

        # Define headers
        headers = ['Seller Name', 'Source File', 'Stock #', 'Year', 'Make', 'Model', 'Type', 'Auto/Man',
                  'Colour', 'Engine No', 'VIN', 'Reg', 'Rego Expiry', 'Odometer (KMS)']

        # Write headers
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, size=11)
            cell.fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
            cell.font = Font(bold=True, color="FFFFFF")
            cell.alignment = Alignment(horizontal='center', vertical='center')

        # Write data
        for row_idx, data in enumerate(data_list, 2):
            ws.cell(row=row_idx, column=1, value=data.get('seller_name', ''))
            ws.cell(row=row_idx, column=2, value=data.get('source_filename', ''))
            ws.cell(row=row_idx, column=3, value=data.get('mta', ''))
            ws.cell(row=row_idx, column=4, value=data.get('year', ''))
            ws.cell(row=row_idx, column=5, value=data.get('make', ''))
            ws.cell(row=row_idx, column=6, value=data.get('model', ''))
            ws.cell(row=row_idx, column=7, value=data.get('type', ''))
            ws.cell(row=row_idx, column=8, value=data.get('transmission', ''))
            ws.cell(row=row_idx, column=9, value=data.get('color', ''))
            ws.cell(row=row_idx, column=10, value=data.get('engine_no', ''))
            ws.cell(row=row_idx, column=11, value=data.get('vin', ''))
            ws.cell(row=row_idx, column=12, value=data.get('reg', ''))
            ws.cell(row=row_idx, column=13, value=data.get('rego_expiry', ''))
            ws.cell(row=row_idx, column=14, value=data.get('odometer', ''))

        # Adjust column widths
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column].width = adjusted_width

        # Save workbook
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        excel_path = os.path.join(OUTPUT_FOLDER, f'inspection_data_{timestamp}.xlsx')
        wb.save(excel_path)

        return send_file(excel_path, as_attachment=True, download_name=f'inspection_data_{timestamp}.xlsx')

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'template_exists': os.path.exists(TEMPLATE_PDF)
    })


if __name__ == '__main__':
    print("=" * 80)
    print("Dec Filler Server Starting...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Output folder: {OUTPUT_FOLDER}")
    print(f"Template PDF: {TEMPLATE_PDF}")
    print(f"Template exists: {os.path.exists(TEMPLATE_PDF)}")
    print("=" * 80)
    print("\nServer running at http://localhost:5001")
    print("Open your browser and navigate to http://localhost:5001")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 80)

    app.run(debug=True, host='0.0.0.0', port=5001)
