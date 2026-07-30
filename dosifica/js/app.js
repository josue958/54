'use strict';

/**
 * js/app.js — Lógica de la aplicación Single Page Application (SPA)
 */

let activePlaneacionId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar la Base de Datos SQLite WASM
    try {
        await initDB();
        showToast('Base de datos inicializada.', 'success');
    } catch (e) {
        console.error("Error inicializando DB:", e);
        showToast('Error al inicializar base de datos: ' + e.message, 'error');
    }

    // 2. Configurar Tab Switcher
    initTabSwitcher();

    // 3. Inicializar Componentes de los Formularios
    initSetupForm();
    initCycleForm();
    initPlanCRUD();
    initBackupPanel();

    // Cargar listas iniciales
    loadCyclesDropdowns();
    renderCyclesList();
    renderPlaneacionesList();
});

/* =========================================================
   SISTEMA DE TOASTS
   ========================================================= */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* =========================================================
   TAB SWITCHER
   ========================================================= */
function initTabSwitcher() {
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    const sections = document.querySelectorAll('.tab-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            
            // Si el usuario cambia de tab, asegurarnos de refrescar los datos correspondientes
            if (target === 'tab-planeaciones') {
                renderPlaneacionesList();
            } else if (target === 'tab-ciclos') {
                renderCyclesList();
            }

            tabBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.style.display = 'none');

            btn.classList.add('active');
            document.getElementById(target).style.display = 'block';

            // Estilos del background
            if (target === 'tab-dosificar' && !activePlaneacionId) {
                document.body.classList.add('bg-grid-pattern');
            } else {
                document.body.classList.remove('bg-grid-pattern');
            }
        });
    });

    // Activar grid pattern al inicio
    document.body.classList.add('bg-grid-pattern');
}

/* =========================================================
   PLANIFICADOR: SETUP DE NUEVA PLANEACION
   ========================================================= */
