// Dec Filler Frontend JavaScript

let selectedFiles = [];
let extractedData = [];
let sellerHistory = JSON.parse(localStorage.getItem('sellerHistory') || '[]');

// DOM Elements
const API_BASE = "https://ddd-nq4q.onrender.com";
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const processBtn = document.getElementById('process-btn');
const reviewSection = document.getElementById('review-section');
const downloadSection = document.getElementById('download-section');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const messageEl = document.getElementById('message');
const dataTableContainer = document.getElementById('data-table-container');
const downloadExcelBtn = document.getElementById('download-excel-btn');
const downloadSinglePdfBtn = document.getElementById('download-single-pdf-btn');
const downloadPdfsBtn = document.getElementById('download-pdfs-btn');
const startOverBtn = document.getElementById('start-over-btn');

const apiUrl = (path) => `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

// Prevent default drag/drop behavior on the whole page
window.addEventListener('dragover', (e) => {
    e.preventDefault();
}, false);

window.addEventListener('drop', (e) => {
    e.preventDefault();
}, false);

// Event Listeners
uploadZone.addEventListener('click', (e) => {
    if (e.target === uploadZone || uploadZone.contains(e.target)) {
        console.log('Upload zone clicked');
        fileInput.click();
    }
});
uploadZone.addEventListener('dragover', handleDragOver);
uploadZone.addEventListener('dragleave', handleDragLeave);
uploadZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', processFiles);
downloadExcelBtn.addEventListener('click', downloadExcel);
downloadSinglePdfBtn.addEventListener('click', downloadSinglePDF);
downloadPdfsBtn.addEventListener('click', downloadPDFs);
startOverBtn.addEventListener('click', startOver);

console.log('Dec Filler initialized successfully');

// Password Protection
const PASSWORD = 'HelloDaryl';
const lockScreen = document.getElementById('lock-screen');
const mainContainer = document.getElementById('main-container');
const passwordInput = document.getElementById('password-input');
const unlockBtn = document.getElementById('unlock-btn');
const lockError = document.getElementById('lock-error');

// Check if already unlocked in this session
if (sessionStorage.getItem('unlocked') === 'true') {
    lockScreen.style.display = 'none';
    mainContainer.style.display = 'block';
}

function attemptUnlock() {
    const password = passwordInput.value;
    if (password === PASSWORD) {
        sessionStorage.setItem('unlocked', 'true');
        lockScreen.style.display = 'none';
        mainContainer.style.display = 'block';
        lockError.textContent = '';
    } else {
        lockError.textContent = 'Incorrect password. Try again.';
        passwordInput.value = '';
        passwordInput.style.animation = 'shake 0.5s';
        setTimeout(() => {
            passwordInput.style.animation = '';
        }, 500);
    }
}

unlockBtn.addEventListener('click', attemptUnlock);
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptUnlock();
});

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');

    console.log('Files dropped:', e.dataTransfer.files.length);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

// File Management
function addFiles(files) {
    const validFiles = files.filter(file => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp'];
        return validTypes.includes(file.type);
    });

    selectedFiles = [...selectedFiles, ...validFiles];
    updateFileList();
    updateProcessButton();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateProcessButton();
}

function updateFileList() {
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <span class="file-item-name">📄 ${file.name} (${formatFileSize(file.size)})</span>
            <button class="file-item-remove" onclick="removeFile(${index})">Remove</button>
        </div>
    `).join('');
}

