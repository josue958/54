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
            } else if (target === 'tab-cronogramas') {
                renderCronogramasDashboard();
            }

            tabBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.style.display = 'none');

            btn.classList.add('active');
            const targetSection = document.getElementById(target);
            if (target === 'tab-dosificar' && activePlaneacionId) {
                targetSection.style.display = 'flex';
            } else {
                targetSection.style.display = 'block';
            }

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

    window.addEventListener('resize', () => {
        if (activePlaneacionId) fitCompactColumns();
    });
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
                    const isObj = (typeof text === 'object' && text !== null);
                    const pdaTopic = isObj ? text.topic : text;
                    const pdaNum = isObj ? (text.pda_number || (i + 1)) : (i + 1);
                    const verb = isObj ? (text.verbo_rector || getRectorVerb(pdaTopic)) : getRectorVerb(pdaTopic);
                    const sCount = isObj ? (text.sessions_count || (baseSessions + (pdaNum <= remainder ? 1 : 0))) : (baseSessions + (pdaNum <= remainder ? 1 : 0));
                    const pdaContenido = isObj ? (text.contenido || '') : '';
                    const pdaTemas = isObj ? (text.temas || '') : '';
                    const pdaComplejidad = isObj ? (text.complejidad || 'Media') : 'Media';
                    const pdaRango = isObj ? (text.rango_sugerido || '') : '';

                    await dbRun(
                        `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count, contenido, temas, complejidad, rango_sugerido) VALUES(?,?,?,?,?,?,?,?,?)`,
                        [pid, pdaNum, pdaTopic, verb, sCount, pdaContenido, pdaTemas, pdaComplejidad, pdaRango]
                    );
                }
            } else {
                // PDA en blanco por si no hay biblioteca
                await dbRun(
                    `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count, contenido, temas, complejidad, rango_sugerido) VALUES(?,?,?,?,?,?,?,?,?)`,
                    [pid, 1, 'Proceso de Desarrollo de Aprendizaje (PDA) 1', 'Desarrolla', totalSessions, '', '', 'Media', '']
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
    setPlannerLayoutActive(true);

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
        setPlannerLayoutActive(false);
        document.getElementById('dosificar-setup').style.display = 'block';
        document.body.classList.add('bg-grid-pattern');
        loadCyclesDropdowns();
    });
    newAddPdaBtn.addEventListener('click', () => addNewPdaRow(planeacionId));
}

function setPlannerLayoutActive(active) {
    document.getElementById('tab-dosificar').classList.toggle('planner-active', active);
    document.querySelector('.main-container').classList.toggle('planner-active', active);
    document.body.classList.toggle('planner-active', active);

    const planner = document.getElementById('dosificar-planner');
    if (planner) planner.style.display = active ? 'flex' : 'none';

    if (active) requestAnimationFrame(fitCompactColumns);
}

const _measureCanvas = document.createElement('canvas');
const _measureCtx = _measureCanvas.getContext('2d');

function measureTextPx(text, referenceEl) {
    const style = window.getComputedStyle(referenceEl);
    _measureCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return _measureCtx.measureText(text || '').width;
}

function fitCompactColumns() {
    const table = document.getElementById('planner-table');
    if (!table) return;

    const setColWidth = (colClass, inputSelector, headerText, minPx = 56) => {
        const col = table.querySelector(`col.${colClass}`);
        const th = table.querySelector(`th.${colClass}`);
        if (!col || !th) return;

        let maxW = measureTextPx(headerText, th) + 28;

        if (inputSelector) {
            table.querySelectorAll(inputSelector).forEach(input => {
                const text = input.value || input.placeholder || '';
                maxW = Math.max(maxW, measureTextPx(text, input) + 28);
            });
        }

        const width = Math.ceil(Math.max(maxW, minPx));
        col.style.width = `${width}px`;
        th.style.width = `${width}px`;
    };

    setColWidth('col-no', null, 'No.', 44);
    setColWidth('col-sesiones', '.pda-sessions', 'Sesiones', 76);
    setColWidth('col-verbo-rector', '.pda-verb', 'Verbo Rector', 96);
    setColWidth('col-complejidad', '.pda-complejidad', 'Complejidad', 96);
    setColWidth('col-accion', null, 'Acción', 72);
}

