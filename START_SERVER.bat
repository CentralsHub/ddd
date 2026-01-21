@echo off
echo ================================================
echo  Daryls Declaration Decoder - Local Server
echo ================================================
echo.
echo Starting server on http://localhost:5001
echo.
echo Press Ctrl+C to stop the server
echo ================================================
echo.

cd /d "%~dp0"
python server/app.py

pause