function initSetupForm() {
    const weeklyInput = document.getElementById('setup-weekly-hours');
    const dayInputs = document.querySelectorAll('#setup-plan-form .day-input');
    const errorMsg = document.getElementById('setup-schedule-error');
    const submitBtn = document.getElementById('setup-submit-btn');
    const form = document.getElementById('setup-plan-form');

    function validateHours() {
        let sum = 0;
        dayInputs.forEach(input => {
            sum += parseInt(input.value) || 0;
        });
        const weekly = parseInt(weeklyInput.value) || 0;
        
        if (sum !== weekly) {
            errorMsg.style.display = 'block';
            errorMsg.textContent = `⚠️ La suma de las horas del horario semanal (${sum} hs) debe ser exactamente igual a las horas semanales (${weekly} hs).`;
            submitBtn.disabled = true;
        } else {
            errorMsg.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    if (weeklyInput && dayInputs.length) {
        dayInputs.forEach(input => input.addEventListener('input', validateHours));
        weeklyInput.addEventListener('input', validateHours);
        validateHours();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cycleId = parseInt(document.getElementById('setup-cycle').value);
        const disciplina = document.getElementById('setup-discipline').value;
        const grado = parseInt(document.getElementById('setup-grade').value);
        const weeklyHours = parseInt(weeklyInput.value);

        // Crear JSON del horario
        const schedule = {};
        for (let d = 1; d <= 5; d++) {
            schedule[d] = parseInt(document.getElementById(`setup-day-${d}`).value) || 0;
        }

        try {
            // 1. Obtener PDAs de la biblioteca pre-cargada
            const libPdas = NEM_PHASE6_LIBRARY[disciplina]?.[grado] || [];
            const totalPdas = libPdas.length || 1;

            // 2. Insertar planeación principal
            const pid = await dbRun(
                `INSERT INTO planeaciones(cycle_id, disciplina, grado, weekly_hours, schedule, total_pdas) VALUES(?,?,?,?,?,?)`,
                [cycleId, disciplina, grado, weeklyHours, JSON.stringify(schedule), totalPdas]
            );

            // 3. Calcular sesiones estimadas por PDA
            const cycles = dbQuery("SELECT * FROM school_cycles WHERE id = ?", [cycleId]);
            const cycle = cycles[0];
            const holidays = JSON.parse(cycle.holidays || '{}');
            
            // Calcular sesiones
            const schoolDays = calculateSchoolDays(cycle.start_date, cycle.total_days, holidays);
            const sessions = mapSessions(schoolDays, schedule, cycle.period1_days, cycle.period2_days);
            const totalSessions = sessions.length;

            const baseSessions = Math.floor(totalSessions / totalPdas);
            const remainder = totalSessions % totalPdas;

            // 4. Insertar PDAs iniciales
            if (libPdas.length > 0) {
                for (let i = 0; i < libPdas.length; i++) {
                    const text = libPdas[i];
                    const pdaNum = i + 1;
                    const verb = getRectorVerb(text);
                    const sCount = baseSessions + (pdaNum <= remainder ? 1 : 0);

                    await dbRun(
                        `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count) VALUES(?,?,?,?,?)`,
                        [pid, pdaNum, text, verb, sCount]
                    );
                }
            } else {
                // PDA en blanco por si no hay biblioteca
                await dbRun(
                    `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count) VALUES(?,?,?,?,?)`,
                    [pid, 1, 'Proceso de Desarrollo de Aprendizaje (PDA) 1', 'Desarrolla', totalSessions]
                );
            }

            showToast('Planeación creada correctamente.', 'success');
            loadPlanification(pid);

        } catch (err) {
            console.error(err);
            showToast('Error al crear planeación: ' + err.message, 'error');
        }
    });
}

/* =========================================================
   CARGA Y EDICION DEL PLANIFICADOR DE PDAS (DETALLADO)
   ========================================================= */
async function loadPlanification(planeacionId) {
    activePlaneacionId = planeacionId;
    document.body.classList.remove('bg-grid-pattern');

    // Cargar datos
    const plans = dbQuery("SELECT * FROM planeaciones WHERE id = ?", [planeacionId]);
    if (!plans.length) {
        showToast('Planeación no encontrada.', 'error');
        return;
    }
    const planeacion = plans[0];
    const cycle = dbQuery("SELECT * FROM school_cycles WHERE id = ?", [planeacion.cycle_id])[0];
    const pdas = dbQuery("SELECT * FROM planeacion_pdas WHERE planeacion_id = ? ORDER BY pda_number ASC", [planeacionId]);

    // Ocultar Setup, Mostrar Planner
    document.getElementById('dosificar-setup').style.display = 'none';
    document.getElementById('dosificar-planner').style.display = 'block';

    // Rellenar cabecera y resúmenes
    document.getElementById('planner-subject-title').innerText = `Dosificación: ${planeacion.disciplina} — ${planeacion.grado}º Grado`;
    document.getElementById('summary-cycle-name').innerText = cycle.name;
    document.getElementById('summary-weekly-hours').innerText = `${planeacion.weekly_hours} hs/semana`;
    
    // Calcular sesiones del ciclo
    const holidays = JSON.parse(cycle.holidays || '{}');
    const schoolDays = calculateSchoolDays(cycle.start_date, cycle.total_days, holidays);
    const schedule = JSON.parse(planeacion.schedule || '{}');
    const sessions = mapSessions(schoolDays, schedule, cycle.period1_days, cycle.period2_days);
    const totalSessions = sessions.length;
    document.getElementById('summary-total-sessions').innerText = totalSessions;

    // Renderizar filas de la tabla
    renderPdaRows(pdas, totalSessions);

    // Configurar listeners del planificador
    const saveBtn = document.getElementById('planner-btn-save');
    const exportBtn = document.getElementById('planner-btn-export');
    const backBtn = document.getElementById('planner-btn-back');
    const addPdaBtn = document.getElementById('planner-btn-add-pda');

    // Limpiar listeners antiguos clonando botones
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    const newExportBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);
    const newAddPdaBtn = addPdaBtn.cloneNode(true);
    addPdaBtn.parentNode.replaceChild(newAddPdaBtn, addPdaBtn);

    newSaveBtn.addEventListener('click', () => savePdaPlannerChanges(planeacionId, totalSessions));
    newExportBtn.addEventListener('click', () => ExcelExport.exportarCronograma(planeacion.cycle_id, planeacionId));
    newBackBtn.addEventListener('click', () => {
        activePlaneacionId = null;
        document.getElementById('dosificar-planner').style.display = 'none';
        document.getElementById('dosificar-setup').style.display = 'block';
        document.body.classList.add('bg-grid-pattern');
        loadCyclesDropdowns();
    });
    newAddPdaBtn.addEventListener('click', () => addNewPdaRow(planeacionId));
}