function updateProcessButton() {
    processBtn.disabled = selectedFiles.length === 0;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Process Files
async function processFiles() {
    if (selectedFiles.length === 0) return;

    showProgress('Uploading and processing files... (First request may take 60+ seconds as server wakes up)', true);
    processBtn.disabled = true;

    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });

    try {
        // Set a longer timeout for free Render tier (can take 50+ seconds to wake up)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

        const response = await fetch(apiUrl('/api/upload'), {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();

        // Store extracted data with thumbnails
        extractedData = result.results
            .filter(r => r.status === 'success')
            .map(r => ({
                ...r.data,
                thumbnail: r.thumbnail
            }));

        hideProgress();

        if (extractedData.length === 0) {
            showMessage('No data could be extracted from the files. Please check the file quality and try again.', 'error');
            return;
        }

        // Show review section
        displayDataTable();
        reviewSection.style.display = 'block';
        downloadSection.style.display = 'block';

        showMessage(`Successfully processed ${extractedData.length} of ${selectedFiles.length} files.`, 'success');

    } catch (error) {
        hideProgress();
        let errorMsg = 'Error processing files: ' + error.message;
        if (error.name === 'AbortError') {
            errorMsg = 'Request timed out after 3 minutes. The server may be overloaded. Please try again with fewer files.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMsg = 'Cannot connect to server. The server may be sleeping (free tier). Please wait 60 seconds and try again.';
        }
        showMessage(errorMsg, 'error');
        processBtn.disabled = false;
    }
}

// Display Data Table - NEW VERTICAL LAYOUT
function displayDataTable() {
    let html = '';

    extractedData.forEach((data, rowIndex) => {
        // Seller name input with autocomplete
        const sellerValue = data['seller_name'] || '';
        const dataListId = `seller-list-${rowIndex}`;

        html += `
            <div class="vehicle-card">
                <!-- Vendor (Full Width) -->
                <div class="seller-section">
                    <label>Vendor:</label>
                    <input type="text" value="${escapeHtml(sellerValue)}"
                           data-row="${rowIndex}" data-field="seller_name"
                           list="${dataListId}"
                           class="seller-input"
                           onchange="updateData(${rowIndex}, 'seller_name', this.value)">
                    <datalist id="${dataListId}">
                        ${sellerHistory.map(name => `<option value="${escapeHtml(name)}">`).join('')}
                    </datalist>
                </div>

                <div class="vehicle-content">
                    <!-- Left Column: Fields -->
                    <div class="vehicle-fields">
                        <div class="field-group">
                            <label>Stock #</label>
                            <input type="text" value="${escapeHtml(data.mta || '')}"
                                   data-row="${rowIndex}" data-field="mta"
                                   onchange="updateData(${rowIndex}, 'mta', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Year</label>
                            <input type="text" value="${escapeHtml(data.year || '')}"
                                   data-row="${rowIndex}" data-field="year"
                                   onchange="updateData(${rowIndex}, 'year', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Make</label>
                            <input type="text" value="${escapeHtml(data.make || '')}"
                                   data-row="${rowIndex}" data-field="make"
                                   class="${(!data.make || data.make.trim() === '') ? 'missing-data' : ''}"
                                   onchange="updateData(${rowIndex}, 'make', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Model</label>
                            <input type="text" value="${escapeHtml(data.model || '')}"
                                   data-row="${rowIndex}" data-field="model"
                                   class="${(!data.model || data.model.trim() === '') ? 'missing-data' : ''}"
                                   onchange="updateData(${rowIndex}, 'model', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Body</label>
                            <input type="text" value="${escapeHtml(data.type || '')}"
                                   data-row="${rowIndex}" data-field="type"
                                   onchange="updateData(${rowIndex}, 'type', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Auto/Manual</label>
                            <input type="text" value="${escapeHtml(data.transmission || '')}"
                                   data-row="${rowIndex}" data-field="transmission"
                                   onchange="updateData(${rowIndex}, 'transmission', this.value)">
                        </div>
                    </div>

                    <!-- Right Column: Fields -->
                    <div class="vehicle-fields">
                        <div class="field-group">
                            <label>Colour</label>
                            <input type="text" value="${escapeHtml(data.color || '')}"
                                   data-row="${rowIndex}" data-field="color"
                                   onchange="updateData(${rowIndex}, 'color', this.value)">
                        </div>

                        <div class="field-group">
                            <label>VIN</label>
                            <input type="text" value="${escapeHtml(data.vin || '')}"
                                   data-row="${rowIndex}" data-field="vin"
                                   class="${(!data.vin || data.vin.trim() === '') ? 'missing-data' : ''}"
                                   onchange="updateData(${rowIndex}, 'vin', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Engine No</label>
                            <input type="text" value="${escapeHtml(data.engine_no || '')}"
                                   data-row="${rowIndex}" data-field="engine_no"
                                   onchange="updateData(${rowIndex}, 'engine_no', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Registration</label>
                            <input type="text" value="${escapeHtml(data.reg || '')}"
                                   data-row="${rowIndex}" data-field="reg"
                                   onchange="updateData(${rowIndex}, 'reg', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Registration Expiry</label>
                            <input type="text" value="${escapeHtml(data.rego_expiry || '')}"
                                   data-row="${rowIndex}" data-field="rego_expiry"
                                   onchange="updateData(${rowIndex}, 'rego_expiry', this.value)">
                        </div>

                        <div class="field-group">
                            <label>Odometer</label>
                            <input type="text" value="${escapeHtml(data.odometer ? parseInt(data.odometer.toString().replace(/,/g, '')).toLocaleString() : '')}"
                                   data-row="${rowIndex}" data-field="odometer"
                                   onchange="updateData(${rowIndex}, 'odometer', this.value)">
                        </div>
                    </div>

                    <!-- Preview Image -->
                    <div class="preview-section">
                        ${data.thumbnail ? `
                            <img src="${data.thumbnail}"
                                 alt="Preview"
                                 class="preview-image"
                                 onclick="enlargeImage('${data.thumbnail}')"
                                 title="Click to enlarge">
                        ` : '<div class="no-preview">No preview available</div>'}
                        <div class="filename-display">Source: ${escapeHtml(data.source_filename || '')}</div>
                    </div>
                </div>
            </div>
        `;
    });

    dataTableContainer.innerHTML = html;
}

// Image enlargement modal
function enlargeImage(imgSrc) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <img src="${imgSrc}" alt="Enlarged preview">
        </div>
    `;
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    document.body.appendChild(modal);
}

// Update Data with smart corrections
function updateData(rowIndex, field, value) {
    if (extractedData[rowIndex]) {
        // Apply smart corrections
        if (field === 'vin' && value) {
            // Auto-uppercase and remove spaces from VIN
            value = value.toUpperCase().replace(/\s/g, '');
        } else if (field === 'reg' && value) {
            // Auto-uppercase registration
            value = value.toUpperCase().replace(/\s/g, '');
        } else if (field === 'engine_no' && value) {
            // Auto-uppercase engine number
            value = value.toUpperCase().replace(/\s/g, '');
        } else if (field === 'odometer' && value) {
            // Auto-format odometer with commas
            const numValue = value.replace(/[^0-9]/g, '');
            if (numValue) {
                value = parseInt(numValue).toLocaleString();
            }
        } else if (field === 'seller_name' && value) {
            // Save to seller history
            value = value.trim();
            if (value && !sellerHistory.includes(value)) {
                sellerHistory.unshift(value);
                // Keep only last 10 sellers
                sellerHistory = sellerHistory.slice(0, 10);
                localStorage.setItem('sellerHistory', JSON.stringify(sellerHistory));
            }
        }

        extractedData[rowIndex][field] = value;

        // Update the input field to show corrected value
        const input = document.querySelector(`input[data-row="${rowIndex}"][data-field="${field}"]`);
        if (input && input.value !== value) {
            input.value = value;
        }
    }
}

// Download Functions
async function downloadExcel() {
    showProgress('Generating Excel file...');

    try {
        const response = await fetch(apiUrl('/api/generate-excel'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: extractedData })
        });

        if (!response.ok) {
            throw new Error('Excel generation failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inspection_data_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        hideProgress();
        showMessage('Excel file downloaded successfully!', 'success');

    } catch (error) {
        hideProgress();
        showMessage('Error generating Excel: ' + error.message, 'error');
    }
}

async function downloadSinglePDF() {
    showProgress('Generating single multi-page PDF...');

    try {
        const response = await fetch(apiUrl('/api/generate-single-pdf'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: extractedData })
        });

        if (!response.ok) {
            throw new Error('Single PDF generation failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `declarations_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        hideProgress();
        showMessage('Single PDF downloaded successfully!', 'success');

    } catch (error) {
        hideProgress();
        showMessage('Error generating single PDF: ' + error.message, 'error');
    }
}