function bindCompactColumnInput(input) {
    input.addEventListener('input', () => fitCompactColumns());
}

function renderPdaRows(pdas, totalSessions) {
    const tbody = document.getElementById('planner-tbody');
    tbody.innerHTML = '';

    pdas.forEach((pda, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-pda-number', pda.pda_number);
        tr.innerHTML = `
            <td class="col-contenido">
                <textarea class="form-control pda-field pda-contenido" placeholder="Contenido" rows="2">${htmlspecialchars(pda.contenido || '')}</textarea>
            </td>
            <td class="col-no">${pda.pda_number}</td>
            <td class="col-pda">
                <textarea class="form-control pda-field pda-topic" placeholder="Proceso de Desarrollo de Aprendizaje (PDA)" rows="2">${htmlspecialchars(pda.topic)}</textarea>
            </td>
            <td class="col-temas">
                <textarea class="form-control pda-field pda-temas" placeholder="Temas a Atender" rows="2">${htmlspecialchars(pda.temas || '')}</textarea>
            </td>
            <td class="col-sesiones">
                <input type="number" class="form-control pda-field pda-sessions" value="${pda.sessions_count}" min="0" max="${totalSessions}">
            </td>
            <td class="col-verbo-rector">
                <input type="text" class="form-control pda-field pda-verb" value="${htmlspecialchars(pda.verbo_rector)}" placeholder="Verbo">
            </td>
            <td class="col-complejidad">
                <input type="text" class="form-control pda-field pda-complejidad" value="${htmlspecialchars(pda.complejidad || '')}" placeholder="Complejidad">
            </td>
            <td class="col-rango">
                <input type="text" class="form-control pda-field pda-rango" value="${htmlspecialchars(pda.rango_sugerido || '')}" placeholder="Ej. 8 a 10 sesiones">
            </td>
            <td class="col-accion">
                <button class="btn btn-danger btn-sm pda-delete-btn" style="padding: 4px 8px;">🗑️</button>
            </td>
        `;

        // Extraer automáticamente el verbo rector al editar el PDA
        const topicTextarea = tr.querySelector('.pda-topic');
        const verbInput = tr.querySelector('.pda-verb');
        topicTextarea.addEventListener('input', () => {
            verbInput.value = getRectorVerb(topicTextarea.value);
            fitCompactColumns();
        });

        bindCompactColumnInput(verbInput);
        bindCompactColumnInput(tr.querySelector('.pda-complejidad'));

        // Eliminar fila
        tr.querySelector('.pda-delete-btn').addEventListener('click', () => {
            if (confirm(`¿Eliminar la fila del PDA ${pda.pda_number}?`)) {
                tr.remove();
                reindexPdaNumbers();
                fitCompactColumns();
                updateSessionsBalance(totalSessions);
            }
        });

        // Al cambiar sesiones, actualizar balance
        tr.querySelector('.pda-sessions').addEventListener('input', () => updateSessionsBalance(totalSessions));

        tbody.appendChild(tr);
    });

    fitCompactColumns();
    updateSessionsBalance(totalSessions);
}

