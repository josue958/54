'use strict';
/**
 * views/subjects.js — Gestión de Materias y distribución de PDAs
 */
const SubjectsView = (() => {

    let _selectedSubjectId = null;

    function render(params={}) {
        if(params.id) _selectedSubjectId = params.id;
        const subjects = getSubjects();
        const cycles   = getCycles();
        return `
        <div class="view-layout">
            <div class="view-sidebar-panel">
                <div class="panel-header">
                    <h3>Materias</h3>
                    <button class="btn btn-primary btn-sm" onclick="SubjectsView.openNewSubjectModal()">+ Nueva</button>
                </div>
                <div id="subject-list">
                    ${subjects.length ? subjects.map((s,i) => `
                        <div class="list-item ${_selectedSubjectId==s.id?'active':''}" onclick="SubjectsView.selectSubject(${s.id})">
                            <div style="display:flex;align-items:center;gap:8px">
                                <span class="color-dot" style="background:${subjectColor(i)};flex-shrink:0"></span>
                                <div>
                                    <div class="list-item-title">${escHtml(s.name)}</div>
                                    <div class="list-item-sub">${escHtml(s.cycle_name)}</div>
                                </div>
                            </div>
                        </div>`).join('') : '<div class="list-empty">Sin materias. Crea una nueva.</div>'}
                </div>
            </div>

            <div class="view-main-panel" id="subject-detail">
                ${_selectedSubjectId ? _renderSubjectDetail(_selectedSubjectId) : _renderPlaceholder()}
            </div>
        </div>

        <!-- Modal Materia -->
        <div class="modal-overlay" id="subject-modal">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 id="sm-title">Nueva Materia</h3>
                    <button class="modal-close" onclick="closeModal('subject-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="subject-form">
                        <input type="hidden" id="sf-id">
                        <div class="form-group">
                            <label class="form-label">Ciclo Escolar</label>
                            <select id="sf-cycle" class="form-control" required>
                                <option value="">Seleccionar ciclo...</option>
                                ${cycles.map(c=>`<option value="${c.id}">${escHtml(c.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Nombre de la Materia</label>
                            <input id="sf-name" class="form-control" placeholder="Ej. Español 1" required>
                        </div>
                        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
                            <div class="form-group">
                                <label class="form-label">Horas Semanales</label>
                                <input id="sf-weekly" type="number" class="form-control" min="1" max="50" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Total de PDAs</label>
                                <input id="sf-pdas" type="number" class="form-control" min="1" max="30" value="12" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Horario Semanal (horas por día)</label>
                            <div class="schedule-grid">
                                ${['Lun','Mar','Mié','Jue','Vie'].map((d,i)=>`
                                <div class="schedule-cell">
                                    <label class="form-label text-center">${d}</label>
                                    <input type="number" id="sf-d${i+1}" class="form-control text-center schedule-day-input" min="0" max="10" value="0">
                                </div>`).join('')}
                            </div>
                        </div>
                        <div id="sf-error" class="form-error" style="display:none"></div>
                        <button type="submit" class="btn btn-primary w-full">💾 Guardar Materia</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Modal Editar PDA -->
        <div class="modal-overlay" id="pda-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Editar PDA</h3>
                    <button class="modal-close" onclick="closeModal('pda-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="pda-form">
                        <input type="hidden" id="pf-subject-id">
                        <input type="hidden" id="pf-pda-number">
                        <input type="hidden" id="pf-auto-date">
                        <div class="form-group">
                            <label class="form-label">Nombre / Tema del PDA</label>
                            <input id="pf-topic" class="form-control" required>
                        </div>
                        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
                            <div class="form-group">
                                <label class="form-label">Número de Sesiones</label>
                                <input id="pf-sessions" type="number" class="form-control" min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    📅 Fecha de Inicio
                                    <span id="pf-override-badge" style="font-size:10px;margin-left:4px;color:var(--color-warning)"></span>
                                </label>
                                <div style="display:flex;gap:6px">
                                    <input id="pf-start-override" type="date" class="form-control" style="flex:1">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="SubjectsView.resetPdaDate()" title="Restablecer automático">🔄</button>
                                </div>
                            </div>
                        </div>
                        <p id="pf-auto-hint" style="font-size:11px;color:var(--text-muted);margin-top:-8px"></p>
                        <div id="pf-error" class="form-error" style="display:none"></div>
                        <button type="submit" class="btn btn-primary w-full">💾 Guardar PDA</button>
                    </form>
                </div>
            </div>
        </div>`;
    }

    function _renderPlaceholder() {
        return `<div class="placeholder-panel"><div class="placeholder-icon">📚</div>
            <h3>Selecciona una materia</h3>
            <p>Elige una materia de la lista para ver la distribución de sus PDAs.</p></div>`;
    }

    function _renderSubjectDetail(id) {
        const { sessions, distribution, cycle, subj } = getPdaDistribution(id);
        if(!subj) return _renderPlaceholder();

        const totalSess     = sessions.length;
        const customCount   = distribution.filter(p=>p.sessions_count!==0).length;
        const sumSessions   = distribution.reduce((a,p)=>a+p.sessions_count,0);
        const mismatch      = totalSess > 0 && sumSessions !== totalSess;
        const avg           = totalSess > 0 ? (totalSess/subj.total_pdas).toFixed(1) : 0;

        const PERIOD_BADGE  = ['','badge-p1','badge-p2','badge-p3'];

        return `
        <div class="detail-section">
            <div class="detail-header">
                <div>
                    <h2 style="margin:0">${escHtml(subj.name)}</h2>
                    <div class="text-muted" style="font-size:13px;margin-top:4px">${escHtml(cycle?.name||'')} &nbsp;|&nbsp; ${subj.total_pdas} PDAs &nbsp;|&nbsp; ${subj.weekly_hours} hrs/semana</div>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-secondary btn-sm" onclick="SubjectsView.editSubject(${id})">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="SubjectsView.deleteSubjectConfirm(${id})">🗑️ Eliminar</button>
                </div>
            </div>

            <div class="stats-row">
                <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-details">
                    <span class="stat-value">${subj.total_pdas}</span><span class="stat-label">PDAs Totales</span></div></div>
                <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-details">
                    <span class="stat-value">${totalSess}</span><span class="stat-label">Sesiones Totales</span></div></div>
                <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-details">
                    <span class="stat-value">${avg}</span><span class="stat-label">Sesiones Promedio</span></div></div>
            </div>

            ${mismatch ? `<div class="alert alert-warning">⚠️ La suma de sesiones asignadas (${sumSessions}) no coincide con el total del ciclo (${totalSess}). Revisa las sesiones de cada PDA.</div>` : ''}

            <div class="card">
                <div class="card-title">📋 Cronograma de Cobertura de PDAs</div>
                <p class="text-muted" style="font-size:12px;margin-bottom:16px">Haz clic en un PDA para personalizar su tema, número de sesiones o fecha de inicio.</p>

                <div class="pda-list" id="pda-list">
                    ${distribution.map(pda => {
                        const pb = PERIOD_BADGE[pda.start_period]||'badge-p1';
                        const eb = PERIOD_BADGE[pda.end_period]||'badge-p1';
                        const hasOv = pda.start_date_override;
                        return `
                        <div class="pda-card" id="pda-card-${pda.pda_number}">
                            <div class="pda-card-header" onclick="SubjectsView.togglePdaCard(${pda.pda_number})">
                                <div class="pda-card-left">
                                    <span class="pda-number">${pda.pda_number}</span>
                                    <div>
                                        <div class="pda-title">${escHtml(pda.topic)}</div>
                                        <div style="display:flex;gap:6px;margin-top:3px">
                                            <span class="badge ${pb}">${pda.start_period?'P'+pda.start_period:'-'}</span>
                                            <span class="badge badge-neutral">${pda.sessions_count} ses.</span>
                                            ${hasOv?'<span class="badge badge-warning">⚡ personalizada</span>':''}
                                        </div>
                                    </div>
                                </div>
                                <div class="pda-card-right">
                                    <span class="pda-dates">
                                        ${pda.start_date ? formatDateSpanish(pda.start_date,true) : '—'} al ${pda.end_date ? formatDateSpanish(pda.end_date,true) : '—'}
                                    </span>
                                    <span class="accordion-arrow">▶</span>
                                </div>
                            </div>
                            <div class="pda-card-body" id="pda-body-${pda.pda_number}" style="display:none">
                                <div class="pda-edit-actions">
                                    <button class="btn btn-primary btn-sm" onclick="SubjectsView.openPdaModal(${id},${pda.pda_number})">✏️ Editar PDA</button>
                                </div>
                                <div class="session-label">Sesiones programadas:</div>
                                <div class="session-grid">
                                    ${pda.sessions.map(s => {
                                        const sb = PERIOD_BADGE[s.period]||'badge-p1';
                                        return `<span class="session-pill ${sb}" title="${escHtml(s.date)}">
                                            ${formatDateSpanish(s.date,true)}
                                        </span>`;
                                    }).join('')}
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }

    function init(params={}) {
        if(params.id) _selectedSubjectId = params.id;

        // Subject form
        document.getElementById('subject-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const schedule = {};
            const daily = [0,0,0,0,0];
            let sum = 0;
            for(let i=1;i<=5;i++) {
                const v = parseInt(document.getElementById(`sf-d${i}`)?.value)||0;
                schedule[i] = v;
                daily[i-1] = v;
                sum += v;
            }
            const weekly = parseInt(document.getElementById('sf-weekly').value)||0;
            const err = document.getElementById('sf-error');
            if(sum !== weekly) {
                err.textContent = `La suma de horas diarias (${sum}) debe ser igual a las horas semanales (${weekly}).`;
                err.style.display = 'block'; return;
            }
            err.style.display = 'none';
            try {
                const newId = await saveSubject({
                    id:          document.getElementById('sf-id').value || null,
                    cycle_id:    document.getElementById('sf-cycle').value,
                    name:        document.getElementById('sf-name').value,
                    weekly_hours:weekly,
                    schedule,
                    total_pdas:  parseInt(document.getElementById('sf-pdas').value)
                });
                closeModal('subject-modal');
                showToast('Materia guardada.');
                _selectedSubjectId = newId;
                refreshView(params);
            } catch(err) { showToast('Error: '+err.message,'error'); }
        });

        // PDA form
        document.getElementById('pda-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const sid     = document.getElementById('pf-subject-id').value;
            const pNum    = document.getElementById('pf-pda-number').value;
            const topic   = document.getElementById('pf-topic').value;
            const sess    = document.getElementById('pf-sessions').value;
            const oDate   = document.getElementById('pf-start-override').value;
            try {
                await savePda(sid, pNum, topic, sess||null, oDate||null);
                closeModal('pda-modal');
                showToast(`PDA ${pNum} actualizado.`);
                refreshDetail();
            } catch(err) { showToast('Error: '+err.message,'error'); }
        });

        document.querySelectorAll('.modal-overlay').forEach(el => {
            el.addEventListener('click', e => { if(e.target===el) el.classList.remove('open'); });
        });
    }

    function refreshView(params={}) {
        document.getElementById('main-content').innerHTML = render(params);
        init(params);
        updateSidebar();
    }

    function refreshDetail() {
        const det = document.getElementById('subject-detail');
        if(det) { det.innerHTML = _selectedSubjectId ? _renderSubjectDetail(_selectedSubjectId) : _renderPlaceholder(); }
    }

    // ── Acciones públicas ──
    function selectSubject(id) {
        _selectedSubjectId = id;
        refreshView();
    }

    function openNewSubjectModal() {
        document.getElementById('sm-title').textContent = 'Nueva Materia';
        document.getElementById('sf-id').value    = '';
        document.getElementById('sf-name').value  = '';
        document.getElementById('sf-cycle').value = '';
        document.getElementById('sf-weekly').value= '';
        document.getElementById('sf-pdas').value  = '12';
        for(let i=1;i<=5;i++) { document.getElementById(`sf-d${i}`).value = '0'; }
        document.getElementById('sf-error').style.display = 'none';
        openModal('subject-modal');
    }

    function editSubject(id) {
        const s = getSubject(id);
        if(!s) return;
        const sched = typeof s.schedule==='string' ? JSON.parse(s.schedule) : s.schedule;
        document.getElementById('sm-title').textContent = 'Editar Materia';
        document.getElementById('sf-id').value    = s.id;
        document.getElementById('sf-name').value  = s.name;
        document.getElementById('sf-cycle').value = s.cycle_id;
        document.getElementById('sf-weekly').value= s.weekly_hours;
        document.getElementById('sf-pdas').value  = s.total_pdas;
        for(let i=1;i<=5;i++) { document.getElementById(`sf-d${i}`).value = sched[i]||sched[String(i)]||0; }
        document.getElementById('sf-error').style.display = 'none';
        openModal('subject-modal');
    }

    async function deleteSubjectConfirm(id) {
        const s = getSubject(id);
        if(!confirm(`¿Eliminar la materia "${s?.name}"? Se eliminarán todos sus PDAs.`)) return;
        await deleteSubject(id);
        _selectedSubjectId = null;
        showToast('Materia eliminada.');
        refreshView();
    }

    function openPdaModal(subjectId, pdaNumber) {
        const { distribution } = getPdaDistribution(subjectId);
        const pda = distribution.find(p=>p.pda_number==pdaNumber);
        if(!pda) return;
        document.getElementById('pf-subject-id').value     = subjectId;
        document.getElementById('pf-pda-number').value     = pdaNumber;
        document.getElementById('pf-topic').value          = pda.topic;
        document.getElementById('pf-sessions').value       = pda.sessions_count||'';
        document.getElementById('pf-start-override').value = pda.start_date_override||pda.start_date||'';
        document.getElementById('pf-auto-date').value      = pda.start_date||'';
        document.getElementById('pf-auto-hint').textContent= pda.start_date ? `Fecha calculada: ${formatDateSpanish(pda.start_date,true)}` : '';
        document.getElementById('pf-override-badge').textContent = pda.start_date_override ? '⚡ personalizada' : '';
        openModal('pda-modal');
    }

    function resetPdaDate() {
        const auto = document.getElementById('pf-auto-date').value;
        document.getElementById('pf-start-override').value = '';
        document.getElementById('pf-override-badge').textContent = '';
    }

    function togglePdaCard(num) {
        const body  = document.getElementById(`pda-body-${num}`);
        const card  = document.getElementById(`pda-card-${num}`);
        const arrow = card?.querySelector('.accordion-arrow');
        if(!body) return;
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        if(arrow) arrow.style.transform = open ? '' : 'rotate(90deg)';
    }

    return { render, init, selectSubject, openNewSubjectModal, editSubject, deleteSubjectConfirm,
             openPdaModal, resetPdaDate, togglePdaCard };
})();
