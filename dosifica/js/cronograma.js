'use strict';

/**
 * js/cronograma.js
 * Generates the school calendar grid based on school cycle data.
 */

function renderCronogramaEscolar() {
    const container = document.getElementById('cronograma-wrapper');
    if (!container) return;
    
    try {
        let cycleIdToUse = null;

        if (typeof activePlaneacionId !== 'undefined' && activePlaneacionId) {
            const plans = dbQuery("SELECT cycle_id FROM planeaciones WHERE id = ?", [activePlaneacionId]);
            if (plans.length > 0) cycleIdToUse = plans[0].cycle_id;
        }

        if (!cycleIdToUse && typeof activeCycleIdForHolidays !== 'undefined' && activeCycleIdForHolidays) {
            cycleIdToUse = activeCycleIdForHolidays;
        }

        if (!cycleIdToUse) {
            container.innerHTML = '<div style="padding: 20px; text-align:center;">Selecciona o crea una planeación, o selecciona configurar días hábiles en Ciclos Escolares para cargar un ciclo.</div>';
            return;
        }

        const cycles = dbQuery("SELECT * FROM school_cycles WHERE id = ?", [cycleIdToUse]);
        if (cycles.length === 0) throw new Error("Ciclo no encontrado");
        
        const cycle = cycles[0];
        const holidays = JSON.parse(cycle.holidays || '{}');
        const startDate = new Date(cycle.start_date + 'T00:00:00');
        const startYear = startDate.getFullYear();
        
        // Define trimesters logic
        // T1: Aug, Sep, Oct, Nov
        // T2: Dec, Jan, Feb, Mar
        // T3: Apr, May, Jun, Jul
        
        const trimesters = [
            { name: "TRIMESTRE 1", months: [ {name: "AGOSTO", m: 7}, {name: "SEPTIEMBRE", m: 8}, {name: "OCTUBRE", m: 9}, {name: "NOVIEMBRE", m: 10} ] },
            { name: "TRIMESTRE 2", months: [ {name: "DICIEMBRE", m: 11}, {name: "ENERO", m: 0}, {name: "FEBRERO", m: 1}, {name: "MARZO", m: 2} ] },
            { name: "TRIMESTRE 3", months: [ {name: "ABRIL", m: 3}, {name: "MAYO", m: 4}, {name: "JUNIO", m: 5}, {name: "JULIO", m: 6} ] }
        ];

        let html = `
            <div class="crono-legend">
                <span class="crono-legend-title">Leyenda del Cronograma:</span>
                <div class="crono-legend-item"><div class="crono-legend-color" style="background: rgba(239, 68, 68, 0.2); border-color: var(--color-danger);"></div><span>Inhábil / Vacaciones</span></div>
                <div class="crono-legend-item"><div class="crono-legend-color" style="background: rgba(201, 166, 70, 0.2); border-color: #C9A646;"></div><span>Consejo Técnico (CTE)</span></div>
                <div class="crono-legend-item"><div class="crono-legend-color" style="background: rgba(34, 197, 94, 0.2); border-color: var(--color-success);"></div><span>Registro Calificaciones</span></div>
                <div class="crono-legend-item"><div class="crono-legend-color" style="background: rgba(30, 144, 255, 0.2); border-color: #1E90FF;"></div><span>Diagnóstico</span></div>
                <div class="crono-legend-item"><div class="crono-legend-color" style="background: rgba(59, 130, 246, 0.2); border-color: var(--color-primary);"></div><span>Taller Docente</span></div>
            </div>

            <div class="crono-tabs-header">
                ${trimesters.map((t, i) => `<button class="crono-tab-btn ${i===0?'active':''}" onclick="switchCronoTab(${i}, this)">${t.name}</button>`).join('')}
            </div>
            
            <div class="crono-trimesters-container">
        `;

        trimesters.forEach((t, tIndex) => {
            html += `<div id="crono-trim-${tIndex}" class="crono-trimester-content ${tIndex===0?'active':''}">`;
            
            t.months.forEach(monthObj => {
                const year = monthObj.m >= 7 ? startYear : startYear + 1; // 7=Aug to 11=Dec -> startYear, 0=Jan to 6=Jul -> startYear+1
                
                const daysInMonth = new Date(year, monthObj.m + 1, 0).getDate();
                const weekdays = [];
                for(let d=1; d<=daysInMonth; d++) {
                    const date = new Date(year, monthObj.m, d);
                    const wd = date.getDay();
                    if(wd >= 1 && wd <= 5) {
                        const dateStr = `${year}-${String(monthObj.m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                        weekdays.push({ 
                            day: d, 
                            letter: ['D','L','M','M','J','V','S'][wd],
                            dateStr: dateStr,
                            event: holidays[dateStr] || null
                        });
                    }
                }
                
                html += `
                    <div class="crono-month-card">
                        <div class="crono-month-header">📅 ${monthObj.name} ${year}</div>
                        <div class="crono-table-wrapper">
                            <table class="crono-table">
                                <tr>
                                    <th>MES</th>
                                    ${weekdays.map(wd => `<th>${wd.letter}</th>`).join('')}
                                </tr>
                                <tr>
                                    <th>${monthObj.name} ${year}</th>
                                    ${weekdays.map(wd => `<th>${wd.day}</th>`).join('')}
                                </tr>
                                <tr>
                                    <th>PDA</th>
                                    ${weekdays.map(wd => `<td></td>`).join('')}
                                </tr>
                                <tr>
                                    <th>SEGUIMIENTO DOCENTE</th>
                                    ${generateEventsRowHtml(weekdays)}
                                </tr>
                            </table>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        });
        
        html += `</div>`;
        container.innerHTML = html;
        
    } catch(e) {
        container.innerHTML = `<div class="alert alert-error">Error al renderizar cronograma: ${e.message}</div>`;
        console.error(e);
    }
}

function switchCronoTab(index, btn) {
    document.querySelectorAll('.crono-tabs-header .crono-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.crono-trimester-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`crono-trim-${index}`).classList.add('active');
}

function getEventStyle(eventName) {
    const textUpper = (eventName || '').toUpperCase();
    if (textUpper.includes('CTE') || textUpper.includes('CONSEJO TÉCNICO')) {
        return 'background: rgba(201, 166, 70, 0.15); color: #C9A646; border: 1px solid #C9A646;';
    }
    if (textUpper.includes('SUSPENSIÓN') || textUpper.includes('RECESO') || textUpper.includes('VACACIONAL') || textUpper.includes('VACACIONES')) {
        return 'background: rgba(239, 68, 68, 0.15); color: var(--color-danger); border: 1px solid var(--color-danger);';
    }
    if (textUpper.includes('CALIFICACIONES') || textUpper.includes('BOLETAS') || textUpper.includes('REGISTRO')) {
        return 'background: rgba(34, 197, 94, 0.15); color: var(--color-success); border: 1px solid var(--color-success);';
    }
    if (textUpper.includes('DIAGNÓSTICO') || textUpper.includes('MEJOREDU')) {
        return 'background: rgba(30, 144, 255, 0.15); color: #1E90FF; border: 1px solid #1E90FF;';
    }
    if (textUpper.includes('TALLER INTENSIVO')) {
        return 'background: rgba(59, 130, 246, 0.15); color: var(--color-primary); border: 1px solid var(--color-primary);';
    }
    return 'background: rgba(245, 158, 11, 0.15); color: var(--color-warning); border: 1px solid var(--color-warning);';
}

function generateEventsRowHtml(weekdays) {
    let html = '';
    let currentEvent = null;
    let colspan = 0;
    
    const flushEvent = () => {
        if (colspan > 0) {
            if (currentEvent) {
                html += `<td colspan="${colspan}" class="crono-cell-event" style="${getEventStyle(currentEvent)}">${currentEvent}</td>`;
            } else {
                html += `<td colspan="${colspan}"></td>`;
            }
        }
    };
    
    weekdays.forEach(wd => {
        if (wd.event !== currentEvent) {
            flushEvent();
            currentEvent = wd.event;
            colspan = 1;
        } else {
            colspan++;
        }
    });
    flushEvent();
    
    return html;
}
