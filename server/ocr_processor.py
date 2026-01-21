"""
OCR Processor Module
Handles text extraction from PDFs and images using Tesseract OCR
"""

import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import io
import os


class OCRProcessor:
    """Processes images and PDFs to extract text using OCR"""

    def __init__(self, tesseract_config='--psm 6 --oem 3'):
        """
        Initialize OCR processor

        Args:
            tesseract_config: Tesseract configuration string
                --psm 6: Assume uniform block of text (default)
                --psm 4: Assume single column of text
                --oem 3: Use both legacy and LSTM OCR engines
        """
        self.config = tesseract_config

    def preprocess_image(self, image):
        """
        Preprocess image for better OCR accuracy

        Args:
            image: PIL Image object

        Returns:
            Preprocessed PIL Image
        """
        from PIL import ImageEnhance, ImageOps

        # Auto-orient image based on EXIF data
        try:
            image = ImageOps.exif_transpose(image)
        except:
            pass

        # Try to detect and fix rotation using Tesseract's OSD (Orientation and Script Detection)
        try:
            osd = pytesseract.image_to_osd(image)
            rotation = int([line for line in osd.split('\n') if 'Rotate:' in line][0].split(':')[1].strip())
            if rotation != 0:
                image = image.rotate(-rotation, expand=True)
                print(f"Auto-rotated image by {rotation} degrees", flush=True)
        except Exception as e:
            print(f"Could not detect rotation: {e}", flush=True)

        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')

        # Increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)

        # Increase sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(1.5)

        return image

    def extract_text_from_image(self, image_path):
        """
        Extract text from an image file

        Args:
            image_path: Path to image file

        Returns:
            Extracted text as string
        """
        try:
            # Open and preprocess image
            image = Image.open(image_path)
            image = self.preprocess_image(image)

            # Extract text using Tesseract
            text = pytesseract.image_to_string(image, config=self.config)

            return text
        except Exception as e:
            raise Exception(f"Error extracting text from image: {str(e)}")

    def extract_text_from_pdf(self, pdf_path):
        """
        Extract text from a PDF file

        Args:
            pdf_path: Path to PDF file

        Returns:
            Extracted text as string (all pages combined)
        """
        try:
            # Convert PDF to images
            images = convert_from_path(pdf_path, dpi=300)

            # Extract text from each page
            all_text = []
            for i, image in enumerate(images):
                # Preprocess image
                image = self.preprocess_image(image)

                # Extract text
                text = pytesseract.image_to_string(image, config=self.config)
                all_text.append(text)

            # Combine all pages
            return '\n\n--- PAGE BREAK ---\n\n'.join(all_text)
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")

    def process_file(self, file_path):
        """
        Process a file (image or PDF) and extract text

        Args:
            file_path: Path to file

        Returns:
            Extracted text as string
        """
        # Determine file type
        file_ext = os.path.splitext(file_path)[1].lower()

        if file_ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']:
            return self.extract_text_from_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")


if __name__ == "__main__":
    # Test the OCR processor
    processor = OCRProcessor()

    # Test with Source.pdf
    test_file = "../Source.pdf"
    if os.path.exists(test_file):
        print("Testing OCR on Source.pdf...")
        text = processor.process_file(test_file)
        print("Extracted text:")
        print("-" * 80)
        print(text)
        print("-" * 80)
    else:
        print(f"Test file not found: {test_file}")