function renderPdaRows(pdas, totalSessions) {
    const tbody = document.getElementById('planner-tbody');
    tbody.innerHTML = '';

    pdas.forEach((pda, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-pda-number', pda.pda_number);
        tr.innerHTML = `
            <td style="text-align: center; font-weight: 800;">${pda.pda_number}</td>
            <td>
                <input type="text" class="form-control pda-verb" value="${htmlspecialchars(pda.verbo_rector)}" placeholder="Verbo" style="padding: 8px 12px; font-weight: 600;">
            </td>
            <td>
                <textarea class="form-control pda-topic" placeholder="Proceso de Desarrollo de Aprendizaje (PDA)" rows="2" style="padding: 8px 12px; resize: vertical;">${htmlspecialchars(pda.topic)}</textarea>
            </td>
            <td>
                <input type="number" class="form-control pda-sessions" value="${pda.sessions_count}" min="0" max="${totalSessions}" style="padding: 8px 12px; text-align: center; font-weight: 700;">
            </td>
            <td style="text-align: center;">
                <button class="btn btn-danger btn-sm pda-delete-btn">🗑️</button>
            </td>
        `;

        // Extraer automáticamente el verbo rector al editar el PDA
        const topicTextarea = tr.querySelector('.pda-topic');
        const verbInput = tr.querySelector('.pda-verb');
        topicTextarea.addEventListener('input', () => {
            verbInput.value = getRectorVerb(topicTextarea.value);
        });

        // Eliminar fila
        tr.querySelector('.pda-delete-btn').addEventListener('click', () => {
            if (confirm(`¿Eliminar la fila del PDA ${pda.pda_number}?`)) {
                tr.remove();
                reindexPdaNumbers();
                updateSessionsBalance(totalSessions);
            }
        });

        // Al cambiar sesiones, actualizar balance
        tr.querySelector('.pda-sessions').addEventListener('input', () => updateSessionsBalance(totalSessions));

        tbody.appendChild(tr);
    });

    updateSessionsBalance(totalSessions);
}

function reindexPdaNumbers() {
    const rows = document.querySelectorAll('#planner-tbody tr');
    rows.forEach((row, index) => {
        const newNum = index + 1;
        row.setAttribute('data-pda-number', newNum);
        row.firstElementChild.innerText = newNum;
    });
}

function updateSessionsBalance(totalSessions) {
    const sessionInputs = document.querySelectorAll('#planner-tbody .pda-sessions');
    let sum = 0;
    sessionInputs.forEach(input => {
        sum += parseInt(input.value) || 0;
    });

    const balancePill = document.getElementById('summary-balance-pill');
    const balanceMsg = document.getElementById('planner-balance-msg');
    const assignedText = document.getElementById('summary-assigned-sessions');

    assignedText.innerText = `${sum} / ${totalSessions}`;

    if (sum === totalSessions) {
        balancePill.className = "summary-pill success";
        balancePill.innerHTML = `⚖️ Balanceado: <strong>${sum} / ${totalSessions}</strong>`;
        balanceMsg.innerHTML = `<span style="color: var(--color-success)">✓ Distribución perfecta. Coincide exactamente con las horas del ciclo.</span>`;
    } else if (sum < totalSessions) {
        const diff = totalSessions - sum;
        balancePill.className = "summary-pill warning";
        balancePill.innerHTML = `⚖️ Faltan: <strong>${diff} hs</strong>`;
        balanceMsg.innerHTML = `<span style="color: var(--color-warning)">⚠ Faltan asignar ${diff} sesiones para cubrir el ciclo.</span>`;
    } else {
        const diff = sum - totalSessions;
        balancePill.className = "summary-pill error";
        balancePill.innerHTML = `⚖️ Exceso: <strong>+${diff} hs</strong>`;
        balanceMsg.innerHTML = `<span style="color: var(--color-danger)">❌ Exceso de ${diff} sesiones asignadas. Reduce la cantidad de clases de los PDAs.</span>`;
    }
}

function addNewPdaRow(planeacionId) {
    const tbody = document.getElementById('planner-tbody');
    const nextNum = tbody.children.length + 1;
    const totalSessions = parseInt(document.getElementById('summary-total-sessions').innerText) || 190;

    const tr = document.createElement('tr');
    tr.setAttribute('data-pda-number', nextNum);
    tr.innerHTML = `
        <td style="text-align: center; font-weight: 800;">${nextNum}</td>
        <td>
            <input type="text" class="form-control pda-verb" value="" placeholder="Verbo" style="padding: 8px 12px; font-weight: 600;">
        </td>
        <td>
            <textarea class="form-control pda-topic" placeholder="Proceso de Desarrollo de Aprendizaje (PDA)" rows="2" style="padding: 8px 12px; resize: vertical;"></textarea>
        </td>
        <td>
            <input type="number" class="form-control pda-sessions" value="0" min="0" max="${totalSessions}" style="padding: 8px 12px; text-align: center; font-weight: 700;">
        </td>
        <td style="text-align: center;">
            <button class="btn btn-danger btn-sm pda-delete-btn">🗑️</button>
        </td>
    `;

    const topicTextarea = tr.querySelector('.pda-topic');
    const verbInput = tr.querySelector('.pda-verb');
    topicTextarea.addEventListener('input', () => {
        verbInput.value = getRectorVerb(topicTextarea.value);
    });

    tr.querySelector('.pda-delete-btn').addEventListener('click', () => {
        tr.remove();
        reindexPdaNumbers();
        updateSessionsBalance(totalSessions);
    });

    tr.querySelector('.pda-sessions').addEventListener('input', () => updateSessionsBalance(totalSessions));

    tbody.appendChild(tr);
    reindexPdaNumbers();
    updateSessionsBalance(totalSessions);
}

