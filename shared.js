// ==============================================
// PROJECT REUNITE — SHARED UTILITIES
// ==============================================

// --- Clock ---
function updateClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
}

setInterval(updateClock, 1000);
updateClock();


// --- Toast Notification System ---
(function initToastContainer() {
    if (document.querySelector('.toast-container')) return;
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
})();

function showToast(message, type = 'info', duration = 4000) {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <span class="toast__icon">${icons[type] || icons.info}</span>
        <span class="toast__message">${escapeHTML(message)}</span>
        <button class="toast__close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => dismissToast(toast));

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => dismissToast(toast), duration);
    }

    return toast;
}

function dismissToast(toast) {
    if (!toast || toast.classList.contains('toast--exit')) return;
    toast.classList.add('toast--exit');
    toast.addEventListener('animationend', () => toast.remove());
}


// --- API Call Wrapper ---
const API_BASE = 'http://127.0.0.1:5000';

async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;

    const defaults = {
        headers: {},
    };

    // Don't set Content-Type for FormData (browser will set boundary)
    if (!(options.body instanceof FormData)) {
        defaults.headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...defaults,
        ...options,
        headers: { ...defaults.headers, ...options.headers }
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || `Request failed (${response.status})`);
        }

        return data;
    } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            throw new Error('Backend unreachable. Using offline mode.');
        }
        throw err;
    }
}


// --- XSS Prevention ---
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}


// --- Date Formatting ---
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateStr);
}


// --- Input Validation ---
function validateInput(value, rules) {
    const errors = [];

    if (rules.required && (!value || !value.trim())) {
        errors.push('This field is required');
        return errors;
    }

    if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`Minimum ${rules.minLength} characters`);
    }

    if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Maximum ${rules.maxLength} characters`);
    }

    if (value && rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.patternMessage || 'Invalid format');
    }

    if (value && rules.min !== undefined && Number(value) < rules.min) {
        errors.push(`Minimum value is ${rules.min}`);
    }

    if (value && rules.max !== undefined && Number(value) > rules.max) {
        errors.push(`Maximum value is ${rules.max}`);
    }

    return errors;
}

function validateFile(file, rules = {}) {
    const errors = [];
    const maxSize = rules.maxSize || 5 * 1024 * 1024; // 5MB default
    const allowedTypes = rules.types || ['image/jpeg', 'image/png', 'image/webp'];

    if (!file) {
        if (rules.required) errors.push('Photo is required');
        return errors;
    }

    if (!allowedTypes.includes(file.type)) {
        errors.push('Only JPEG, PNG, and WebP images are allowed');
    }

    if (file.size > maxSize) {
        errors.push(`File size must be under ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    return errors;
}


// --- Count-Up Animation ---
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.floor(start + (target - start) * eased);

        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}


// --- Intersection Observer for Animations ---
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in--visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', initScrollAnimations);


// --- Confirmation Dialog ---
function showConfirmDialog(title, message, onConfirm) {
    // Remove any existing dialog
    const existing = document.querySelector('.modal-overlay--confirm');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay modal-overlay--active modal-overlay--confirm';

    overlay.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal__header">
                <h3 class="modal__title">${escapeHTML(title)}</h3>
            </div>
            <div class="modal__body">
                <p style="color: var(--text-secondary); font-size: var(--fs-sm);">${escapeHTML(message)}</p>
            </div>
            <div class="modal__actions">
                <button class="btn btn--secondary" id="confirmCancel">Cancel</button>
                <button class="btn btn--danger" id="confirmOk">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#confirmCancel').addEventListener('click', () => {
        overlay.classList.remove('modal-overlay--active');
        setTimeout(() => overlay.remove(), 300);
    });

    overlay.querySelector('#confirmOk').addEventListener('click', () => {
        overlay.classList.remove('modal-overlay--active');
        setTimeout(() => overlay.remove(), 300);
        if (onConfirm) onConfirm();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('modal-overlay--active');
            setTimeout(() => overlay.remove(), 300);
        }
    });
}


// --- Local Storage Helpers ---
function getLocalCases() {
    try {
        return JSON.parse(localStorage.getItem('reunite_cases')) || [];
    } catch {
        return [];
    }
}

function saveLocalCases(cases) {
    localStorage.setItem('reunite_cases', JSON.stringify(cases));
}

function addLocalCase(caseData) {
    const cases = getLocalCases();
    cases.unshift(caseData);
    saveLocalCases(cases);
}

function deleteLocalCase(caseId) {
    const cases = getLocalCases().filter(c => c.caseId !== caseId);
    saveLocalCases(cases);
}

function updateLocalCase(caseId, updatedData) {
    const cases = getLocalCases().map(c =>
        c.caseId === caseId ? { ...c, ...updatedData } : c
    );
    saveLocalCases(cases);
}


// --- Unique ID Generator ---
function generateCaseId() {
    const prefix = 'PR';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

console.log('PROJECT REUNITE — System Initialized');
