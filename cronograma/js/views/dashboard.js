'use strict';
/**
 * views/dashboard.js — Cronograma principal (grid de meses × días)
 */
const DashboardView = (() => {

    let _selectedCycleId   = null;
    let _selectedSubjectId = null;

    function render() {
        const stats    = getStats();
        const cycles   = getCycles();
        const subjects = getSubjects();

        if(!_selectedCycleId && cycles.length) _selectedCycleId = cycles[0].id;
        const cycleSubjects = _selectedCycleId ? subjects.filter(s=>s.cycle_id==_selectedCycleId) : subjects;
        if(!_selectedSubjectId && cycleSubjects.length) _selectedSubjectId = cycleSubjects[0].id;

        return `
        <div>
            <!-- Widgets stats -->
            <div class="stats-grid" style="margin-bottom:24px;">
                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-details"><span class="stat-value">${stats.cycles}</span><span class="stat-label">Ciclos Escolares</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📚</div>
                    <div class="stat-details"><span class="stat-value">${stats.subjects}</span><span class="stat-label">Asignaturas</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📑</div>
                    <div class="stat-details"><span class="stat-value">${stats.pdas}</span><span class="stat-label">PDAs Totales</span></div>
                </div>
            </div>

            <div class="grid-container" style="margin-bottom:24px;">
                <!-- Columna Izquierda: Listado de Materias -->
                <div>
                    <div class="card">
                        <div class="card-title">
                            <span>📚</span> Materias Configuradas
                        </div>
                        ${subjects.length === 0 ? `
                            <div class="empty-state">
                                <div class="empty-state-icon">📚</div>
                                <p>No hay materias creadas aún.</p>
                                <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="navigate('#subjects')">Crear Materia</button>
                            </div>
                        ` : `
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Materia</th>
                                            <th>Ciclo Escolar</th>
                                            <th>Horas/Semana</th>
                                            <th>Total PDAs</th>
                                            <th style="text-align: right;">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${subjects.map(subj => {
                                            const cycle = cycles.find(c => c.id == subj.cycle_id) || {};
                                            return `
                                            <tr style="${_selectedSubjectId == subj.id ? 'background-color: rgba(30, 144, 255, 0.1);' : ''}">
                                                <td><strong>${escHtml(subj.name)}</strong></td>
                                                <td><span class="badge badge-neutral">${escHtml(cycle.name || '')}</span></td>
                                                <td>${subj.weekly_hours} hs / semana</td>
                                                <td><span class="badge badge-p1">${subj.total_pdas} PDAs</span></td>
                                                <td style="text-align: right;">
                                                    <button type="button" class="btn btn-primary btn-sm" style="margin-right:4px;" onclick="DashboardView.changeSubject(${subj.id})">
                                                        <span>📊</span> Ver Cronograma
                                                    </button>
                                                    <button type="button" class="btn btn-secondary btn-sm" onclick="ExcelExport.exportarCronograma(${subj.cycle_id}, ${subj.id})">
                                                        <span>💾</span> Exportar Excel
                                                    </button>
                                                </td>
                                            </tr>`;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Columna Derecha: Ciclos Escolares Activos -->
                <div>
                    <div class="card">
                        <div class="card-title">
                            <span>📅</span> Ciclos Escolares
                        </div>
                        ${cycles.length === 0 ? `
                            <div class="empty-state">
                                <div class="empty-state-icon">📅</div>
                                <p>No hay ciclos escolares registrados.</p>
                                <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="navigate('#cycles')">Crear Ciclo</button>
                            </div>
                        ` : `
                            <div class="pda-timeline-list">
                                ${cycles.map(cyc => `
                                    <div class="pda-item-card" style="padding: 16px;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                            <strong>${escHtml(cyc.name)}</strong>
                                            <span class="badge badge-p3">${cyc.total_days} Días</span>
                                        </div>
                                        <div class="pda-dates-text" style="margin-bottom: 8px;">
                                            Vigencia: <strong>${formatDateSpanish(cyc.start_date, true)}</strong> al <strong>${cyc.end_date ? formatDateSpanish(cyc.end_date, true) : 'No definida'}</strong>
                                        </div>
                                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                            <span class="badge badge-p1" style="font-size: 9px;">P1: ${cyc.period1_days}d</span>
                                            <span class="badge badge-p2" style="font-size: 9px;">P2: ${cyc.period2_days}d</span>
                                            <span class="badge badge-p3" style="font-size: 9px;">P3: ${cyc.period3_days}d</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Cronograma grid -->
            <div id="calendar-container">
                ${_selectedSubjectId ? _renderCalendar() : ''}
            </div>
        </div>`;
    }

    let _calendarGridData = null;

    function init() {
        if (!_calendarGridData) {
            _calendarGridData = []; // prevent duplicate fetches
            fetch('assets/calendar_parsed_grid.json')
                .then(r => r.json())
                .then(data => {
                    _calendarGridData = data;
                    if (_selectedSubjectId) changeSubject(_selectedSubjectId);
                })
                .catch(e => console.error("Error loading calendar grid data", e));
        }
    }

    function _renderCalendar() {
        if(!_selectedSubjectId || !_selectedCycleId) return '';
        
        if(!_calendarGridData || _calendarGridData.length === 0) {
            return `<div class="card" style="text-align:center; padding:40px;">Cargando plantilla del cronograma...</div>`;
        }

        const cycle = getCycle(_selectedCycleId);
        if(!cycle) return '';
        const startYear = parseInt(cycle.start_date.substring(0, 4), 10);

        const { distribution, sessions } = getPdaDistribution(_selectedSubjectId);
        const holidaysMap = getAllHolidaysMap(_selectedCycleId);

        // Mapa rápido fecha → pda
        const pdaDateMap = {};
        distribution.forEach(pda => {
            pda.sessions.forEach(s => { 
                pdaDateMap[s.date] = { pda_number: pda.pda_number, topic: pda.topic }; 
            });
        });

        // Legend
        let html = `
        <h2 style="margin-bottom: 20px; color: var(--text-primary); font-size: 20px; font-weight: 700; border-bottom: 2px solid var(--border-light); padding-bottom: 8px;">📊 Cronograma</h2>
        <div class="legend-card" style="margin-bottom: 20px;">
            <span class="legend-title" style="font-weight: bold; font-size: 12px; margin-right: 12px;">Leyenda:</span>
            <div style="display:inline-flex; gap:16px;">
                <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:12px; height:12px; background:rgba(239, 68, 68, 0.2); border:1px solid var(--color-danger); border-radius:3px;"></span> Inhábil</div>
                <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:12px; height:12px; background:rgba(201, 166, 70, 0.2); border:1px solid var(--color-dorado); border-radius:3px;"></span> CTE</div>
                <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:12px; height:12px; background:rgba(34, 197, 94, 0.2); border:1px solid var(--color-success); border-radius:3px;"></span> Calificaciones / Registro</div>
                <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:12px; height:12px; background:rgba(30, 144, 255, 0.2); border:1px solid var(--color-azul-tecnologico); border-radius:3px;"></span> PDA Asignado</div>
            </div>
        </div>`;

        // Pestañas
        html += `<div class="tabs-header" style="display:flex; gap:8px; margin-bottom:20px;">`;
        _calendarGridData.forEach((moment, idx) => {
            html += `<button class="tab-btn btn ${idx===0?'btn-primary':'btn-secondary'}" onclick="DashboardView.switchMoment(${idx}, this)">${escHtml(moment.moment)}</button>`;
        });
        html += `</div>`;

        const monthNumbers = {
            'AGOSTO': '08', 'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12',
            'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04', 'MAYO': '05', 'JUNIO': '06', 'JULIO': '07'
        };
        const yearMonths = ['AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

        // Helper para letras y dias dinamicos
        function getMonthWeekdaysJS(monthName, year) {
            const mNum = parseInt(monthNumbers[monthName.toUpperCase()], 10) - 1;
            const weekdays = [];
            const weekdayLetters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
            let date = new Date(year, mNum, 1);
            while (date.getMonth() === mNum) {
                let dayOfWeek = date.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    weekdays.push({ day: date.getDate(), letter: weekdayLetters[dayOfWeek] });
                }
                date.setDate(date.getDate() + 1);
            }
            return weekdays;
        }

        // Render contents
        _calendarGridData.forEach((moment, idx) => {
            html += `<div id="moment-${idx}" class="moment-content" style="display: ${idx===0?'block':'none'}">`;
            
            moment.months.forEach(monthData => {
                const monthName = monthData.month.toUpperCase();
                const isFirstPart = yearMonths.includes(monthName);
                const calculatedYear = isFirstPart ? startYear : (startYear + 1);
                
                html += `
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-title" style="margin-bottom:12px; font-weight:bold; color:var(--text-secondary);">📅 ${monthName} ${calculatedYear}</div>
                    <div class="table-scroll-container" style="overflow-x:auto;">
                        <table class="excel-table" style="width:100%; border-collapse:collapse; font-size:11px; text-align:center;">
                            <tbody>`;
                
                const dynamicWeekdays = getMonthWeekdaysJS(monthName, calculatedYear);
                let colToDayNum = {};

                monthData.rows.forEach((row, rowIdx) => {
                    html += `<tr>`;
                    let currentCol = 0;

                    row.forEach((cell, cellIdx) => {
                        let text = cell.text || '';
                        
                        // Fila 0: Letras
                        if (rowIdx === 0 && cellIdx > 0) {
                            let wData = dynamicWeekdays[cellIdx - 1];
                            text = wData ? wData.letter : '';
                        } 
                        // Fila 1: Numeros
                        else if (rowIdx === 1 && cellIdx > 0) {
                            let wData = dynamicWeekdays[cellIdx - 1];
                            text = wData ? wData.day : '';
                            
                            let colspan = cell.colspan || 1;
                            let dayNum = parseInt(text, 10);
                            if (!isNaN(dayNum)) {
                                for (let c = 0; c < colspan; c++) {
                                    colToDayNum[currentCol + c] = dayNum;
                                }
                            }
                        }

                        let colspanAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '';
                        let rowspanAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : '';

                        if (cell.is_header) {
                            let headerStyle = 'border:1px solid var(--border-light); background:var(--bg-elevated); padding:6px; font-weight:bold; color:var(--text-primary);';
                            html += `<th${colspanAttr}${rowspanAttr} style="${headerStyle}">${escHtml(String(text))}</th>`;
                        } else {
                            let style = 'border:1px solid var(--border-light); padding:4px; min-width: 40px;';
                            let content = escHtml(String(text));

                            // Fila de PDAs o Seguimiento
                            if ((cell.type === 'pda' || cell.type === 'seguimiento') && cellIdx > 0) {
                                let dayNum = colToDayNum[currentCol];
                                if (dayNum !== undefined && (cell.colspan || 1) === 1) {
                                    let dayStr = dayNum < 10 ? '0' + dayNum : dayNum;
                                    let monthNumStr = monthNumbers[monthName];
                                    let dateStr = `${calculatedYear}-${monthNumStr}-${dayStr}`;

                                    let holidayLabel = holidaysMap[dateStr];
                                    
                                    if (holidayLabel) {
                                        style += ' background:rgba(239, 68, 68, 0.12); color:var(--color-danger); border:1px solid var(--color-danger);';
                                        content = `<strong>${escHtml(holidayLabel)}</strong>`;
                                    } else if (!text || text.match(/^PDA/i)) { 
                                        if (pdaDateMap[dateStr]) {
                                            let pdaInfo = pdaDateMap[dateStr];
                                            style += ' background:rgba(30, 144, 255, 0.12); color:var(--color-azul-tecnologico); border:1px solid var(--color-azul-tecnologico);';
                                            content = `<strong>PDA ${pdaInfo.pda_number}</strong><br><span style="font-size:9px; color:var(--text-secondary); line-height:1.2; display:block; margin-top:2px;">${escHtml(pdaInfo.topic)}</span>`;
                                        } else {
                                            content = '';
                                        }
                                    } else if (text) {
                                        if (text.includes('CTE')) {
                                            style += ' background:rgba(201, 166, 70, 0.12); color:var(--color-dorado); border:1px solid var(--color-dorado);';
                                        } else if (text.includes('CALIFICACIONES') || text.includes('ENTREGA') || text.includes('EVALUACIÓN')) {
                                            style += ' background:rgba(34, 197, 94, 0.12); color:var(--color-success); border:1px solid var(--color-success);';
                                        } else {
                                            style += ' background:rgba(59, 130, 246, 0.12); color:var(--color-info); border:1px solid var(--color-info);';
                                        }
                                    }
                                }
                            }
                            html += `<td${colspanAttr}${rowspanAttr} style="${style}">${content}</td>`;
                        }
                        currentCol += (cell.colspan || 1);
                    });
                    html += `</tr>`;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                </div>`;
            });
            
            html += `</div>`;
        });

        return html;
    }

    function switchMoment(momentIdx, btn) {
        document.querySelectorAll('.moment-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.tabs-header .tab-btn').forEach(el => {
            el.classList.remove('btn-primary');
            el.classList.add('btn-secondary');
        });
        
        document.getElementById('moment-' + momentIdx).style.display = 'block';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
    }

    function changeCycle(id) {
        _selectedCycleId   = parseInt(id);
        _selectedSubjectId = null;
        const subjects = getSubjects().filter(s=>s.cycle_id==_selectedCycleId);
        if(subjects.length) _selectedSubjectId = subjects[0].id;
        document.getElementById('main-content').innerHTML = render();
    }

    function changeSubject(id) {
        _selectedSubjectId = parseInt(id);
        const cal = document.getElementById('calendar-container');
        if(cal) cal.innerHTML = _renderCalendar();
    }

    return { render, init, changeCycle, changeSubject, switchMoment };
})();