async function savePdaPlannerChanges(planeacionId, totalSessions) {
    const rows = document.querySelectorAll('#planner-tbody tr');
    if (!rows.length) {
        showToast('No hay filas de PDAs para guardar.', 'error');
        return;
    }

    try {
        // Iniciar transacción en sql.js borrando los PDAs antiguos
        await dbRun("DELETE FROM planeacion_pdas WHERE planeacion_id = ?", [planeacionId]);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const pdaNum = i + 1;
            const verb = row.querySelector('.pda-verb').value.trim();
            const topic = row.querySelector('.pda-topic').value.trim();
            const sCount = parseInt(row.querySelector('.pda-sessions').value) || 0;

            if (!topic) {
                throw new Error(`El texto del PDA ${pdaNum} no puede estar vacío.`);
            }

            await dbRun(
                `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count) VALUES(?,?,?,?,?)`,
                [planeacionId, pdaNum, topic, verb, sCount]
            );
        }

        // Actualizar total_pdas en la tabla principal
        await dbRun("UPDATE planeaciones SET total_pdas = ? WHERE id = ?", [rows.length, planeacionId]);

        showToast('Cambios de dosificación guardados.', 'success');
        
        // Recargar datos
        loadPlanification(planeacionId);

    } catch (e) {
        console.error(e);
        showToast('Error al guardar: ' + e.message, 'error');
    }
}

/* =========================================================
   MIS PLANEACIONES (CRUD)
   ========================================================= */
function initPlanCRUD() {
    const editForm = document.getElementById('edit-plan-form');
    
    // Configurar validación de horario en el modal de edición
    const weeklyInput = document.getElementById('edit-plan-weekly-hours');
    const dayInputs = document.querySelectorAll('#edit-plan-form .day-input');
    const errorMsg = document.getElementById('edit-plan-schedule-error');
    const submitBtn = document.getElementById('edit-plan-submit-btn');

    function validateHours() {
        let sum = 0;
        dayInputs.forEach(input => {
            sum += parseInt(input.value) || 0;
        });
        const weekly = parseInt(weeklyInput.value) || 0;
        
        if (sum !== weekly) {
            errorMsg.style.display = 'block';
            errorMsg.textContent = `⚠️ La suma de las horas del horario semanal (${sum} hs) debe coincidir con las horas semanales (${weekly} hs).`;
            submitBtn.disabled = true;
        } else {
            errorMsg.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    if (weeklyInput && dayInputs.length) {
        dayInputs.forEach(input => input.addEventListener('input', validateHours));
        weeklyInput.addEventListener('input', validateHours);
    }

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const planId = parseInt(document.getElementById('edit-plan-id').value);
        const cycleId = parseInt(document.getElementById('edit-plan-cycle').value);
        const disciplina = document.getElementById('edit-plan-discipline').value.trim();
        const grado = parseInt(document.getElementById('edit-plan-grade').value);
        const weeklyHours = parseInt(weeklyInput.value);

        const schedule = {};
        for (let d = 1; d <= 5; d++) {
            schedule[d] = parseInt(document.getElementById(`edit-plan-day-${d}`).value) || 0;
        }

        try {
            await dbRun(
                `UPDATE planeaciones SET cycle_id = ?, disciplina = ?, grado = ?, weekly_hours = ?, schedule = ? WHERE id = ?`,
                [cycleId, disciplina, grado, weeklyHours, JSON.stringify(schedule), planId]
            );

            showToast('Parámetros de la planeación actualizados.', 'success');
            closeEditPlanModal();
            renderPlaneacionesList();
        } catch (err) {
            showToast('Error al actualizar: ' + err.message, 'error');
        }
    });
}