function reindexPdaNumbers() {
    const rows = document.querySelectorAll('#planner-tbody tr');
    rows.forEach((row, index) => {
        const newNum = index + 1;
        row.setAttribute('data-pda-number', newNum);
        row.children[1].innerText = newNum;
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
        <td class="col-contenido">
            <textarea class="form-control pda-field pda-contenido" placeholder="Contenido" rows="2"></textarea>
        </td>
        <td class="col-no">${nextNum}</td>
        <td class="col-pda">
            <textarea class="form-control pda-field pda-topic" placeholder="Proceso de Desarrollo de Aprendizaje (PDA)" rows="2"></textarea>
        </td>
        <td class="col-temas">
            <textarea class="form-control pda-field pda-temas" placeholder="Temas a Atender" rows="2"></textarea>
        </td>
        <td class="col-sesiones">
            <input type="number" class="form-control pda-field pda-sessions" value="0" min="0" max="${totalSessions}">
        </td>
        <td class="col-verbo-rector">
            <input type="text" class="form-control pda-field pda-verb" value="" placeholder="Verbo">
        </td>
        <td class="col-complejidad">
            <input type="text" class="form-control pda-field pda-complejidad" value="" placeholder="Complejidad">
        </td>
        <td class="col-rango">
            <input type="text" class="form-control pda-field pda-rango" value="" placeholder="Ej. 8 a 10 sesiones">
        </td>
        <td class="col-accion">
            <button class="btn btn-danger btn-sm pda-delete-btn" style="padding: 4px 8px;">🗑️</button>
        </td>
    `;

    const topicTextarea = tr.querySelector('.pda-topic');
    const verbInput = tr.querySelector('.pda-verb');
    topicTextarea.addEventListener('input', () => {
        verbInput.value = getRectorVerb(topicTextarea.value);
        fitCompactColumns();
    });

    bindCompactColumnInput(verbInput);
    bindCompactColumnInput(tr.querySelector('.pda-complejidad'));

    tr.querySelector('.pda-delete-btn').addEventListener('click', () => {
        tr.remove();
        reindexPdaNumbers();
        fitCompactColumns();
        updateSessionsBalance(totalSessions);
    });

    tr.querySelector('.pda-sessions').addEventListener('input', () => updateSessionsBalance(totalSessions));

    tbody.appendChild(tr);
    reindexPdaNumbers();
    fitCompactColumns();
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
            const contenido = row.querySelector('.pda-contenido').value.trim();
            const topic = row.querySelector('.pda-topic').value.trim();
            const temas = row.querySelector('.pda-temas').value.trim();
            const sCount = parseInt(row.querySelector('.pda-sessions').value) || 0;
            const verb = row.querySelector('.pda-verb').value.trim();
            const complejidad = row.querySelector('.pda-complejidad').value;
            const rango = row.querySelector('.pda-rango').value.trim();

            if (!topic) {
                throw new Error(`El texto del PDA ${pdaNum} no puede estar vacío.`);
            }

            await dbRun(
                `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count, contenido, temas, complejidad, rango_sugerido) VALUES(?,?,?,?,?,?,?,?,?)`,
                [planeacionId, pdaNum, topic, verb, sCount, contenido, temas, complejidad, rango]
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
    const newPlanBtn = document.getElementById('btn-new-planification');
    
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

    // Configurar botón "Nueva Planeación"
    if (newPlanBtn) {
        newPlanBtn.addEventListener('click', () => {
            document.getElementById('edit-plan-id').value = '';
            document.getElementById('plan-modal-title').innerText = 'Crear Nueva Planeación';
            document.getElementById('edit-plan-discipline').value = '';
            document.getElementById('edit-plan-grade').value = '1';
            document.getElementById('edit-plan-weekly-hours').value = '4';

            // Rellenar ciclos escolares
            const select = document.getElementById('edit-plan-cycle');
            select.innerHTML = '';
            const list = dbQuery("SELECT * FROM school_cycles ORDER BY start_date DESC");
            if (!list.length) {
                showToast('Primero debes crear al menos un ciclo escolar en la pestaña Ciclos.', 'error');
                return;
            }
            list.forEach(c => {
                select.appendChild(Object.assign(document.createElement('option'), { value: c.id, text: c.name }));
            });

            // Horario inicial por defecto (4hs)
            document.getElementById('edit-plan-day-1').value = 1;
            document.getElementById('edit-plan-day-2').value = 1;
            document.getElementById('edit-plan-day-3').value = 1;
            document.getElementById('edit-plan-day-4').value = 1;
            document.getElementById('edit-plan-day-5').value = 0;

            validateHours();
            document.getElementById('edit-plan-modal').style.display = 'flex';
        });
    }

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const planIdVal = document.getElementById('edit-plan-id').value;
        const cycleId = parseInt(document.getElementById('edit-plan-cycle').value);
        const disciplina = document.getElementById('edit-plan-discipline').value.trim();
        const grado = parseInt(document.getElementById('edit-plan-grade').value);
        const weeklyHours = parseInt(weeklyInput.value);

        const schedule = {};
        for (let d = 1; d <= 5; d++) {
            schedule[d] = parseInt(document.getElementById(`edit-plan-day-${d}`).value) || 0;
        }

        try {
            if (planIdVal) {
                // Modo EDICION
                const planId = parseInt(planIdVal);
                await dbRun(
                    `UPDATE planeaciones SET cycle_id = ?, disciplina = ?, grado = ?, weekly_hours = ?, schedule = ? WHERE id = ?`,
                    [cycleId, disciplina, grado, weeklyHours, JSON.stringify(schedule), planId]
                );

                showToast('Parámetros de la planeación actualizados.', 'success');
            } else {
                // Modo CREACION (CRUD completo)
                const libPdas = NEM_PHASE6_LIBRARY[disciplina]?.[grado] || [];
                const totalPdas = libPdas.length || 1;

                // 1. Insertar planeación
                const newId = await dbRun(
                    `INSERT INTO planeaciones(cycle_id, disciplina, grado, weekly_hours, schedule, total_pdas) VALUES(?,?,?,?,?,?)`,
                    [cycleId, disciplina, grado, weeklyHours, JSON.stringify(schedule), totalPdas]
                );

                // 2. Calcular sesiones del ciclo
                const cycles = dbQuery("SELECT * FROM school_cycles WHERE id = ?", [cycleId]);
                const cycle = cycles[0];
                const holidays = JSON.parse(cycle.holidays || '{}');
                const schoolDays = calculateSchoolDays(cycle.start_date, cycle.total_days, holidays);
                const sessions = mapSessions(schoolDays, schedule, cycle.period1_days, cycle.period2_days);
                const totalSessions = sessions.length;

                const baseSessions = Math.floor(totalSessions / totalPdas);
                const remainder = totalSessions % totalPdas;

                // 3. Insertar PDAs de la asignatura
                if (libPdas.length > 0) {
                    for (let i = 0; i < libPdas.length; i++) {
                        const text = libPdas[i];
                        const isObj = (typeof text === 'object' && text !== null);
                        const pdaTopic = isObj ? text.topic : text;
                        const pdaNum = isObj ? (text.pda_number || (i + 1)) : (i + 1);
                        const verb = isObj ? (text.verbo_rector || getRectorVerb(pdaTopic)) : getRectorVerb(pdaTopic);
                        const sCount = isObj ? (text.sessions_count || (baseSessions + (pdaNum <= remainder ? 1 : 0))) : (baseSessions + (pdaNum <= remainder ? 1 : 0));
                        const pdaContenido = isObj ? (text.contenido || '') : '';
                        const pdaTemas = isObj ? (text.temas || '') : '';
                        const pdaComplejidad = isObj ? (text.complejidad || 'Media') : 'Media';
                        const pdaRango = isObj ? (text.rango_sugerido || '') : '';

                        await dbRun(
                            `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count, contenido, temas, complejidad, rango_sugerido) VALUES(?,?,?,?,?,?,?,?,?)`,
                            [newId, pdaNum, pdaTopic, verb, sCount, pdaContenido, pdaTemas, pdaComplejidad, pdaRango]
                        );
                    }
                } else {
                    await dbRun(
                        `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count, contenido, temas, complejidad, rango_sugerido) VALUES(?,?,?,?,?,?,?,?,?)`,
                        [newId, 1, 'Proceso de Desarrollo de Aprendizaje (PDA) 1', 'Desarrolla', totalSessions, '', '', 'Media', '']
                    );
                }

                showToast('Planeación creada correctamente.', 'success');

                // Abrir el planificador automáticamente
                setTimeout(() => {
                    const tabBtn = document.querySelector('.nav-tab-btn[data-target="tab-dosificar"]');
                    tabBtn.click();
                    loadPlanification(newId);
                }, 200);
            }

            closeEditPlanModal();
            renderPlaneacionesList();
        } catch (err) {
            showToast('Error al guardar planeación: ' + err.message, 'error');
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
    const startInput = document.getElementById('cycle-start-date');
    const endInput = document.getElementById('cycle-end-date');

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

    function updateCalculatedDays() {
        const startVal = startInput.value;
        const endVal = endInput.value;
        if (!startVal || !endVal) return;

        // Obtener festivos del ciclo activo (si existe)
        let holidays = {};
        const id = document.getElementById('cycle-id').value;
        if (id) {
            const cycles = dbQuery("SELECT holidays FROM school_cycles WHERE id = ?", [id]);
            if (cycles.length) {
                holidays = JSON.parse(cycles[0].holidays || '{}');
            }
        }

        const totalDays = calculateDaysInRange(toggleDateFormat(startVal), toggleDateFormat(endVal), holidays);
        totalInput.value = totalDays;
        
        // Auto-distribuir días en 3 periodos lo más igualitariamente posible
        const base = Math.floor(totalDays / 3);
        p1.value = base;
        p2.value = base;
        p3.value = totalDays - (base * 2);

        validateSum();
    }

    [p1, p2, p3, totalInput].forEach(el => el.addEventListener('input', validateSum));
    startInput.addEventListener('change', updateCalculatedDays);
    endInput.addEventListener('change', updateCalculatedDays);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('cycle-id').value;
        const name = document.getElementById('cycle-name').value.trim();
        const start = toggleDateFormat(startInput.value);
        const end = toggleDateFormat(endInput.value);
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

    // Lógica para gestionar festivos (CRUD + Rangos)
    const holidayForm = document.getElementById('holiday-add-form');
    const holidaySubmitBtn = document.getElementById('btn-holiday-submit');
    const holidayCancelBtn = document.getElementById('btn-holiday-cancel');
    const holidayOrigInput = document.getElementById('holiday-orig-date');
    const holidayTitle = document.getElementById('holiday-form-title');

    function resetHolidayForm() {
        holidayForm.reset();
        holidayOrigInput.value = '';
        holidayTitle.innerText = 'Agregar Festivo';
        holidaySubmitBtn.innerText = '➕ Guardar Festivo';
        holidayCancelBtn.style.display = 'none';
        document.getElementById('holiday-date-end').disabled = false;
    }

    if (holidayCancelBtn) {
        holidayCancelBtn.addEventListener('click', resetHolidayForm);
    }

    holidayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeCycleIdForHolidays) return;

        const dateStart = document.getElementById('holiday-date').value;
        const dateEnd = document.getElementById('holiday-date-end').value;
        const label = document.getElementById('holiday-label').value.trim();
        const origDate = holidayOrigInput.value;

        try {
            const cycles = dbQuery("SELECT holidays FROM school_cycles WHERE id = ?", [activeCycleIdForHolidays]);
            if (cycles.length) {
                const holidays = JSON.parse(cycles[0].holidays || '{}');

                // Si estábamos editando una fecha individual, borrar la fecha original anterior
                if (origDate) {
                    delete holidays[origDate];
                }

                // Guardar como rango o como fecha individual
                if (dateEnd && dateEnd > dateStart) {
                    let curr = new Date(dateStart + 'T00:00:00');
                    const last = new Date(dateEnd + 'T00:00:00');
                    while (curr <= last) {
                        const dateStr = curr.toISOString().split('T')[0];
                        holidays[dateStr] = label;
                        curr.setDate(curr.getDate() + 1);
                    }
                } else {
                    holidays[dateStart] = label;
                }

                await dbRun("UPDATE school_cycles SET holidays = ? WHERE id = ?", [JSON.stringify(holidays), activeCycleIdForHolidays]);
                await recalculateAndSaveCycleDays(activeCycleIdForHolidays);
                showToast(origDate ? 'Día festivo actualizado.' : 'Día festivo añadido.', 'success');
                
                resetHolidayForm();
                renderHolidaysList(holidays);
            }
        } catch (err) {
            showToast('Error al guardar festivo: ' + err.message, 'error');
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
                await recalculateAndSaveCycleDays(activeCycleIdForHolidays);
                showToast('Festivos oficiales de México cargados.', 'success');
                renderHolidaysList(mergedHols);
            }
        } catch (err) {
            showToast('Error al cargar festivos: ' + err.message, 'error');
        }
    });

    // Exportar festivos
    document.getElementById('btn-export-holidays').addEventListener('click', () => {
        exportHolidaysToExcel();
    });

    // Importar festivos
    const importHolidaysInput = document.getElementById('import-holidays-file-input');
    document.getElementById('btn-import-holidays').addEventListener('click', () => {
        importHolidaysInput.click();
    });

    importHolidaysInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await importHolidaysFromExcel(file);
        importHolidaysInput.value = ''; // Resetear selección
    });
}

async function recalculateAndSaveCycleDays(cycleId) {
    const cycles = dbQuery("SELECT * FROM school_cycles WHERE id = ?", [cycleId]);
    if (!cycles.length) return;
    const cycle = cycles[0];
    const holidays = JSON.parse(cycle.holidays || '{}');

    const totalDays = calculateDaysInRange(cycle.start_date, cycle.end_date, holidays);
    const base = Math.floor(totalDays / 3);
    const p1Val = base;
    const p2Val = base;
    const p3Val = totalDays - (base * 2);

    await dbRun(
        `UPDATE school_cycles SET total_days = ?, period1_days = ?, period2_days = ?, period3_days = ? WHERE id = ?`,
        [totalDays, p1Val, p2Val, p3Val, cycleId]
    );

    // Si el formulario actual tiene cargado este ciclo escolar, actualizar inputs
    const formId = document.getElementById('cycle-id').value;
    if (formId && parseInt(formId) === cycleId) {
        document.getElementById('cycle-total-days').value = totalDays;
        document.getElementById('cycle-p1-days').value = p1Val;
        document.getElementById('cycle-p2-days').value = p2Val;
        document.getElementById('cycle-p3-days').value = p3Val;
    }
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
            <td>${c.end_date}</td>
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
            document.getElementById('cycle-start-date').value = toggleDateFormat(c.start_date);
            document.getElementById('cycle-end-date').value = toggleDateFormat(c.end_date);
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
        list.innerHTML = `<div class="empty-state" style="padding:15px 0; font-size:12px; text-align:center; color:var(--text-secondary);">No hay días festivos registrados.</div>`;
        return;
    }

    dates.forEach(d => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justify = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '8px 12px';
        item.style.border = '1px solid var(--border-color)';
        item.style.borderRadius = 'var(--radius-md)';
        item.style.backgroundColor = 'var(--card-bg)';
        item.style.fontSize = '0.85rem';
        item.style.marginBottom = '4px';

        item.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <strong style="color: var(--text-color);">${d}</strong>
                <span style="color: var(--text-secondary); font-size: 0.75rem;">${htmlspecialchars(holidays[d])}</span>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn-sm btn-edit-holiday" style="padding: 2px 6px; font-size: 0.75rem;">✏️</button>
                <button class="btn btn-danger btn-sm btn-delete-holiday" style="padding: 2px 6px; font-size: 0.75rem;">🗑️</button>
            </div>
        `;

        // Botón Editar Festivo
        item.querySelector('.btn-edit-holiday').addEventListener('click', () => {
            document.getElementById('holiday-orig-date').value = d;
            document.getElementById('holiday-date').value = d;
            document.getElementById('holiday-date-end').value = '';
            document.getElementById('holiday-date-end').disabled = true; // Deshabilitar rango al editar individual
            document.getElementById('holiday-label').value = holidays[d];
            
            document.getElementById('holiday-form-title').innerText = 'Editar Festivo';
            document.getElementById('btn-holiday-submit').innerText = '💾 Actualizar Festivo';
            document.getElementById('btn-holiday-cancel').style.display = 'inline-flex';

            document.getElementById('holiday-add-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        // Botón Eliminar Festivo
        item.querySelector('.btn-delete-holiday').addEventListener('click', async () => {
            if (confirm(`¿Eliminar el festivo del día ${d}?`)) {
                try {
                    const cycles = dbQuery("SELECT holidays FROM school_cycles WHERE id = ?", [activeCycleIdForHolidays]);
                    if (cycles.length) {
                        const hols = JSON.parse(cycles[0].holidays || '{}');
                        delete hols[d];
                        await dbRun("UPDATE school_cycles SET holidays = ? WHERE id = ?", [JSON.stringify(hols), activeCycleIdForHolidays]);
                        await recalculateAndSaveCycleDays(activeCycleIdForHolidays);
                        showToast('Día festivo eliminado.', 'success');
                        renderHolidaysList(hols);

                        if (document.getElementById('holiday-orig-date').value === d) {
                            // Resetear formulario si era la que estábamos editando
                            document.getElementById('holiday-add-form').reset();
                            document.getElementById('holiday-orig-date').value = '';
                            document.getElementById('holiday-form-title').innerText = 'Agregar Festivo';
                            document.getElementById('btn-holiday-submit').innerText = '➕ Guardar Festivo';
                            document.getElementById('btn-holiday-cancel').style.display = 'none';
                            document.getElementById('holiday-date-end').disabled = false;
                        }
                    }
                } catch (err) {
                    showToast('Error al eliminar festivo: ' + err.message, 'error');
                }
            }
        });

        list.appendChild(item);
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

    const authForm = document.getElementById('admin-auth-form');
    const defaultDbFileInput = document.getElementById('default-db-file-input');

    // Funciones globales de apertura y cierre de modal
    window.openAdminAuthModal = function() {
        document.getElementById('auth-username').value = '';
        document.getElementById('auth-password').value = '';
        document.getElementById('admin-auth-modal').style.display = 'flex';
    };

    window.closeAdminAuthModal = function() {
        document.getElementById('admin-auth-modal').style.display = 'none';
    };

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

    // Evento de clic en restablecer base de datos
    document.getElementById('btn-reset-db').addEventListener('click', () => {
        openAdminAuthModal();
    });

    // Formulario de autenticación de administrador
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('auth-username').value.trim();
        const pass = document.getElementById('auth-password').value;

        if (user === 'josue958' && pass === 'Yoshi985') {
            closeAdminAuthModal();
            showToast('Autenticación correcta. Selecciona el archivo .sqlite para establecer como predeterminado.', 'success');
            defaultDbFileInput.click();
        } else {
            showToast('Usuario o contraseña incorrectos.', 'error');
        }
    });

    // Al seleccionar el archivo de base de datos por defecto
    defaultDbFileInput.addEventListener('change', async () => {
        const file = defaultDbFileInput.files[0];
        if (!file) return;

        try {
            const buf = await file.arrayBuffer();
            
            // 1. Guardar en localStorage como semilla predeterminada
            saveDefaultSeed(buf);
            
            // 2. Cargar en base de datos activa
            await importDatabase(file);

            showToast('Base de datos predeterminada establecida y cargada con éxito.', 'success');

            // Refrescar vistas
            loadCyclesDropdowns();
            renderCyclesList();
            renderPlaneacionesList();

            // Limpiar selector y regresar a vista de configuración inicial
            defaultDbFileInput.value = '';
            activePlaneacionId = null;
            setPlannerLayoutActive(false);
            document.getElementById('dosificar-setup').style.display = 'block';
            document.body.classList.add('bg-grid-pattern');

        } catch (err) {
            console.error(err);
            showToast('Error al establecer base de datos por defecto: ' + err.message, 'error');
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

function toggleDateFormat(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

function parseDateDMY(dmyStr) {
    if (!dmyStr) return null;
    const parts = dmyStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    return null;
}

function formatDateDMY(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

// Re-declaración de funciones de fechas para el ámbito del app.js
function calculateSchoolDays(startDate, totalDays, holidays) {
    const days = [];
    let current = parseDateDMY(startDate);
    let count = 0;
    let limit = 0;

    while (count < totalDays && limit < 1000) {
        limit++;
        const w = current.getDay();
        const dateStr = formatDateDMY(current);

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
        const date = parseDateDMY(dateStr);
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

function calculateDaysInRange(startDateStr, endDateStr, holidays) {
    if (!startDateStr || !endDateStr) return 0;
    
    let start = parseDateDMY(startDateStr);
    let end = parseDateDMY(endDateStr);
    
    if (start > end) return 0;
    
    let count = 0;
    let current = new Date(start);
    
    while (current <= end) {
        const w = current.getDay(); // 0 = Dom, 6 = Sáb
        if (w !== 0 && w !== 6) {
            const dateStr = formatDateDMY(current);
            if (!holidays[dateStr]) {
                count++;
            }
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

async function exportHolidaysToExcel() {
    if (!activeCycleIdForHolidays) {
        showToast('No hay ningún ciclo escolar seleccionado para exportar.', 'error');
        return;
    }

    try {
        const cycles = dbQuery("SELECT * FROM school_cycles WHERE id = ?", [activeCycleIdForHolidays]);
        if (!cycles.length) return;
        const cycle = cycles[0];
        const holidays = JSON.parse(cycle.holidays || '{}');

        // Agrupar fechas consecutivas con el mismo motivo
        const dates = Object.keys(holidays).sort();
        const ranges = [];

        if (dates.length > 0) {
            let currentRange = {
                inicio: dates[0],
                fin: dates[0],
                desc: holidays[dates[0]]
            };

            for (let i = 1; i < dates.length; i++) {
                const nextD = dates[i];
                const diffDays = (parseDateDMY(nextD) - parseDateDMY(currentRange.fin)) / (1000 * 60 * 60 * 24);

                if (diffDays === 1 && holidays[nextD] === currentRange.desc) {
                    currentRange.fin = nextD;
                } else {
                    ranges.push(Object.assign({}, currentRange));
                    currentRange = {
                        inicio: nextD,
                        fin: nextD,
                        desc: holidays[nextD]
                    };
                }
            }
            ranges.push(currentRange);
        }

        // Crear libro Excel
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Festivos');

        sheet.columns = [
            { header: 'inicio', key: 'inicio', width: 15 },
            { header: 'fin', key: 'fin', width: 15 },
            { header: 'Descripcion', key: 'desc', width: 30 }
        ];

        sheet.getRow(1).font = { bold: true };

        ranges.forEach(r => {
            sheet.addRow({
                inicio: r.inicio,
                fin: r.inicio === r.fin ? '' : r.fin,
                desc: r.desc
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = Object.assign(document.createElement('a'), {
            href: url,
            download: `festivos-${cycle.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`
        });
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('Festivos exportados con éxito a Excel.', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error al exportar festivos: ' + e.message, 'error');
    }
}

async function importHolidaysFromExcel(file) {
    if (!activeCycleIdForHolidays) {
        showToast('No hay ningún ciclo escolar seleccionado para importar.', 'error');
        return;
    }

    try {
        const buf = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buf);
        const sheet = workbook.worksheets[0];
        
        const newHolidays = {};
        
        const formatDate = (val) => {
            if (val instanceof Date) {
                return formatDateDMY(val);
            }
            if (val && typeof val === 'object' && val.result) {
                val = val.result;
            }
            if (typeof val === 'string') {
                const matchYMD = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (matchYMD) return `${matchYMD[3]}-${matchYMD[2]}-${matchYMD[1]}`;
                const matchDMY = val.match(/^(\d{2})-(\d{2})-(\d{4})/);
                if (matchDMY) return val;
            }
            try {
                const d = new Date(val);
                if (!isNaN(d.getTime())) return formatDateDMY(d);
            } catch(e){}
            return null;
        };

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Saltar cabeceras
            
            const startVal = row.getCell(1).value;
            const endVal = row.getCell(2).value;
            const descVal = row.getCell(3).value;

            if (!startVal || !descVal) return;

            const startStr = formatDate(startVal);
            const descStr = typeof descVal === 'object' ? (descVal.richText ? descVal.richText.map(t=>t.text).join('') : JSON.stringify(descVal)) : String(descVal).trim();

            if (!startStr || !descStr) return;

            const endStr = endVal ? formatDate(endVal) : null;

            if (endStr && parseDateDMY(endStr) > parseDateDMY(startStr)) {
                let curr = parseDateDMY(startStr);
                const last = parseDateDMY(endStr);
                let limit = 0;
                while (curr <= last && limit < 150) {
                    limit++;
                    const dateStr = formatDateDMY(curr);
                    newHolidays[dateStr] = descStr;
                    curr.setDate(curr.getDate() + 1);
                }
            } else {
                newHolidays[startStr] = descStr;
            }
        });

        const cycles = dbQuery("SELECT holidays FROM school_cycles WHERE id = ?", [activeCycleIdForHolidays]);
        if (cycles.length) {
            const currentHolidays = JSON.parse(cycles[0].holidays || '{}');
            const merged = Object.assign({}, currentHolidays, newHolidays);
            
            await dbRun("UPDATE school_cycles SET holidays = ? WHERE id = ?", [JSON.stringify(merged), activeCycleIdForHolidays]);
            await recalculateAndSaveCycleDays(activeCycleIdForHolidays);
            
            showToast('Festivos importados y combinados correctamente.', 'success');
            renderHolidaysList(merged);
        }
    } catch (e) {
        console.error(e);
        showToast('Error al importar festivos: ' + e.message, 'error');
    }
}
