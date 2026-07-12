// ==============================================
// PROJECT REUNITE — RECORDS PAGE SCRIPT
// ==============================================

document.addEventListener('DOMContentLoaded', () => {

    const recordsContainer = document.getElementById('recordsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortFilter = document.getElementById('sortFilter');
    const statusFilter = document.getElementById('statusFilter');
    const recordCountEl = document.getElementById('recordCount');

    let allCases = [];


    // --- Load Records ---
    async function loadRecords() {
        // Try backend first, fallback to localStorage
        try {
            const data = await apiCall('/api/cases');
            allCases = data.cases || [];
            // Sync to localStorage
            saveLocalCases(allCases);
        } catch {
            allCases = getLocalCases();
        }

        renderRecords();
    }


    // --- Render Records ---
    function renderRecords() {
        if (!recordsContainer) return;

        let filtered = [...allCases];

        // Search filter
        const query = (searchInput?.value || '').toLowerCase().trim();
        if (query) {
            filtered = filtered.filter(c =>
                (c.personName || '').toLowerCase().includes(query) ||
                (c.location || '').toLowerCase().includes(query) ||
                (c.caseId || '').toLowerCase().includes(query)
            );
        }

        // Status filter
        const status = statusFilter?.value || 'all';
        if (status !== 'all') {
            filtered = filtered.filter(c => (c.status || 'active') === status);
        }

        // Sort
        const sort = sortFilter?.value || 'newest';
        if (sort === 'newest') {
            filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        } else if (sort === 'oldest') {
            filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        } else if (sort === 'name') {
            filtered.sort((a, b) => (a.personName || '').localeCompare(b.personName || ''));
        }

        // Update count
        if (recordCountEl) {
            recordCountEl.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;
        }

        // Clear container
        recordsContainer.innerHTML = '';

        // Empty state
        if (filtered.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'records-empty';
            emptyDiv.innerHTML = `
                <i class="fas fa-folder-open records-empty__icon"></i>
                <h3 class="records-empty__title">${query ? 'No matches found' : 'No cases registered'}</h3>
                <p class="records-empty__text">${query ? 'Try a different search term.' : 'Register a new case from the Investigation Portal to see it here.'}</p>
                ${!query ? '<a href="portal.html" class="btn btn--primary btn--sm"><i class="fas fa-plus"></i> Register Case</a>' : ''}
            `;
            recordsContainer.appendChild(emptyDiv);
            return;
        }

        // Render cards
        filtered.forEach(c => {
            const card = createRecordCard(c);
            recordsContainer.appendChild(card);
        });
    }


    // --- Create Record Card (No raw innerHTML with user data) ---
    function createRecordCard(c) {
        const card = document.createElement('div');
        card.className = 'record-card';

        // Image section
        const imageSection = document.createElement('div');
        if (c.photo) {
            imageSection.className = 'record-card__image';
            const img = document.createElement('img');
            img.src = c.photo;
            img.alt = `Photo of ${escapeHTML(c.personName)}`;
            img.loading = 'lazy';
            imageSection.appendChild(img);
        } else {
            imageSection.className = 'record-card__no-image';
            const icon = document.createElement('i');
            icon.className = 'fas fa-user';
            imageSection.appendChild(icon);
        }
        card.appendChild(imageSection);

        // Body
        const body = document.createElement('div');
        body.className = 'record-card__body';

        // Top row: name + status
        const top = document.createElement('div');
        top.className = 'record-card__top';

        const name = document.createElement('h3');
        name.className = 'record-card__name';
        name.textContent = c.personName || 'Unknown';
        top.appendChild(name);

        const statusBadge = document.createElement('span');
        const cStatus = c.status || 'active';
        statusBadge.className = `badge ${cStatus === 'resolved' ? 'badge--success' : 'badge--accent'} record-card__status`;
        statusBadge.textContent = cStatus === 'resolved' ? 'Resolved' : 'Active';
        top.appendChild(statusBadge);

        body.appendChild(top);

        // Case ID
        const idEl = document.createElement('p');
        idEl.className = 'record-card__id';
        idEl.textContent = c.caseId || '—';
        body.appendChild(idEl);

        // Details
        const details = document.createElement('div');
        details.className = 'record-card__details';

        const detailItems = [
            { icon: 'fas fa-user', text: `${escapeHTML(c.age) || '?'} yrs · ${escapeHTML(c.gender) || '—'}` },
            { icon: 'fas fa-map-marker-alt', text: c.location || '—' },
            { icon: 'fas fa-phone', text: c.contact || '—' },
            { icon: 'fas fa-calendar', text: c.missingDate ? formatDate(c.missingDate) : '—' }
        ];

        detailItems.forEach(d => {
            const row = document.createElement('div');
            row.className = 'record-card__detail';

            const icon = document.createElement('i');
            icon.className = d.icon;
            row.appendChild(icon);

            const span = document.createElement('span');
            span.textContent = d.text;
            row.appendChild(span);

            details.appendChild(row);
        });

        body.appendChild(details);

        // Info
        if (c.info && c.info.trim()) {
            const infoEl = document.createElement('div');
            infoEl.className = 'record-card__info';
            infoEl.textContent = c.info;
            body.appendChild(infoEl);
        }

        // Footer actions
        const footer = document.createElement('div');
        footer.className = 'record-card__footer';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn--secondary';
        editBtn.innerHTML = '<i class="fas fa-pen"></i> Edit';
        editBtn.addEventListener('click', () => openEditModal(c));
        footer.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn--danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        deleteBtn.addEventListener('click', () => {
            showConfirmDialog(
                'Delete Case',
                `Are you sure you want to delete the case for "${c.personName}"? This action cannot be undone.`,
                () => handleDelete(c.caseId)
            );
        });
        footer.appendChild(deleteBtn);

        body.appendChild(footer);
        card.appendChild(body);

        return card;
    }


    // --- Delete Case ---
    async function handleDelete(caseId) {
        try {
            await apiCall(`/api/cases/${caseId}`, { method: 'DELETE' });
        } catch {
            // Backend unavailable, just delete locally
        }

        deleteLocalCase(caseId);
        allCases = allCases.filter(c => c.caseId !== caseId);
        renderRecords();
        showToast('Case deleted.', 'success');
    }


    // --- Edit Modal ---
    const editOverlay = document.getElementById('editModalOverlay');
    const editCloseBtn = document.getElementById('editModalClose');
    const editCancelBtn = document.getElementById('editCancelBtn');
    const editSaveBtn = document.getElementById('editSaveBtn');

    function openEditModal(c) {
        document.getElementById('editCaseId').value = c.caseId;
        document.getElementById('editPersonName').value = c.personName || '';
        document.getElementById('editAge').value = c.age || '';
        document.getElementById('editGender').value = c.gender || 'Male';
        document.getElementById('editContact').value = c.contact || '';
        document.getElementById('editLocation').value = c.location || '';
        document.getElementById('editInfo').value = c.info || '';
        document.getElementById('editStatus').value = c.status || 'active';

        if (editOverlay) editOverlay.classList.add('modal-overlay--active');
    }

    function closeEditModal() {
        if (editOverlay) editOverlay.classList.remove('modal-overlay--active');
    }

    if (editCloseBtn) editCloseBtn.addEventListener('click', closeEditModal);
    if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
    if (editOverlay) {
        editOverlay.addEventListener('click', (e) => {
            if (e.target === editOverlay) closeEditModal();
        });
    }

    if (editSaveBtn) {
        editSaveBtn.addEventListener('click', async () => {
            const caseId = document.getElementById('editCaseId').value;
            const updatedData = {
                personName: document.getElementById('editPersonName').value.trim(),
                age: document.getElementById('editAge').value,
                gender: document.getElementById('editGender').value,
                contact: document.getElementById('editContact').value.trim(),
                location: document.getElementById('editLocation').value.trim(),
                info: document.getElementById('editInfo').value.trim(),
                status: document.getElementById('editStatus').value
            };

            // Validate
            if (!updatedData.personName) {
                showToast('Name is required.', 'error');
                return;
            }

            // Try backend
            try {
                await apiCall(`/api/cases/${caseId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updatedData)
                });
            } catch {
                // Backend unavailable
            }

            // Update locally
            updateLocalCase(caseId, updatedData);
            allCases = allCases.map(c =>
                c.caseId === caseId ? { ...c, ...updatedData } : c
            );

            closeEditModal();
            renderRecords();
            showToast('Case updated.', 'success');
        });
    }


    // --- Search & Filter Events ---
    if (searchInput) {
        searchInput.addEventListener('input', debounce(renderRecords, 300));
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', renderRecords);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', renderRecords);
    }


    // --- Debounce Helper ---
    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }


    // --- Initialize ---
    loadRecords();

});