# External Dependency Setup Guide (Windows)

This project requires **Poppler** (for PDF parsing) and **Tesseract OCR** (for text recognition). Since these are not Python packages, they must be installed separately.

## 1. Poppler Setup
Poppler is required by the `unstructured` library to read PDF files.

1.  **Download**:
    - Visit the [Poppler for Windows Releases](https://github.com/oschwartz10612/poppler-windows/releases/).
    - Download the latest ZIP file (e.g., `Release-24.02.0-0.zip`).

2.  **Install**:
    - Extract the ZIP file to a permanent location (e.g., `C:\Program Files\poppler`).
    - Locate the `bin` directory inside the extracted folder (e.g., `C:\Program Files\poppler\poppler-24.02.0\Library\bin`).

3.  **Configure (Auto-detected)**:
    - This project is configured to automatically look for Poppler in `C:\Program Files\poppler\...\bin`.
    - If you installed it elsewhere, you must add the `bin` folder path to your system's **Path** environment variable manually.

## 2. Tesseract OCR Setup
Tesseract is required for extracting text from images within PDFs.

1.  **Download**:
    - Visit the [UB-Mannheim Tesseract Wiki](https://github.com/UB-Mannheim/tesseract/wiki).
    - Download the installer (e.g., `tesseract-ocr-w64-setup-v5.3.3.xxxx.exe`).

2.  **Install**:
    - Run the installer.
    - **Important**: In the "Choose Components" step, expand "Additional script data" and check **"Hangul"** (and "Hangul vertical" if available) to support Korean text recognition.
    - Keep the default installation path: `C:\Program Files\Tesseract-OCR`.

3.  **Configure (Auto-detected)**:
    - This project is configured to automatically look for Tesseract in `C:\Program Files\Tesseract-OCR`.
    - If properly installed, no further action is needed.

## Troubleshooting
If you still see errors like "Tesseract is not installed" or "Unable to get page count":
1.  Verify the installation paths match explicitly.
2.  Restart your computer to ensure all environment variables are refreshed.