function renderPlaneacionesList() {
    const tbody = document.getElementById('planeaciones-tbody');
    tbody.innerHTML = '';

    const list = dbQuery(`
        SELECT p.*, c.name as cycle_name 
        FROM planeaciones p 
        JOIN school_cycles c ON p.cycle_id = c.id
        ORDER BY p.id DESC
    `);

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No hay planeaciones guardadas.</td></tr>`;
        return;
    }

    list.forEach(p => {
        const sched = JSON.parse(p.schedule || '{}');
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
        const schedParts = [];
        for (let d = 1; d <= 5; d++) {
            if (sched[d] > 0) schedParts.push(`${days[d-1]}: ${sched[d]}h`);
        }
        const schedStr = schedParts.join(', ') || 'Sin horario';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${htmlspecialchars(p.disciplina)}</strong></td>
            <td>${p.grado}º Grado</td>
            <td><span class="badge badge-primary">${htmlspecialchars(p.cycle_name)}</span></td>
            <td><span class="badge badge-warning">${schedStr}</span></td>
            <td><span class="badge badge-success">${p.total_pdas} PDAs</span></td>
            <td style="text-align: right;">
                <div style="display:inline-flex; gap:6px;">
                    <button class="btn btn-primary btn-sm btn-open-planner">⚡ Planear</button>
                    <button class="btn btn-secondary btn-sm btn-edit-params">✏️</button>
                    <button class="btn btn-danger btn-sm btn-delete-plan">🗑️</button>
                </div>
            </td>
        `;

        tr.querySelector('.btn-open-planner').addEventListener('click', () => {
            // Ir a la pestaña Dosificar
            const tabBtn = document.querySelector('.nav-tab-btn[data-target="tab-dosificar"]');
            tabBtn.click();
            loadPlanification(p.id);
        });

        tr.querySelector('.btn-edit-params').addEventListener('click', () => {
            openEditPlanModal(p);
        });

        tr.querySelector('.btn-delete-plan').addEventListener('click', async () => {
            if (confirm(`¿Seguro que deseas eliminar la planeación de ${p.disciplina} (${p.grado}º)?`)) {
                try {
                    await dbRun("DELETE FROM planeaciones WHERE id = ?", [p.id]);
                    showToast('Planeación eliminada.', 'success');
                    renderPlaneacionesList();
                } catch (err) {
                    showToast('Error al eliminar: ' + err.message, 'error');
                }
            }
        });

        tbody.appendChild(tr);
    });
}

function openEditPlanModal(plan) {
    document.getElementById('edit-plan-id').value = plan.id;
    document.getElementById('edit-plan-discipline').value = plan.disciplina;
    document.getElementById('edit-plan-grade').value = plan.grado;
    document.getElementById('edit-plan-weekly-hours').value = plan.weekly_hours;

    // Rellenar ciclos
    const select = document.getElementById('edit-plan-cycle');
    select.innerHTML = '';
    const list = dbQuery("SELECT * FROM school_cycles ORDER BY start_date DESC");
    list.forEach(c => {
        select.appendChild(Object.assign(document.createElement('option'), { value: c.id, text: c.name }));
    });
    select.value = plan.cycle_id;

    // Rellenar horario
    const sched = JSON.parse(plan.schedule || '{}');
    for (let d = 1; d <= 5; d++) {
        document.getElementById(`edit-plan-day-${d}`).value = sched[d] ?? 0;
    }

    // Activar validación manual de horas
    const weeklyInput = document.getElementById('edit-plan-weekly-hours');
    const dayInputs = document.querySelectorAll('#edit-plan-form .day-input');
    const errorMsg = document.getElementById('edit-plan-schedule-error');
    const submitBtn = document.getElementById('edit-plan-submit-btn');

    let sum = 0;
    dayInputs.forEach(input => { sum += parseInt(input.value) || 0; });
    const weekly = parseInt(weeklyInput.value) || 0;
    if (sum !== weekly) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = `⚠️ La suma de las horas del horario semanal (${sum} hs) debe coincidir con las horas semanales (${weekly} hs).`;
        submitBtn.disabled = true;
    } else {
        errorMsg.style.display = 'none';
        submitBtn.disabled = false;
    }

    document.getElementById('edit-plan-modal').style.display = 'flex';
}

function closeEditPlanModal() {
    document.getElementById('edit-plan-modal').style.display = 'none';
}

/* =========================================================
   CICLOS ESCOLARES (CRUD)
   ========================================================= */
let activeCycleIdForHolidays = null;

