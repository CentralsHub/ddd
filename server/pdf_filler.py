"""
PDF Filler Module
Fills the Declaration and Contract of Sale PDF form with extracted data
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from PyPDF2 import PdfReader, PdfWriter
import io
import os
from typing import Dict


class PDFFiller:
    """Fills PDF declaration forms with vehicle data"""

    def __init__(self, template_path):
        """
        Initialize PDF filler

        Args:
            template_path: Path to the Target.pdf template
        """
        self.template_path = template_path

    def create_overlay(self, data: Dict[str, str], page_size, seller: str = '') -> bytes:
        """
        Create an overlay PDF with the filled data

        Args:
            data: Dictionary containing vehicle data
            page_size: Tuple of (width, height) for the page
            seller: Seller name to add after "We"

        Returns:
            PDF bytes
        """
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=page_size)

        # Set font
        can.setFont("Helvetica", 10)

        # Seller name (after "We") - all caps, 4px bigger font
        if seller:
            can.setFont("Helvetica", 14)
            can.drawString(65, 745, seller.upper())
            can.setFont("Helvetica", 10)  # Reset to normal font

        # Based on the example image, the layout is:
        # Row 1: Year | Make | Model | Type | Auto/Man | Colour
        # Row 2: Eng Number (boxes) | | | | | Rego Number | | Check Digit
        # Row 3: VIN Number (boxes) | | | | | Rego Expires | KMS |
        # Row 4: Stock Number | | | | | | Price | $

        # First data row - based on correct Mazda example
        y_row1 = 660

        # Column X positions - halved spacing to match form boxes
        x_col1 = 32     # Year column
        x_col2 = 78     # Make column (was 138, now closer)
        x_col3 = 172    # Model column (was 245)
        x_col4 = 260    # Type column (was 365)
        x_col5 = 317    # Auto/Man column (was 455)
        x_col6 = 373    # Colour column (was 540)

        # Row 1: Basic vehicle data
        if data.get('year'):
            can.drawString(x_col1, y_row1, str(data['year']))
        if data.get('make'):
            # Capitalize first letter, lowercase rest
            can.drawString(x_col2, y_row1, str(data['make']).capitalize())
        if data.get('model'):
            can.drawString(x_col3, y_row1, str(data['model'])[:15])
        if data.get('type'):
            can.drawString(x_col4, y_row1, str(data['type']))
        if data.get('transmission'):
            # Capitalize first letter, lowercase rest
            can.drawString(x_col5, y_row1, str(data['transmission']).capitalize())
        if data.get('colour') or data.get('color'):
            color = data.get('colour') or data.get('color')
            # Capitalize first letter, lowercase rest
            can.drawString(x_col6, y_row1, str(color).capitalize())

        # Row 2: Engine Number (individual boxes) + Rego Number
        y_row2 = y_row1 - 20
        x_eng_start = 94  # Start position for first character
        eng_box_width = 18.7  # Space between character boxes (wider based on example)

        engine_no = data.get('engine_no', '')
        for i, char in enumerate(engine_no[:12]):  # Limit to 12 chars that fit
            can.drawString(x_eng_start + (i * eng_box_width), y_row2, char)

        # Rego Number (right side of row 2) - 2px larger, moved up 2px
        x_rego_num = 438
        if data.get('reg'):
            can.setFont("Helvetica", 12)
            can.drawString(x_rego_num, y_row2 + 2, str(data['reg']))
            can.setFont("Helvetica", 10)  # Reset to normal font

        # Row 3: VIN Number (individual boxes) + Rego Expires + KMS
        y_row3 = y_row1 - 47
        x_vin_start = 112  # Match engine number start

        vin = data.get('vin', '')
        for i, char in enumerate(vin[:17]):  # 17 character VIN
            can.drawString(x_vin_start + (i * eng_box_width), y_row3, char)

        # Rego Expires (right side of row 3) - moved up 2px
        x_rego_exp = 466
        if data.get('rego_expiry'):
            can.drawString(x_rego_exp, y_row3 + 2, str(data['rego_expiry']))

        # KMS (far right of row 3) - moved up 2px
        x_kms = 535
        if data.get('odometer'):
            can.drawString(x_kms, y_row3 + 2, str(data['odometer']))

        # Row 4: Stock Number - 2px larger
        y_row4 = y_row1 - 88
        if data.get('mta'):
            can.setFont("Helvetica", 12)
            can.drawString(x_col1, y_row4, str(data['mta']))
            can.setFont("Helvetica", 10)  # Reset to normal font

        can.save()
        packet.seek(0)
        return packet.getvalue()

    def fill_form(self, data: Dict[str, str], output_path: str, seller: str = ''):
        """
        Fill the PDF form with data

        Args:
            data: Dictionary containing vehicle data
            output_path: Path where filled PDF should be saved
            seller: Seller name
        """
        try:
            # Read the template PDF
            template_pdf = PdfReader(self.template_path)
            page = template_pdf.pages[0]

            # Get page dimensions
            page_width = float(page.mediabox.width)
            page_height = float(page.mediabox.height)

            # Create overlay with data
            overlay_bytes = self.create_overlay(data, (page_width, page_height), seller)
            overlay_pdf = PdfReader(io.BytesIO(overlay_bytes))

            # Merge template and overlay
            output = PdfWriter()
            page.merge_page(overlay_pdf.pages[0])
            output.add_page(page)

            # Write output
            with open(output_path, 'wb') as output_file:
                output.write(output_file)

            return True

        except Exception as e:
            raise Exception(f"Error filling PDF form: {str(e)}")

    def fill_multiple_forms(self, data_list: list, output_dir: str) -> list:
        """
        Fill multiple PDF forms from a list of data

        Args:
            data_list: List of data dictionaries (each with seller_name)
            output_dir: Directory where filled PDFs should be saved

        Returns:
            List of output file paths
        """
        output_files = []

        for i, data in enumerate(data_list):
            # Generate output filename (using Stock # which is the MTA number)
            filename = f"SN_{i+1}"

            # Use Stock # (MTA) or reg as filename if available
            if data.get('mta'):
                filename = f"SN_{data['mta']}"
            elif data.get('reg'):
                filename = f"SN_{data['reg']}"

            output_path = os.path.join(output_dir, f"{filename}.pdf")

            # Get seller name from the data itself
            seller = data.get('seller_name', '')

            # Fill the form
            self.fill_form(data, output_path, seller)
            output_files.append(output_path)

        return output_files


if __name__ == "__main__":
    # Test the PDF filler
    template = "../Target.pdf"

    if os.path.exists(template):
        filler = PDFFiller(template)

        # Test data
        test_data = {
            'year': '01/13',
            'make': 'HYUNDAI',
            'model': 'i20',
            'type': '5D Hatch',
            'transmission': 'Auto',
            'color': 'Blue',
            'engine_no': 'G4FACEW156764',
            'vin': 'KMHBT5TDMEU123456',
            'reg': 'UNREG',
            'rego_expiry': '',
            'odometer': '169160',
            'mta': '123456'
        }

        output = "../output/test_declaration.pdf"
        os.makedirs("../output", exist_ok=True)

        print("Testing PDF filler...")
        filler.fill_form(test_data, output)
        print(f"Test PDF created: {output}")
    else:
        print(f"Template not found: {template}")
