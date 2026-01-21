"""
Data Parser Module
Extracts structured data from OCR text using regex patterns
"""

import re
from typing import Dict, Optional


class DataParser:
    """Parses OCR text to extract vehicle inspection report data"""

    def __init__(self):
        # Define regex patterns for each field
        self.patterns = {
            'mta': r'MTA\s+(\d+)',
            'odometer': r'Odometer\s*:?\s*([0-9,\s]+)',  # More flexible, allows spaces
            # More flexible engine number pattern - can be alphanumeric with various lengths
            'engine_no': r'(?:Engine|o")\s*(?:No|N0)\s*:?\s*([A-Z0-9]{6,15})',
            # VIN pattern - more flexible to catch various formats
            # Matches VIN followed by 17 alphanumeric characters (with optional spaces/dashes)
            'vin': r'VIN\s*:?\s*([A-Z0-9\s\-]{15,25})(?=\s*(?:Reg|Registration|$|\n))',
            'reg': r'Reg\s*:?\s*([A-Z0-9]+)',
            'rego_expiry': r'Rego\s+Expiry\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})',
            'vehicle_description': r'(\d{2}/\d{2})\s*-\s*(\d{2}/\d{2})\s+([A-Z]+)\s+([A-Z0-9\s]+?)\s+(BK|MY|GL|GX|SP|LIMITED|SPORT|NEO|MAXX)[^\n]*?(\d[A-Z]{1,2}\s+(?:SEDAN|HATCH|WAGON|UTE|SUV|COUPE|CONVERTIBLE|VAN))[^\n]*?(\d\.?\d?L)?\s*(\d\s*CYL)?\s*(\d\s*SP)?\s*(MANUAL|AUTO|AUTOMATIC)?(?:\s+([A-Z]+(?:\s+[A-Z]+)*))?'
        }

    def clean_text(self, text: str) -> str:
        """Clean OCR text to improve parsing accuracy"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Fix common OCR mistakes
        text = text.replace('|', 'I')
        # NOTE: O -> 0 replacement is now done only for VIN and engine_no after extraction
        # to avoid breaking text matching for "Odometer", "NEO", "SPORT", etc.
        return text

    def parse_vehicle_description(self, description_match) -> Dict[str, str]:
        """Parse the vehicle description line into structured fields"""
        if not description_match:
            return {}

        groups = description_match.groups()

        # Extract year from date range (e.g., "03/08 - 03/08" -> "03/08")
        year = groups[0] if groups[0] else ""

        # Extract make
        make = groups[2] if len(groups) > 2 else ""

        # Extract model (combine make-specific model codes)
        model_parts = []
        if len(groups) > 3 and groups[3]:
            model_parts.append(groups[3].strip())
        if len(groups) > 4 and groups[4]:
            model_parts.append(groups[4].strip())

        model = ' '.join(model_parts)

        # Extract type (e.g., "4D SEDAN")
        vehicle_type = groups[5].strip() if len(groups) > 5 and groups[5] else ""

        # Extract transmission
        transmission = ""
        if len(groups) > 9 and groups[9]:
            trans = groups[9].upper()
            if 'MANUAL' in trans:
                transmission = "Manual"
            elif 'AUTO' in trans:
                transmission = "Auto"

        # Extract color (last group)
        color = groups[10].strip() if len(groups) > 10 and groups[10] else ""

        return {
            'year': year,
            'make': make,
            'model': model,
            'type': vehicle_type,
            'transmission': transmission,
            'color': color
        }

    def extract_field(self, text: str, pattern: str) -> Optional[str]:
        """Extract a single field using regex pattern"""
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip()
        return None

    def parse_text(self, text: str) -> Dict[str, str]:
        """
        Parse OCR text and extract all vehicle data fields

        Args:
            text: OCR extracted text

        Returns:
            Dictionary with extracted fields
        """
        # Clean text
        text = self.clean_text(text)

        # Extract simple fields
        data = {
            'mta': self.extract_field(text, self.patterns['mta']),
            'odometer': self.extract_field(text, self.patterns['odometer']),
            'engine_no': self.extract_field(text, self.patterns['engine_no']),
            'vin': self.extract_field(text, self.patterns['vin']),
            'reg': self.extract_field(text, self.patterns['reg']),
            'rego_expiry': self.extract_field(text, self.patterns['rego_expiry'])
        }

        # Clean odometer (remove commas and spaces)
        if data['odometer']:
            data['odometer'] = data['odometer'].replace(',', '').replace(' ', '').strip()

        # Fix common OCR mistakes in VIN and engine number (O -> 0)
        # Only apply to these fields to avoid breaking text matching elsewhere
        if data['vin']:
            # Remove spaces and dashes first, then replace O with 0
            data['vin'] = data['vin'].replace(' ', '').replace('-', '').replace('O', '0')
            # VINs don't contain I, O, or Q - replace common OCR errors
            data['vin'] = data['vin'].replace('I', '1').replace('Q', '0')
        if data['engine_no']:
            data['engine_no'] = data['engine_no'].replace('O', '0')

        # Try to parse vehicle description
        # First, let's find the vehicle description line more flexibly
        vehicle_desc_pattern = r'(\d{2}/\d{2})\s*-\s*(\d{2}/\d{2})\s+(.+?)(?=\n|$)'
        desc_match = re.search(vehicle_desc_pattern, text)

        if desc_match:
            desc_line = desc_match.group(3)

            # Parse components from description
            # Year is from the date
            data['year'] = desc_match.group(1)

            # Split description line into parts
            parts = desc_line.split()

            # Extract Make (usually first word)
            if len(parts) > 0:
                data['make'] = parts[0]

            # Extract Model - improved logic to handle various formats
            model_parts = []
            type_keywords = ['SEDAN', 'HATCH', 'HATCHBACK', 'WAGON', 'UTE', 'UTILITY', 'SUV', 'COUPE',
                           'VAN', 'CONVERTIBLE', 'CABRIOLET', 'CAB', 'CHASSIS', 'CHAS']
            badge_keywords = ['NEO', 'SPORT', 'BK', 'MY', 'GL', 'GX', 'SP', 'LIMITED', 'MAXX',
                             'VTI', 'SX', 'VX', 'LS', 'LT', 'LTZ', 'RS', 'SV', 'ST', 'TI', 'ACTIVE',
                             'X', 'S', 'SE', 'XE', 'XT', 'XR', 'XLS', 'SR', 'SL', 'DX', 'EX',
                             'ASCENT', 'CONQUEST', 'CLASSIC', 'ELEGANCE', 'LUXURY', 'PREMIUM']

            # Get just the model - stop at first badge or type keyword
            for i, part in enumerate(parts[1:], 1):
                part_upper = part.upper()

                # Stop if we hit a single letter badge (X, S, etc) but allow numbers in model
                if len(part_upper) <= 2 and part_upper in badge_keywords:
                    break
                # Stop if we hit a longer badge keyword
                if len(part_upper) > 2 and any(part_upper == badge for badge in badge_keywords):
                    break
                # Stop if we hit a type keyword (like 4D, SEDAN, etc)
                if any(keyword in part_upper for keyword in type_keywords):
                    break
                # Stop if we hit a number followed by D (like 4D)
                if re.match(r'\d+D', part_upper):
                    break
                # Stop at "MULTI" or "POINT" (engine description)
                if part_upper in ['MULTI', 'POINT', 'F/INJ']:
                    break

                model_parts.append(part)

            # Clean up model name - just the base model
            model_name = ' '.join(model_parts) if model_parts else ""
            # Add space between letters and numbers (e.g., "MAZDA3" -> "MAZDA 3", "FORESTER" stays "FORESTER")
            model_name = re.sub(r'([A-Z]+)(\d+)', r'\1 \2', model_name)
            data['model'] = model_name.title()  # Capitalize properly

            # Extract type - expanded to match all requested body types
            # Patterns: "4DR Sedan", "3DR Hatch", "Single Cab", "C/Chassis", "Double Cab P/Up", etc.
            type_patterns = [
                r'\d+DR\s+(?:Sedan|Hatch|Hatchback|Cabriolet|Convertible)',  # 3DR Hatch, 4DR Sedan, etc.
                r'(?:Single|Dual|Double)\s+Cab(?:\s+P/Up)?',  # Single Cab, Dual Cab, Double Cab P/Up
                r'C/(?:Chassis|Chas)',  # C/Chassis, C/Chas
                r'\d+D\s+(?:SEDAN|HATCH|WAGON|COUPE|CONVERTIBLE)',  # 4D SEDAN (legacy format)
                r'(?:Wagon|Ute|Utility|Coupe)',  # Standalone types
            ]

            type_found = None
            for pattern in type_patterns:
                type_match = re.search(pattern, desc_line, re.IGNORECASE)
                if type_match:
                    type_found = type_match.group(0)
                    break

            data['type'] = type_found.title() if type_found else ''

            # Extract transmission
            if 'MANUAL' in desc_line.upper():
                data['transmission'] = 'Manual'
            elif 'AUTO' in desc_line.upper():
                data['transmission'] = 'Auto'
            else:
                data['transmission'] = ''

            # Extract color - look in multiple places
            # Common OCR misreads: MARINE->MAROON, GRAN->GREY, etc.
            color_map = {
                'MARINE': 'Maroon',
                'GRAN': 'Grey'
            }

            # Search in the full text after the vehicle description line
            full_desc_with_next_line = text[desc_match.start():]

            # Extended color list including common variations
            color_pattern = r'\b(GREY|GRAY|BLACK|WHITE|BLUE|RED|SILVER|GOLD|BRONZE|BEIGE|TAN|CREAM|CHAMPAGNE|GREEN|YELLOW|ORANGE|BROWN|PURPLE|MAROON|BURGUNDY|PINK|MARINE|GRAN)\b'
            color_match = re.search(color_pattern, full_desc_with_next_line, re.IGNORECASE)

            if color_match:
                color_found = color_match.group(1).upper()
                # Map common OCR mistakes to correct colors
                data['color'] = color_map.get(color_found, color_found.capitalize())
            else:
                data['color'] = ''

        else:
            # If vehicle description parsing fails, set defaults
            data.update({
                'year': '',
                'make': '',
                'model': '',
                'type': '',
                'transmission': '',
                'color': ''
            })

        # Validate and clean data
        data = self.validate_data(data)

        return data

    def validate_data(self, data: Dict[str, str]) -> Dict[str, str]:
        """Validate and clean extracted data"""
        # Ensure all expected fields exist
        expected_fields = ['mta', 'year', 'make', 'model', 'type', 'transmission',
                          'color', 'engine_no', 'vin', 'reg', 'rego_expiry', 'odometer']

        for field in expected_fields:
            if field not in data:
                data[field] = ''

        # Clean up None values
        for key, value in data.items():
            if value is None:
                data[key] = ''

        # Validate VIN (should be 17 characters)
        if data.get('vin') and len(data['vin']) != 17:
            data['vin_warning'] = f"VIN should be 17 characters, got {len(data['vin'])}"

        # Format year if needed (convert "03/08" to "01/13" format)
        if data.get('year'):
            year_match = re.match(r'(\d{2})/(\d{2})', data['year'])
            if year_match:
                data['year'] = f"{year_match.group(1)}/{year_match.group(2)}"

        return data


if __name__ == "__main__":
    # Test the parser
    parser = DataParser()

    # Test with sample OCR text
    sample_text = """
    CENTRAL AUTO AUCTIONS
    Inspection Report

    MTA 220902
    03/08 - 03/08 MAZDA MAZDA3 NEO SPORT BK MY08 4D SEDAN MULTI POINT F/INJ 2.0L 4CYL 5 SP MANUAL GREY

    Odometer 186,521
    Engine No LF10525984
    VIN JM0BK10F200405930
    Reg 279VKU
    Rego Expiry 5/10/25
    """

    print("Testing data parser...")
    extracted_data = parser.parse_text(sample_text)

    print("\nExtracted data:")
    print("-" * 80)
    for key, value in extracted_data.items():
        print(f"{key:15s}: {value}")
    print("-" * 80)