async function downloadPDFs() {
    showProgress('Generating filled PDF declarations...');

    try {
        const response = await fetch(apiUrl('/api/generate-pdfs'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: extractedData })
        });

        if (!response.ok) {
            throw new Error('PDF generation failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `declarations_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        hideProgress();
        showMessage('PDF declarations downloaded successfully!', 'success');

    } catch (error) {
        hideProgress();
        showMessage('Error generating PDFs: ' + error.message, 'error');
    }
}

// UI Helpers
let progressInterval = null;

function showProgress(text, animate = false) {
    progressText.textContent = text;
    progressContainer.style.display = 'block';

    if (animate) {
        // Start at 0% and animate smoothly to 90%
        let progress = 0;
        progressFill.style.width = '0%';

        if (progressInterval) clearInterval(progressInterval);

        progressInterval = setInterval(() => {
            progress += Math.random() * 3;
            if (progress > 90) progress = 90;
            progressFill.style.width = progress + '%';
        }, 200);
    } else {
        progressFill.style.width = '50%';
    }
}

function hideProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    // Complete the progress bar
    progressFill.style.width = '100%';
    setTimeout(() => {
        progressContainer.style.display = 'none';
        progressFill.style.width = '0%';
    }, 300);
}

function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function startOver() {
    selectedFiles = [];
    extractedData = [];
    fileInput.value = '';
    updateFileList();
    updateProcessButton();
    reviewSection.style.display = 'none';
    downloadSection.style.display = 'none';
    messageEl.style.display = 'none';
    processBtn.disabled = false;
}

// Check server health on load
async function checkServerHealth() {
    try {
        const response = await fetch(apiUrl('/api/health'));
        const data = await response.json();

        if (!data.template_exists) {
            showMessage('Warning: Target.pdf template not found. PDF generation may fail.', 'error');
        }

        if (!data.tesseract_available) {
            showMessage('Warning: Tesseract OCR not available on server. Text extraction will not work. Server needs redeployment.', 'error');
            console.error('Tesseract error:', data.tesseract_version);
        } else {
            console.log('Tesseract available:', data.tesseract_version);
        }
    } catch (error) {
        showMessage('Warning: Could not connect to server. Please ensure the backend is running.', 'error');
    }
}

// Initialize
checkServerHealth();
