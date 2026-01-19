#!/bin/bash

# Dec Filler Server Startup Script

echo "======================================================================"
echo "Dec Filler - Starting Server"
echo "======================================================================"
echo ""

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Activate virtual environment
echo "Activating virtual environment..."
source "$DIR/venv/bin/activate"

# Check if dependencies are installed
if ! python -c "import flask" 2>/dev/null; then
    echo "Dependencies not installed. Installing..."
    pip install -r "$DIR/requirements.txt"
fi

# Change to server directory
cd "$DIR/server"

# Start the Flask server
echo ""
echo "======================================================================"
echo "Server starting at http://localhost:5000"
echo "Open your browser and navigate to http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "======================================================================"
echo ""

python app.py