function initCycleForm() {
    const form = document.getElementById('cycle-crud-form');
    const totalInput = document.getElementById('cycle-total-days');
    const p1 = document.getElementById('cycle-p1-days');
    const p2 = document.getElementById('cycle-p2-days');
    const p3 = document.getElementById('cycle-p3-days');

    function validateSum() {
        const sum = (parseInt(p1.value) || 0) + (parseInt(p2.value) || 0) + (parseInt(p3.value) || 0);
        const total = parseInt(totalInput.value) || 0;
        
        if (sum !== total) {
            p1.style.borderColor = 'var(--color-danger)';
            p2.style.borderColor = 'var(--color-danger)';
            p3.style.borderColor = 'var(--color-danger)';
        } else {
            p1.style.borderColor = 'var(--border-color)';
            p2.style.borderColor = 'var(--border-color)';
            p3.style.borderColor = 'var(--border-color)';
        }
    }

    [p1, p2, p3, totalInput].forEach(el => el.addEventListener('input', validateSum));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('cycle-id').value;
        const name = document.getElementById('cycle-name').value.trim();
        const start = document.getElementById('cycle-start-date').value;
        const end = document.getElementById('cycle-end-date').value;
        const total = parseInt(totalInput.value);
        const p1Val = parseInt(p1.value);
        const p2Val = parseInt(p2.value);
        const p3Val = parseInt(p3.value);

        if ((p1Val + p2Val + p3Val) !== total) {
            showToast('La suma de los periodos debe ser exactamente igual a los días totales del ciclo.', 'error');
            return;
        }

        try {
            if (id) {
                // Actualizar
                await dbRun(
                    `UPDATE school_cycles SET name = ?, start_date = ?, end_date = ?, total_days = ?, period1_days = ?, period2_days = ?, period3_days = ? WHERE id = ?`,
                    [name, start, end, total, p1Val, p2Val, p3Val, id]
                );
                showToast('Ciclo escolar actualizado.', 'success');
            } else {
                // Crear
                const newId = await dbRun(
                    `INSERT INTO school_cycles(name, start_date, end_date, total_days, period1_days, period2_days, period3_days, holidays) VALUES(?,?,?,?,?,?,?,?)`,
                    [name, start, end, total, p1Val, p2Val, p3Val, JSON.stringify({})]
                );
                showToast('Ciclo escolar creado.', 'success');
                // Habilitar panel de festivos para el nuevo ciclo
                loadCycleHolidaysPanel(newId);
            }

            // Reset form
            form.reset();
            document.getElementById('cycle-id').value = '';
            document.getElementById('cycle-form-title').innerText = 'Agregar Ciclo Escolar';
            document.getElementById('btn-cancel-cycle-edit').style.display = 'none';

            renderCyclesList();
            loadCyclesDropdowns();
        } catch (err) {
            showToast('Error al guardar ciclo: ' + err.message, 'error');
        }
    });

    document.getElementById('btn-cancel-cycle-edit').addEventListener('click', () => {
        form.reset();
        document.getElementById('cycle-id').value = '';
        document.getElementById('cycle-form-title').innerText = 'Agregar Ciclo Escolar';
        document.getElementById('btn-cancel-cycle-edit').style.display = 'none';
        document.getElementById('cycle-holidays-card').style.display = 'none';
        activeCycleIdForHolidays = null;
    });

    // Lógica para añadir festivo
    document.getElementById('holiday-add-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeCycleIdForHolidays) return;

        const date = document.getElementById('holiday-date').value;
        const label = document.getElementById('holiday-label').value.trim();

        try {
            const cycles = dbQuery("SELECT holidays FROM school_cycles WHERE id = ?", [activeCycleIdForHolidays]);
            if (cycles.length) {
                const holidays = JSON.parse(cycles[0].holidays || '{}');
                holidays[date] = label;

                await dbRun("UPDATE school_cycles SET holidays = ? WHERE id = ?", [JSON.stringify(holidays), activeCycleIdForHolidays]);
                showToast('Día festivo añadido.', 'success');
                document.getElementById('holiday-add-form').reset();
                renderHolidaysList(holidays);
            }
        } catch (err) {
            showToast('Error al añadir festivo: ' + err.message, 'error');
        }
    });

    // Cargar festivos oficiales MX
    document.getElementById('btn-load-mx-holidays').addEventListener('click', async () => {
        if (!activeCycleIdForHolidays) return;

        try {
            const cycles = dbQuery("SELECT start_date, holidays FROM school_cycles WHERE id = ?", [activeCycleIdForHolidays]);
            if (cycles.length) {
                const cycle = cycles[0];
                const yearStart = new Date(cycle.start_date + 'T00:00:00').getFullYear();
                const yearEnd = yearStart + 1;

                const mxDefaults = {
                    [`${yearStart}-09-16`]: "Día de la Independencia",
                    [`${yearStart}-11-02`]: "Día de Muertos",
                    [`${yearStart}-11-16`]: "Revolución Mexicana",
                    // Vacaciones de invierno
                    [`${yearStart}-12-21`]: "Vacaciones de Invierno",
                    [`${yearStart}-12-22`]: "Vacaciones de Invierno",
                    [`${yearStart}-12-23`]: "Vacaciones de Invierno",
                    [`${yearStart}-12-24`]: "Vacaciones de Invierno",
                    [`${yearStart}-12-25`]: "Navidad",
                    [`${yearStart}-12-28`]: "Vacaciones de Invierno",
                    [`${yearStart}-12-29`]: "Vacaciones de Invierno",
                    [`${yearStart}-12-30`]: "Vacaciones de Invierno",
                    [`${yearStart}-12-31`]: "Fin de Año",
                    [`${yearEnd}-01-01`]: "Año Nuevo",
                    [`${yearEnd}-01-04`]: "Vacaciones de Invierno",
                    [`${yearEnd}-01-05`]: "Vacaciones de Invierno",
                    [`${yearEnd}-01-06`]: "Día de Reyes",
                    [`${yearEnd}-01-07`]: "Vacaciones de Invierno",
                    [`${yearEnd}-01-08`]: "Vacaciones de Invierno",
                    [`${yearEnd}-02-01`]: "Día de la Constitución",
                    [`${yearEnd}-03-15`]: "Natalicio de Benito Juárez",
                    // Semana Santa
                    [`${yearEnd}-03-22`]: "Semana Santa",
                    [`${yearEnd}-03-23`]: "Semana Santa",
                    [`${yearEnd}-03-24`]: "Semana Santa",
                    [`${yearEnd}-03-25`]: "Semana Santa",
                    [`${yearEnd}-03-26`]: "Semana Santa",
                    [`${yearEnd}-03-29`]: "Semana Santa",
                    [`${yearEnd}-03-30`]: "Semana Santa",
                    [`${yearEnd}-03-31`]: "Semana Santa",
                    [`${yearEnd}-04-01`]: "Semana Santa",
                    [`${yearEnd}-04-02`]: "Semana Santa",
                    [`${yearEnd}-05-01`]: "Día del Trabajo",
                    [`${yearEnd}-05-05`]: "Batalla de Puebla",
                    [`${yearEnd}-05-15`]: "Día del Maestro"
                };

                const currentHols = JSON.parse(cycle.holidays || '{}');
                const mergedHols = Object.assign({}, mxDefaults, currentHols);

                await dbRun("UPDATE school_cycles SET holidays = ? WHERE id = ?", [JSON.stringify(mergedHols), activeCycleIdForHolidays]);
                showToast('Festivos oficiales de México cargados.', 'success');
                renderHolidaysList(mergedHols);
            }
        } catch (err) {
            showToast('Error al cargar festivos: ' + err.message, 'error');
        }
    });
}

