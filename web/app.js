// Dec Filler Frontend JavaScript

let selectedFiles = [];
let extractedData = [];
let sellerHistory = JSON.parse(localStorage.getItem('sellerHistory') || '[]');

// DOM Elements
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
const downloadPdfsBtn = document.getElementById('download-pdfs-btn');
const startOverBtn = document.getElementById('start-over-btn');

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

    showProgress('Uploading and processing files...', true);
    processBtn.disabled = true;

    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();

        // Store extracted data
        extractedData = result.results
            .filter(r => r.status === 'success')
            .map(r => r.data);

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
        showMessage('Error processing files: ' + error.message, 'error');
        processBtn.disabled = false;
    }
}

// Display Data Table
function displayDataTable() {
    const headers = ['Seller Name', 'Stock #', 'Year', 'Make', 'Model', 'Type', 'Auto/Man', 'Colour'];
    const detailHeaders = ['Engine No', 'VIN', 'Reg', 'Rego Expiry', 'KMS'];

    const fields = ['mta', 'year', 'make', 'model', 'type', 'transmission', 'color'];
    const detailFields = ['engine_no', 'vin', 'reg', 'rego_expiry', 'odometer'];

    let tableHTML = '<table>';

    // Add data rows
    extractedData.forEach((data, rowIndex) => {
        // Vehicle group wrapper
        tableHTML += '<tbody class="vehicle-group">';

        // First header row - using TH elements in regular TR (not thead)
        tableHTML += '<tr class="header-row">';
        tableHTML += '<th colspan="3">Seller Name</th>'; // Increased from 2 to 3
        tableHTML += '<th>Stock #</th>';
        tableHTML += '<th class="year-col">Year</th>'; // Half width
        tableHTML += '<th>Make</th>';
        tableHTML += '<th>Model</th>';
        tableHTML += '<th>Type</th>';
        tableHTML += '<th>Auto/Man</th>';
        tableHTML += '<th>Colour</th>';
        tableHTML += '</tr>';

        // First row of data
        tableHTML += '<tr class="data-row">';

        // Seller name input (triple width now) with autocomplete
        const sellerValue = data['seller_name'] || '';
        const dataListId = `seller-list-${rowIndex}`;
        tableHTML += `<td colspan="3">
                      <input type="text" value="${escapeHtml(sellerValue)}"
                      data-row="${rowIndex}" data-field="seller_name"
                      list="${dataListId}"
                      onchange="updateData(${rowIndex}, 'seller_name', this.value)">
                      <datalist id="${dataListId}">
                      ${sellerHistory.map(name => `<option value="${escapeHtml(name)}">`).join('')}
                      </datalist>
                      </td>`;

        // Other fields
        fields.forEach(field => {
            const value = data[field] || '';
            const cellClass = field === 'year' ? ' class="year-col"' : '';
            // Add warning class for empty important fields
            const isEmpty = !value || value.trim() === '';
            const isImportant = ['make', 'model', 'vin'].includes(field);
            const inputClass = (isEmpty && isImportant) ? 'class="missing-data"' : '';
            tableHTML += `<td${cellClass}><input ${inputClass} type="text" value="${escapeHtml(value)}"
                          data-row="${rowIndex}" data-field="${field}"
                          onchange="updateData(${rowIndex}, '${field}', this.value)"></td>`;
        });
        tableHTML += '</tr>';

        // Second header row - Engine No wider (3 cols), VIN (2 cols)
        tableHTML += '<tr class="header-row">';
        tableHTML += `<th colspan="3">Engine No</th>`;
        tableHTML += `<th colspan="2">VIN</th>`;
        tableHTML += `<th>Reg</th>`;
        tableHTML += `<th>Rego Expiry</th>`;
        tableHTML += `<th>KMS</th>`;
        tableHTML += '</tr>';

        // Second row of data
        tableHTML += '<tr class="data-row">';

        // Engine No - colspan 3 (wider)
        let engineValue = data['engine_no'] || '';
        tableHTML += `<td colspan="3"><input type="text" value="${escapeHtml(engineValue)}"
                      data-row="${rowIndex}" data-field="engine_no"
                      onchange="updateData(${rowIndex}, 'engine_no', this.value)"></td>`;

        // VIN - colspan 2
        let vinValue = data['vin'] || '';
        tableHTML += `<td colspan="2"><input type="text" value="${escapeHtml(vinValue)}"
                      data-row="${rowIndex}" data-field="vin"
                      onchange="updateData(${rowIndex}, 'vin', this.value)"></td>`;

        // Reg
        let regValue = data['reg'] || '';
        tableHTML += `<td><input type="text" value="${escapeHtml(regValue)}"
                      data-row="${rowIndex}" data-field="reg"
                      onchange="updateData(${rowIndex}, 'reg', this.value)"></td>`;

        // Rego Expiry
        let regoExpiryValue = data['rego_expiry'] || '';
        tableHTML += `<td><input type="text" value="${escapeHtml(regoExpiryValue)}"
                      data-row="${rowIndex}" data-field="rego_expiry"
                      onchange="updateData(${rowIndex}, 'rego_expiry', this.value)"></td>`;

        // KMS - format with commas
        let odometerValue = data['odometer'] || '';
        if (odometerValue) {
            odometerValue = parseInt(odometerValue.toString().replace(/,/g, '')).toLocaleString();
        }
        tableHTML += `<td><input type="text" value="${escapeHtml(odometerValue)}"
                      data-row="${rowIndex}" data-field="odometer"
                      onchange="updateData(${rowIndex}, 'odometer', this.value)"></td>`;

        tableHTML += '</tr>';

        // Filename row - spans all 8 columns (3+2+1+1+1)
        tableHTML += '<tr class="filename-row">';
        tableHTML += `<td colspan="8" class="filename-cell">Filename: ${escapeHtml(data['source_filename'] || '')}</td>`;
        tableHTML += '</tr>';

        tableHTML += '</tbody>';
    });

    tableHTML += '</table>';
    dataTableContainer.innerHTML = tableHTML;
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
        const response = await fetch('/api/generate-excel', {
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

async function downloadPDFs() {
    showProgress('Generating filled PDF declarations...');

    try {
        const response = await fetch('/api/generate-pdfs', {
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
        const response = await fetch('/api/health');
        const data = await response.json();

        if (!data.template_exists) {
            showMessage('Warning: Target.pdf template not found. PDF generation may fail.', 'error');
        }
    } catch (error) {
        showMessage('Warning: Could not connect to server. Please ensure the backend is running.', 'error');
    }
}

// Initialize
checkServerHealth();
