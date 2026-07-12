// ==============================================
// PROJECT REUNITE — INVESTIGATION PORTAL SCRIPT
// ==============================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Generate Case ID ---
    const caseIdDisplay = document.getElementById('generatedCaseId');
    const currentCaseId = generateCaseId();
    if (caseIdDisplay) {
        caseIdDisplay.textContent = currentCaseId;
    }


    // --- Photo Upload: Drag & Drop + Click ---
    const uploadZone = document.getElementById('uploadZone');
    const photoInput = document.getElementById('photo');
    const uploadContent = document.getElementById('uploadContent');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');
    const removePhotoBtn = document.getElementById('removePhoto');
    const fileNameEl = document.getElementById('fileName');

    if (uploadZone && photoInput) {
        // Click to browse
        uploadZone.addEventListener('click', (e) => {
            if (e.target.closest('.upload-zone__remove')) return;
            photoInput.click();
        });

        // File selected
        photoInput.addEventListener('change', () => {
            if (photoInput.files.length > 0) {
                handleFileSelect(photoInput.files[0]);
            }
        });

        // Drag & drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('upload-zone--dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('upload-zone--dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('upload-zone--dragover');
            if (e.dataTransfer.files.length > 0) {
                photoInput.files = e.dataTransfer.files;
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Remove photo
        if (removePhotoBtn) {
            removePhotoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearPhotoPreview();
            });
        }
    }

    function handleFileSelect(file) {
        const errors = validateFile(file);
        const photoError = document.getElementById('photoError');

        if (errors.length > 0) {
            if (photoError) photoError.textContent = errors[0];
            clearPhotoPreview();
            return;
        }

        if (photoError) photoError.textContent = '';

        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImage) previewImage.src = e.target.result;
            if (fileNameEl) fileNameEl.textContent = file.name;
            if (uploadContent) uploadContent.style.display = 'none';
            if (uploadPreview) uploadPreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    function clearPhotoPreview() {
        if (photoInput) photoInput.value = '';
        if (previewImage) previewImage.src = '';
        if (fileNameEl) fileNameEl.textContent = '';
        if (uploadContent) uploadContent.style.display = 'flex';
        if (uploadPreview) uploadPreview.style.display = 'none';
    }


    // --- Form Validation ---
    const validationRules = {
        personName: { required: true, minLength: 2, maxLength: 100 },
        age: { required: true, min: 0, max: 120 },
        gender: { required: true },
        contact: {
            required: true,
            pattern: /^[0-9+\-\s()]{7,15}$/,
            patternMessage: 'Enter a valid phone number'
        },
        location: { required: true, minLength: 2, maxLength: 200 },
        missingDate: { required: true }
    };

    function validateForm() {
        let isValid = true;

        for (const [fieldId, rules] of Object.entries(validationRules)) {
            const input = document.getElementById(fieldId);
            const errorEl = document.getElementById(`${fieldId}Error`);
            if (!input || !errorEl) continue;

            const value = input.value.trim();
            const errors = validateInput(value, rules);

            if (errors.length > 0) {
                errorEl.textContent = errors[0];
                input.classList.add('form-input--error');
                isValid = false;
            } else {
                errorEl.textContent = '';
                input.classList.remove('form-input--error');
            }
        }

        return isValid;
    }

    // Clear error on input
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
        el.addEventListener('input', () => {
            el.classList.remove('form-input--error');
            const errorEl = document.getElementById(`${el.id}Error`);
            if (errorEl) errorEl.textContent = '';
        });
    });


    // --- Form Submit ---
    const caseForm = document.getElementById('caseForm');
    const saveBtn = document.getElementById('saveBtn');

    if (caseForm) {
        caseForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateForm()) {
                showToast('Please fix the errors before saving.', 'error');
                return;
            }

            // Disable button
            saveBtn.classList.add('btn--loading');
            saveBtn.disabled = true;

            const caseData = {
                caseId: currentCaseId,
                personName: document.getElementById('personName').value.trim(),
                age: document.getElementById('age').value,
                gender: document.getElementById('gender').value,
                contact: document.getElementById('contact').value.trim(),
                location: document.getElementById('location').value.trim(),
                missingDate: document.getElementById('missingDate').value,
                info: document.getElementById('info').value.trim(),
                photo: '',
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            // Handle photo
            const photoFile = photoInput.files[0];

            if (photoFile) {
                // Try backend upload first
                try {
                    const formData = new FormData();
                    formData.append('photo', photoFile);
                    Object.entries(caseData).forEach(([key, val]) => {
                        if (key !== 'photo') formData.append(key, val);
                    });

                    const result = await apiCall('/api/cases', {
                        method: 'POST',
                        body: formData
                    });

                    showToast('Case saved to cloud database!', 'success');
                    addLocalCase({ ...caseData, photo: result.photoUrl || '' });

                    setTimeout(() => {
                        window.location.href = 'records.html';
                    }, 1200);
                    return;

                } catch (err) {
                    console.warn('Backend unavailable, saving locally:', err.message);

                    // Fallback: save with base64 photo locally
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        caseData.photo = ev.target.result;
                        addLocalCase(caseData);
                        showToast('Saved locally (offline mode).', 'warning');
                        setTimeout(() => {
                            window.location.href = 'records.html';
                        }, 1200);
                    };
                    reader.readAsDataURL(photoFile);
                    return;
                }

            } else {
                // No photo — try backend then fallback
                try {
                    await apiCall('/api/cases', {
                        method: 'POST',
                        body: JSON.stringify(caseData)
                    });
                    showToast('Case saved to cloud database!', 'success');
                    addLocalCase(caseData);
                } catch {
                    addLocalCase(caseData);
                    showToast('Saved locally (offline mode).', 'warning');
                }

                setTimeout(() => {
                    window.location.href = 'records.html';
                }, 1200);
            }
        });
    }


    // --- Reset Button ---
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (caseForm) caseForm.reset();
            clearPhotoPreview();

            // Clear all errors
            document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
            document.querySelectorAll('.form-input--error').forEach(el =>
                el.classList.remove('form-input--error')
            );

            showToast('Form cleared.', 'info');
        });
    }


    // --- Load Side Panel Stats ---
    function updateSideStats() {
        const cases = getLocalCases();
        const totalEl = document.getElementById('totalCases');
        const monthEl = document.getElementById('monthCases');
        const activeEl = document.getElementById('activeCases');

        if (totalEl) totalEl.textContent = cases.length;

        if (monthEl) {
            const now = new Date();
            const thisMonth = cases.filter(c => {
                const d = new Date(c.createdAt);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            monthEl.textContent = thisMonth.length;
        }

        if (activeEl) {
            const active = cases.filter(c => c.status !== 'resolved');
            activeEl.textContent = active.length;
        }
    }

    updateSideStats();


    // --- Check API Health ---
    async function checkApiHealth() {
        const badge = document.getElementById('apiStatus');
        if (!badge) return;

        try {
            await apiCall('/api/health');
            badge.textContent = 'Connected';
            badge.style.color = 'var(--success)';
        } catch {
            badge.textContent = 'Offline';
            badge.style.color = 'var(--warning)';
        }
    }

    checkApiHealth();

});