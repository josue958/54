'use strict';

/**
 * cronogramas.js
 * Lógica para renderizar el Dashboard de Cronogramas
 */

let calendarGridData = [];

// Cargar el JSON pre-parseado de fechas
async function loadCalendarGrid() {
    if (calendarGridData.length === 0) {
        try {
            const response = await fetch('assets/calendar_parsed_grid.json');
            if (response.ok) {
                calendarGridData = await response.json();
            }
        } catch (e) {
            console.error('Error cargando calendar_parsed_grid.json', e);
        }
    }
    return calendarGridData;
}

async function renderCronogramasDashboard() {
    const container = document.getElementById('cronogramas-content');
    if (!container) return;

    try {
        // 1. Obtener estadísticas
        const cycles = dbQuery("SELECT * FROM school_cycles ORDER BY start_date DESC");
        const planeaciones = dbQuery(`
            SELECT p.*, c.name as cycle_name, c.start_date as cycle_start_date 
            FROM planeaciones p 
            JOIN school_cycles c ON p.cycle_id = c.id 
            ORDER BY p.disciplina ASC
        `);
        
        let totalPdas = 0;
        planeaciones.forEach(p => totalPdas += p.total_pdas);

        // 2. Construir HTML
        let html = `
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                <div class="card" style="padding: 20px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--color-primary);">${cycles.length}</div>
                    <div style="color: var(--text-gray-600); font-weight: 600;">Ciclos Escolares</div>
                </div>
                <div class="card" style="padding: 20px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--color-primary);">${planeaciones.length}</div>
                    <div style="color: var(--text-gray-600); font-weight: 600;">Asignaturas</div>
                </div>
                <div class="card" style="padding: 20px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--color-primary);">${totalPdas}</div>
                    <div style="color: var(--text-gray-600); font-weight: 600;">PDAs Totales</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <!-- Materias Configuradas -->
                <div class="card">
                    <h3 style="margin-bottom: 16px;">📚 Asignaturas Configuradas</h3>
                    ${planeaciones.length === 0 ? '<p>No hay asignaturas creadas.</p>' : `
                        <div style="overflow-x: auto;">
                            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="text-align: left; border-bottom: 2px solid var(--border-color);">
                                        <th style="padding: 8px;">Asignatura</th>
                                        <th style="padding: 8px;">Ciclo</th>
                                        <th style="padding: 8px;">Horas</th>
                                        <th style="padding: 8px;">PDAs</th>
                                        <th style="padding: 8px; text-align:right;">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${planeaciones.map(p => `
                                        <tr style="border-bottom: 1px solid var(--border-color);">
                                            <td style="padding: 12px 8px;"><strong>${p.disciplina} ${p.grado}º</strong></td>
                                            <td style="padding: 12px 8px;"><span class="badge" style="background:var(--bg-gray-100); color:var(--text-gray-900); padding: 4px 8px; border-radius: 4px; font-size:12px;">${p.cycle_name}</span></td>
                                            <td style="padding: 12px 8px;">${p.weekly_hours} hs/sem</td>
                                            <td style="padding: 12px 8px;"><span class="badge" style="background:var(--color-primary-light); color:var(--color-primary); padding: 4px 8px; border-radius: 4px; font-size:12px;">${p.total_pdas}</span></td>
                                            <td style="padding: 12px 8px; text-align:right;">
                                                <button class="btn btn-primary btn-sm" onclick="showCronogramaView(${p.id})">📊 Ver Cronograma</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>

                <!-- Ciclos Escolares -->
                <div class="card">
                    <h3 style="margin-bottom: 16px;">📅 Ciclos Escolares</h3>
                    ${cycles.length === 0 ? '<p>No hay ciclos registrados.</p>' : `
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${cycles.map(c => `
                                <div style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md);">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                        <strong>${c.name}</strong>
                                        <span style="background:var(--bg-gray-100); padding: 2px 6px; border-radius:4px; font-size:11px;">${c.total_days} Días</span>
                                    </div>
                                    <div style="font-size:12px; color:var(--text-gray-600);">
                                        P1: ${c.period1_days}d | P2: ${c.period2_days}d | P3: ${c.period3_days}d
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>

            <!-- Contenedor del Cronograma Específico -->
            <div id="cronograma-detail-container" style="margin-top: 40px; display: none;"></div>
        `;

        container.innerHTML = html;
        
        // Precargar el grid
        await loadCalendarGrid();

    } catch (e) {
        container.innerHTML = `<div style="color:var(--color-danger); padding:20px;">Error al cargar dashboard: ${e.message}</div>`;
        console.error(e);
    }
}

async function showCronogramaView(planeacionId) {
    const container = document.getElementById('cronograma-detail-container');
    if (!container) return;
    
    container.style.display = 'block';
    container.innerHTML = '<div style="text-align:center; padding:40px;">Cargando cronograma...</div>';
    
    container.scrollIntoView({ behavior: 'smooth' });

    try {
        const grid = await loadCalendarGrid();
        
        const plans = dbQuery("SELECT p.*, c.name as cycle_name, c.start_date as cycle_start_date FROM planeaciones p JOIN school_cycles c ON p.cycle_id = c.id WHERE p.id = ?", [planeacionId]);
        if (plans.length === 0) throw new Error("Planeación no encontrada");
        const plan = plans[0];
        
        let html = `
            <div style="border-top: 2px solid var(--border-color); padding-top: 20px;">
                <h2 style="margin-bottom: 20px;">Cronograma: ${plan.disciplina} ${plan.grado}º - ${plan.cycle_name}</h2>
                
                <div class="legend-card">
                    <span class="legend-title">Leyenda del Cronograma:</span>
                    <div class="legend-item"><div class="legend-color" style="background: rgba(239, 68, 68, 0.2); border: 1px solid var(--color-danger);"></div><span>Inhábil / Vacaciones</span></div>
                    <div class="legend-item"><div class="legend-color" style="background: rgba(201, 166, 70, 0.2); border: 1px solid #C9A646;"></div><span>Consejo Técnico (CTE)</span></div>
                    <div class="legend-item"><div class="legend-color" style="background: rgba(34, 197, 94, 0.2); border: 1px solid var(--color-success);"></div><span>Registro Calificaciones</span></div>
                    <div class="legend-item"><div class="legend-color" style="background: rgba(30, 144, 255, 0.2); border: 1px solid #1E90FF;"></div><span>Diagnóstico</span></div>
                    <div class="legend-item"><div class="legend-color" style="background: rgba(59, 130, 246, 0.2); border: 1px solid var(--color-primary);"></div><span>Taller Docente</span></div>
                </div>
        `;
        
        if (grid.length > 0) {
            html += `
                <div class="tabs-header">
                    ${grid.map((m, i) => `<button class="tab-btn ${i===0 ? 'active':''}" onclick="switchCronogramaTab(${i}, this)">${m.moment}</button>`).join('')}
                </div>
                
                <div class="moments-container">
                    ${grid.map((m, i) => `
                        <div id="moment-content-${i}" class="moment-content ${i===0 ? 'active':''}">
                            ${m.months.map(monthData => `
                                <div class="card" style="margin-bottom: 20px;">
                                    <div class="month-label">📅 ${monthData.month}</div>
                                    <div class="table-scroll-container">
                                        <table class="excel-table">
                                            <tr>
                                                <th>Mes</th>
                                                ${Array.from({length: 31}, (_, d) => `<th>${d+1}</th>`).join('')}
                                            </tr>
                                            <tr>
                                                <th>Día</th>
                                                ${Array.from({length: 31}, (_, d) => `<td>-</td>`).join('')}
                                            </tr>
                                            <tr>
                                                <th>PDA</th>
                                                ${Array.from({length: 31}, (_, d) => `<td></td>`).join('')}
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            html += `<p>No hay datos de grilla de calendario (calendar_parsed_grid.json) disponibles.</p>`;
        }
        
        html += `</div>`;
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<div style="color:var(--color-danger); padding:20px;">Error al generar cronograma: ${e.message}</div>`;
        console.error(e);
    }
}

function switchCronogramaTab(index, btn) {
    document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.moments-container .moment-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`moment-content-${index}`).classList.add('active');
}