function renderCyclesList() {
    const tbody = document.getElementById('cycles-tbody');
    tbody.innerHTML = '';

    const list = dbQuery("SELECT * FROM school_cycles ORDER BY start_date DESC");
    list.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${htmlspecialchars(c.name)}</strong></td>
            <td>${c.start_date}</td>
            <td><span class="badge badge-primary">${c.total_days} días</span></td>
            <td style="text-align: right;">
                <div style="display:inline-flex; gap:4px;">
                    <button class="btn btn-secondary btn-sm btn-edit-cycle">✏️</button>
                    <button class="btn btn-danger btn-sm btn-delete-cycle">🗑️</button>
                </div>
            </td>
        `;

        tr.querySelector('.btn-edit-cycle').addEventListener('click', () => {
            document.getElementById('cycle-id').value = c.id;
            document.getElementById('cycle-name').value = c.name;
            document.getElementById('cycle-start-date').value = c.start_date;
            document.getElementById('cycle-end-date').value = c.end_date;
            document.getElementById('cycle-total-days').value = c.total_days;
            document.getElementById('cycle-p1-days').value = c.period1_days;
            document.getElementById('cycle-p2-days').value = c.period2_days;
            document.getElementById('cycle-p3-days').value = c.period3_days;

            document.getElementById('cycle-form-title').innerText = 'Editar Ciclo Escolar';
            document.getElementById('btn-cancel-cycle-edit').style.display = 'inline-flex';

            loadCycleHolidaysPanel(c.id);
        });

        tr.querySelector('.btn-delete-cycle').addEventListener('click', async () => {
            if (confirm(`¿Seguro que deseas eliminar el ciclo ${c.name}? Se borrarán también todas las planeaciones y PDAs asociados.`)) {
                try {
                    await dbRun("DELETE FROM school_cycles WHERE id = ?", [c.id]);
                    showToast('Ciclo escolar eliminado.', 'success');
                    renderCyclesList();
                    loadCyclesDropdowns();
                    if (activeCycleIdForHolidays === c.id) {
                        document.getElementById('cycle-holidays-card').style.display = 'none';
                        activeCycleIdForHolidays = null;
                    }
                } catch (err) {
                    showToast('Error al eliminar: ' + err.message, 'error');
                }
            }
        });

        tbody.appendChild(tr);
    });
}

function loadCycleHolidaysPanel(cycleId) {
    activeCycleIdForHolidays = cycleId;
    document.getElementById('cycle-holidays-card').style.display = 'block';

    const cycles = dbQuery("SELECT holidays FROM school_cycles WHERE id = ?", [cycleId]);
    if (cycles.length) {
        renderHolidaysList(JSON.parse(cycles[0].holidays || '{}'));
    }
}

function renderHolidaysList(holidays) {
    const list = document.getElementById('cycle-holidays-list');
    list.innerHTML = '';

    const dates = Object.keys(holidays).sort();
    if (!dates.length) {
        list.innerHTML = `<div class="empty-state" style="padding:10px 0; font-size:12px;">No hay días festivos registrados.</div>`;
        return;
    }

    dates.forEach(d => {
        const chip = document.createElement('div');
        chip.className = 'holiday-chip';
        chip.style.marginBottom = '6px';
        chip.innerHTML = `
            <span><strong>${d}</strong> — ${htmlspecialchars(holidays[d])}</span>
            <button class="holiday-remove" data-date="${d}">✕</button>
        `;

        chip.querySelector('.holiday-remove').addEventListener('click', async () => {
            try {
                const cycles = dbQuery("SELECT holidays FROM school_cycles WHERE id = ?", [activeCycleIdForHolidays]);
                if (cycles.length) {
                    const hols = JSON.parse(cycles[0].holidays || '{}');
                    delete hols[d];
                    await dbRun("UPDATE school_cycles SET holidays = ? WHERE id = ?", [JSON.stringify(hols), activeCycleIdForHolidays]);
                    showToast('Día festivo eliminado.', 'success');
                    renderHolidaysList(hols);
                }
            } catch (err) {
                showToast('Error al eliminar festivo: ' + err.message, 'error');
            }
        });

        list.appendChild(chip);
    });
}

function loadCyclesDropdowns() {
    const list = dbQuery("SELECT * FROM school_cycles ORDER BY start_date DESC");
    
    // Select del Setup
    const setupSelect = document.getElementById('setup-cycle');
    setupSelect.innerHTML = '<option value="">Seleccionar ciclo...</option>';
    list.forEach(c => {
        setupSelect.appendChild(Object.assign(document.createElement('option'), { value: c.id, text: c.name }));
    });
}

/* =========================================================
   COPIA DE SEGURIDAD Y CONFIGURACION (PANEL)
   ========================================================= */
function initBackupPanel() {
    const fileInput = document.getElementById('import-db-file');
    const triggerBtn = document.getElementById('btn-trigger-import');
    const restoreBtn = document.getElementById('btn-import-db');
    const fileNameSpan = document.getElementById('import-file-name');

    document.getElementById('btn-export-db').addEventListener('click', exportDatabase);

    triggerBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            fileNameSpan.innerText = file.name;
            restoreBtn.disabled = false;
        } else {
            fileNameSpan.innerText = 'Ningún archivo seleccionado';
            restoreBtn.disabled = true;
        }
    });

    restoreBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        if (confirm('¿Restaurar base de datos? Esto sobreescribirá toda tu información actual.')) {
            try {
                await importDatabase(file);
                showToast('Base de datos restaurada correctamente.', 'success');
                
                // Limpiar inputs
                fileInput.value = '';
                fileNameSpan.innerText = 'Ningún archivo seleccionado';
                restoreBtn.disabled = true;

                // Refrescar vistas
                loadCyclesDropdowns();
                renderCyclesList();
                renderPlaneacionesList();

                // Regresar a la pestaña dosificar
                document.querySelector('.nav-tab-btn[data-target="tab-dosificar"]').click();
                if (activePlaneacionId) {
                    loadPlanification(activePlaneacionId);
                }

            } catch (err) {
                showToast('Error al importar base de datos: ' + err.message, 'error');
            }
        }
    });

    document.getElementById('btn-reset-db').addEventListener('click', async () => {
        if (confirm('¿Seguro que deseas restablecer la base de datos por defecto? Se perderán todas tus planeaciones y ciclos personalizados.')) {
            try {
                await resetDatabase();
                showToast('Base de datos restablecida por defecto.', 'success');
                
                // Refrescar
                loadCyclesDropdowns();
                renderCyclesList();
                renderPlaneacionesList();
                
                // Regresar a la pestaña de dosificar en blanco
                activePlaneacionId = null;
                document.getElementById('dosificar-planner').style.display = 'none';
                document.getElementById('dosificar-setup').style.display = 'block';
                document.body.classList.add('bg-grid-pattern');

            } catch (err) {
                showToast('Error al restablecer: ' + err.message, 'error');
            }
        }
    });
}

/* =========================================================
   HELPERS & UTILERIAS GENERALES
   ========================================================= */
function htmlspecialchars(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Re-declaración de funciones de fechas para el ámbito del app.js
function calculateSchoolDays(startDate, totalDays, holidays) {
    const days = [];
    let current = new Date(startDate + 'T00:00:00');
    let count = 0;
    let limit = 0;

    while (count < totalDays && limit < 1000) {
        limit++;
        const w = current.getDay();
        const dateStr = current.toISOString().split('T')[0];

        if (w !== 0 && w !== 6 && !holidays[dateStr]) {
            days.push(dateStr);
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return days;
}

function mapSessions(schoolDays, schedule, p1Days, p2Days) {
    const sessions = [];
    const p1Limit = p1Days;
    const p2Limit = p1Days + p2Days;

    schoolDays.forEach((dateStr, idx) => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = date.getDay();
        
        const hours = schedule[dayOfWeek] || 0;
        if (hours > 0) {
            let period = 1;
            if (idx >= p2Limit) period = 3;
            else if (idx >= p1Limit) period = 2;

            for (let h = 0; h < hours; h++) {
                sessions.push({ date: dateStr, period });
            }
        }
    });
    return sessions;
}
