'use strict';
/**
 * views/cycles.js — Gestión de Ciclos Escolares
 */
const CyclesView = (() => {

    let _selectedCycleId = null;

    function render() {
        const cycles = getCycles();
        return `
        <div class="view-layout">
            <div class="view-sidebar-panel">
                <div class="panel-header">
                    <h3>Ciclos Escolares</h3>
                    <button class="btn btn-primary btn-sm" onclick="CyclesView.openNewCycleModal()">+ Nuevo</button>
                </div>
                <div id="cycle-list">
                    ${cycles.length ? cycles.map(c => `
                        <div class="list-item ${_selectedCycleId==c.id?'active':''}" onclick="CyclesView.selectCycle(${c.id})">
                            <div class="list-item-title">${escHtml(c.name)}</div>
                            <div class="list-item-sub">${escHtml(c.start_date)} — ${escHtml(c.end_date||'Sin fecha fin')}</div>
                        </div>`).join('') : '<div class="list-empty">No hay ciclos. Crea uno nuevo.</div>'}
                </div>
            </div>

            <div class="view-main-panel" id="cycle-detail">
                ${_selectedCycleId ? _renderCycleDetail(_selectedCycleId) : _renderPlaceholder()}
            </div>
        </div>

        <!-- Modal Nuevo/Editar Ciclo -->
        <div class="modal-overlay" id="cycle-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="cycle-modal-title">Nuevo Ciclo Escolar</h3>
                    <button class="modal-close" onclick="closeModal('cycle-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="cycle-form">
                        <input type="hidden" id="cf-id">
                        <div class="form-group">
                            <label class="form-label">Nombre del Ciclo</label>
                            <input id="cf-name" class="form-control" placeholder="Ej. Ciclo Escolar 2026-2027" required>
                        </div>
                        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
                            <div class="form-group">
                                <label class="form-label">Fecha de Inicio del Ciclo</label>
                                <input id="cf-start" type="date" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Fecha de Fin del Ciclo</label>
                                <input id="cf-end" type="date" class="form-control">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Total de Días Escolares</label>
                            <input id="cf-total" type="number" class="form-control" value="190" min="1" required>
                        </div>
                        <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr;gap:12px">
                            <div class="form-group">
                                <label class="form-label">Días Periodo 1</label>
                                <input id="cf-p1" type="number" class="form-control" value="63" min="1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Días Periodo 2</label>
                                <input id="cf-p2" type="number" class="form-control" value="63" min="1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Días Periodo 3</label>
                                <input id="cf-p3" type="number" class="form-control" value="64" min="1" required>
                            </div>
                        </div>
                        <div id="cf-error" class="form-error" style="display:none"></div>
                        <button type="submit" class="btn btn-primary w-full">💾 Guardar Ciclo</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Modal Nuevo Festivo -->
        <div class="modal-overlay" id="holiday-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Agregar Día Inhábil</h3>
                    <button class="modal-close" onclick="closeModal('holiday-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="holiday-form">
                        <input type="hidden" id="hf-cycle-id">
                        <input type="hidden" id="hf-edit-date">
                        <div class="form-group">
                            <label class="form-label">Fecha del Día Inhábil</label>
                            <input id="hf-date" type="date" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Etiqueta / Motivo</label>
                            <input id="hf-label" class="form-control" placeholder="Ej. Independencia de México" value="Suspensión de labores" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-full">💾 Guardar</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Modal Nuevo Período Inhábil -->
        <div class="modal-overlay" id="custom-holiday-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="chm-title">Agregar Período Inhábil</h3>
                    <button class="modal-close" onclick="closeModal('custom-holiday-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="custom-holiday-form">
                        <input type="hidden" id="chf-cycle-id">
                        <input type="hidden" id="chf-id">
                        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
                            <div class="form-group">
                                <label class="form-label">Fecha de Inicio</label>
                                <input id="chf-start" type="date" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Fecha de Fin</label>
                                <input id="chf-end" type="date" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Etiqueta / Motivo</label>
                            <input id="chf-label" class="form-control" placeholder="Ej. Vacaciones de Primavera" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-full">💾 Guardar</button>
                    </form>
                </div>
            </div>
        </div>`;
    }

    function _renderPlaceholder() {
        return `<div class="placeholder-panel"><div class="placeholder-icon">🗓️</div>
            <h3>Selecciona un ciclo escolar</h3>
            <p>Elige un ciclo de la lista para ver y editar sus detalles.</p></div>`;
    }

    function _renderCycleDetail(id) {
        const c  = getCycle(id);
        if(!c) return _renderPlaceholder();
        const hmap  = getHolidaysMap(id);
        const clist = getCustomHolidays(id);
        return `
        <div class="detail-section">
            <div class="detail-header">
                <div>
                    <h2 style="margin:0">${escHtml(c.name)}</h2>
                    <div class="text-muted" style="font-size:13px;margin-top:4px">
                        ${escHtml(c.start_date)} — ${escHtml(c.end_date||'Sin fecha fin')} &nbsp;|&nbsp; ${c.total_days} días escolares
                    </div>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-secondary btn-sm" onclick="CyclesView.editCycle(${id})">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="CyclesView.deleteCycleConfirm(${id})">🗑️ Eliminar</button>
                </div>
            </div>

            <div class="stats-row">
                <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-details">
                    <span class="stat-value">${c.period1_days}</span><span class="stat-label">Días P1</span></div></div>
                <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-details">
                    <span class="stat-value">${c.period2_days}</span><span class="stat-label">Días P2</span></div></div>
                <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-details">
                    <span class="stat-value">${c.period3_days}</span><span class="stat-label">Días P3</span></div></div>
                <div class="stat-card"><div class="stat-icon">🚫</div><div class="stat-details">
                    <span class="stat-value">${Object.keys(hmap).length}</span><span class="stat-label">Días Inhábiles</span></div></div>
            </div>

            <!-- Días Inhábiles -->
            <div class="card">
                <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
                    <span>🚫 Días Inhábiles (Festivos)</span>
                    <button class="btn btn-primary btn-sm" onclick="CyclesView.openHolidayModal(${id})">+ Agregar</button>
                </div>
                ${Object.keys(hmap).length ? `
                <table class="data-table">
                    <thead><tr><th>Fecha</th><th>Etiqueta</th><th></th></tr></thead>
                    <tbody>
                    ${Object.entries(hmap).sort(([a],[b])=>a.localeCompare(b)).map(([date,label]) => `
                        <tr>
                            <td>${escHtml(date)}</td>
                            <td><input class="form-control inline-input" value="${escHtml(label)}" 
                                data-cycle="${id}" data-date="${escHtml(date)}" onchange="CyclesView.updateHolidayLabel(this)"></td>
                            <td><button class="btn btn-danger btn-sm" onclick="CyclesView.removeHolidayConfirm(${id},'${escHtml(date)}')">🗑️</button></td>
                        </tr>`).join('')}
                    </tbody>
                </table>` : '<p class="text-muted text-center" style="padding:20px">No hay días inhábiles registrados.</p>'}
            </div>

            <!-- Períodos Inhábiles -->
            <div class="card">
                <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
                    <span>📆 Períodos Inhábiles Personalizados</span>
                    <button class="btn btn-primary btn-sm" onclick="CyclesView.openCustomHolidayModal(${id})">+ Agregar</button>
                </div>
                ${clist.length ? `
                <table class="data-table">
                    <thead><tr><th>Desde</th><th>Hasta</th><th>Etiqueta</th><th></th></tr></thead>
                    <tbody>
                    ${clist.map(r => `
                        <tr>
                            <td>${escHtml(r.start_date)}</td>
                            <td>${escHtml(r.end_date)}</td>
                            <td>${escHtml(r.label)}</td>
                            <td style="display:flex;gap:6px">
                                <button class="btn btn-secondary btn-sm" onclick="CyclesView.editCustomHoliday(${r.id},${id})">✏️</button>
                                <button class="btn btn-danger btn-sm" onclick="CyclesView.deleteCustomHolidayConfirm(${r.id},${id})">🗑️</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>` : '<p class="text-muted text-center" style="padding:20px">No hay períodos personalizados.</p>'}
            </div>
        </div>`;
    }

    function init() {
        // Cycle form
        document.getElementById('cycle-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const err = document.getElementById('cf-error');
            const p1 = +document.getElementById('cf-p1').value;
            const p2 = +document.getElementById('cf-p2').value;
            const p3 = +document.getElementById('cf-p3').value;
            const total = +document.getElementById('cf-total').value;
            if(p1+p2+p3 !== total) {
                err.textContent = `La suma de los períodos (${p1+p2+p3}) debe ser igual al total de días (${total}).`;
                err.style.display = 'block'; return;
            }
            err.style.display = 'none';
            try {
                const id = await saveCycle({
                    id:          document.getElementById('cf-id').value || null,
                    name:        document.getElementById('cf-name').value,
                    start_date:  document.getElementById('cf-start').value,
                    end_date:    document.getElementById('cf-end').value,
                    total_days:  total, period1_days: p1, period2_days: p2, period3_days: p3
                });
                closeModal('cycle-modal');
                showToast('Ciclo guardado correctamente.');
                _selectedCycleId = id;
                refreshView();
            } catch(err) { showToast('Error: '+err.message,'error'); }
        });

        // Holiday form
        document.getElementById('holiday-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const cycleId  = document.getElementById('hf-cycle-id').value;
            const editDate = document.getElementById('hf-edit-date').value;
            const date     = document.getElementById('hf-date').value;
            const label    = document.getElementById('hf-label').value;
            try {
                if(editDate) await removeHoliday(cycleId, editDate);
                await addHoliday(cycleId, date, label);
                closeModal('holiday-modal');
                showToast('Día inhábil guardado.');
                refreshDetail();
            } catch(err) { showToast('Error: '+err.message,'error'); }
        });

        // Custom holiday form
        document.getElementById('custom-holiday-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const id      = document.getElementById('chf-id').value;
            const cycleId = document.getElementById('chf-cycle-id').value;
            const start   = document.getElementById('chf-start').value;
            const end     = document.getElementById('chf-end').value;
            const label   = document.getElementById('chf-label').value;
            if(start > end) { showToast('La fecha de inicio debe ser anterior al fin.','error'); return; }
            try {
                if(id) await updateCustomHoliday(id, start, end, label);
                else   await addCustomHoliday(cycleId, start, end, label);
                closeModal('custom-holiday-modal');
                showToast('Período inhábil guardado.');
                refreshDetail();
            } catch(err) { showToast('Error: '+err.message,'error'); }
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(el => {
            el.addEventListener('click', e => { if(e.target===el) el.classList.remove('open'); });
        });
    }

    function refreshView() {
        document.getElementById('main-content').innerHTML = render();
        init();
        updateSidebar();
    }

    function refreshDetail() {
        const det = document.getElementById('cycle-detail');
        if(det) { det.innerHTML = _selectedCycleId ? _renderCycleDetail(_selectedCycleId) : _renderPlaceholder(); init(); }
    }

    // ── Acciones públicas ──
    function selectCycle(id) {
        _selectedCycleId = id;
        refreshView();
    }

    function openNewCycleModal() {
        document.getElementById('cycle-modal-title').textContent = 'Nuevo Ciclo Escolar';
        document.getElementById('cf-id').value    = '';
        document.getElementById('cf-name').value  = '';
        document.getElementById('cf-start').value = '';
        document.getElementById('cf-end').value   = '';
        document.getElementById('cf-total').value = '190';
        document.getElementById('cf-p1').value    = '63';
        document.getElementById('cf-p2').value    = '63';
        document.getElementById('cf-p3').value    = '64';
        document.getElementById('cf-error').style.display = 'none';
        openModal('cycle-modal');
    }

    function editCycle(id) {
        const c = getCycle(id);
        if(!c) return;
        document.getElementById('cycle-modal-title').textContent = 'Editar Ciclo Escolar';
        document.getElementById('cf-id').value    = c.id;
        document.getElementById('cf-name').value  = c.name;
        document.getElementById('cf-start').value = c.start_date;
        document.getElementById('cf-end').value   = c.end_date||'';
        document.getElementById('cf-total').value = c.total_days;
        document.getElementById('cf-p1').value    = c.period1_days;
        document.getElementById('cf-p2').value    = c.period2_days;
        document.getElementById('cf-p3').value    = c.period3_days;
        document.getElementById('cf-error').style.display = 'none';
        openModal('cycle-modal');
    }

    async function deleteCycleConfirm(id) {
        const c = getCycle(id);
        if(!confirm(`¿Eliminar el ciclo "${c?.name}"? Se eliminarán todas sus materias y PDAs.`)) return;
        await deleteCycle(id);
        _selectedCycleId = null;
        showToast('Ciclo eliminado.');
        refreshView();
    }

    function openHolidayModal(cycleId, date='', label='Suspensión de labores') {
        document.getElementById('hf-cycle-id').value  = cycleId;
        document.getElementById('hf-edit-date').value = date;
        document.getElementById('hf-date').value      = date;
        document.getElementById('hf-label').value     = label;
        openModal('holiday-modal');
    }

    async function updateHolidayLabel(input) {
        await updateHoliday(input.dataset.cycle, input.dataset.date, input.value);
        showToast('Etiqueta actualizada.');
    }

    async function removeHolidayConfirm(cycleId, date) {
        if(!confirm(`¿Eliminar el día inhábil ${date}?`)) return;
        await removeHoliday(cycleId, date);
        showToast('Día inhábil eliminado.');
        refreshDetail();
    }

    function openCustomHolidayModal(cycleId) {
        document.getElementById('chm-title').textContent = 'Agregar Período Inhábil';
        document.getElementById('chf-id').value       = '';
        document.getElementById('chf-cycle-id').value = cycleId;
        document.getElementById('chf-start').value    = '';
        document.getElementById('chf-end').value      = '';
        document.getElementById('chf-label').value    = '';
        openModal('custom-holiday-modal');
    }

    function editCustomHoliday(id, cycleId) {
        const rows = getCustomHolidays(cycleId);
        const r = rows.find(x => x.id == id);
        if(!r) return;
        document.getElementById('chm-title').textContent = 'Editar Período Inhábil';
        document.getElementById('chf-id').value       = id;
        document.getElementById('chf-cycle-id').value = cycleId;
        document.getElementById('chf-start').value    = r.start_date;
        document.getElementById('chf-end').value      = r.end_date;
        document.getElementById('chf-label').value    = r.label;
        openModal('custom-holiday-modal');
    }

    async function deleteCustomHolidayConfirm(id, cycleId) {
        if(!confirm('¿Eliminar este período inhábil?')) return;
        await deleteCustomHoliday(id);
        showToast('Período eliminado.');
        refreshDetail();
    }

    return { render, init, selectCycle, openNewCycleModal, editCycle, deleteCycleConfirm,
             openHolidayModal, updateHolidayLabel, removeHolidayConfirm,
             openCustomHolidayModal, editCustomHoliday, deleteCustomHolidayConfirm };
})();
