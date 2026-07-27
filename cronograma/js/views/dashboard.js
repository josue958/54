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
        <div class="dashboard-page">
            <!-- Widgets stats -->
            <div class="stats-row" style="margin-bottom:24px">
                <div class="stat-card">
                    <div class="stat-icon">🗓️</div>
                    <div class="stat-details"><span class="stat-value">${stats.cycles}</span><span class="stat-label">Ciclos</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📚</div>
                    <div class="stat-details"><span class="stat-value">${stats.subjects}</span><span class="stat-label">Materias</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-details"><span class="stat-value">${stats.pdas}</span><span class="stat-label">PDAs Totales</span></div>
                </div>
            </div>

            <!-- Filtros -->
            <div class="card" style="margin-bottom:20px">
                <div class="filter-row">
                    <div class="form-group" style="margin:0;flex:1">
                        <label class="form-label">Ciclo Escolar</label>
                        <select id="dash-cycle-sel" class="form-control" onchange="DashboardView.changeCycle(this.value)">
                            ${cycles.map(c=>`<option value="${c.id}" ${_selectedCycleId==c.id?'selected':''}>${escHtml(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0;flex:2">
                        <label class="form-label">Materia</label>
                        <select id="dash-subj-sel" class="form-control" onchange="DashboardView.changeSubject(this.value)">
                            ${cycleSubjects.length
                                ? cycleSubjects.map((s,i)=>`<option value="${s.id}" ${_selectedSubjectId==s.id?'selected':''}>${escHtml(s.name)}</option>`).join('')
                                : '<option value="">Sin materias en este ciclo</option>'}
                        </select>
                    </div>
                    ${_selectedSubjectId ? `
                    <div class="form-group" style="margin:0; display:flex; align-items:flex-end">
                        <button class="btn btn-primary" onclick="ExcelExport.exportarCronograma(${_selectedCycleId}, ${_selectedSubjectId})" style="height:38px">
                            <span class="nav-icon">📊</span> Exportar Excel
                        </button>
                    </div>` : ''}
                </div>
            </div>

            <!-- Cronograma grid -->
            <div id="calendar-container">
                ${_selectedSubjectId ? _renderCalendar() : `<div class="placeholder-panel"><div class="placeholder-icon">📅</div>
                    <h3>Selecciona una materia</h3><p>El cronograma aparecerá aquí.</p></div>`}
            </div>
        </div>`;
    }

    function _renderCalendar() {
        if(!_selectedSubjectId || !_selectedCycleId) return '';

        const cycle = getCycle(_selectedCycleId);
        if(!cycle) return '';

        const { distribution, sessions } = getPdaDistribution(_selectedSubjectId);
        const holidaysMap = getAllHolidaysMap(_selectedCycleId);

        // Mapa rápido fecha → pda
        const dateMap = {};
        distribution.forEach(pda => {
            pda.sessions.forEach(s => { dateMap[s.date] = pda.pda_number; });
        });

        // Colores por PDA
        const pdaColors = {};
        distribution.forEach((pda,i) => { pdaColors[pda.pda_number] = subjectColor(i); });

        // Leyenda de PDAs
        const legend = distribution.filter(p=>p.sessions_count>0).map(pda => `
            <div class="legend-item">
                <span class="legend-dot" style="background:${pdaColors[pda.pda_number]}"></span>
                <span>PDA ${pda.pda_number}</span>
                <span class="text-muted" style="font-size:10px">(${pda.sessions_count} ses.)</span>
            </div>`).join('');

        // Meses del ciclo
        const cycleMonths = getCycleMonths(cycle.start_date);

        let html = `
        <div class="calendar-wrapper">
            <div class="calendar-legend">${legend}
                <div class="legend-item"><span class="legend-dot" style="background:var(--color-danger)"></span><span>Inhábil</span></div>
            </div>
            <div class="calendar-scroll">`;

        cycleMonths.forEach(({year, month}) => {
            const workdays = getMonthWorkdays(year, month);
            if(!workdays.length) return;

            html += `<div class="cal-month">
                <div class="cal-month-title">${MONTHS_ES[month].toUpperCase()} ${year}</div>
                <div class="cal-days-row">`;

            workdays.forEach(({date, num, letter}) => {
                const pdaNum   = dateMap[date];
                const isHoliday = !!holidaysMap[date];
                let cellClass  = 'cal-day';
                let cellStyle  = '';
                let cellTitle  = date;
                let content    = `<div class="cal-day-letter">${letter}</div><div class="cal-day-num">${num}</div>`;

                if(isHoliday) {
                    cellClass += ' cal-day-holiday';
                    cellTitle  = `${date} — ${holidaysMap[date]}`;
                    content    += `<div class="cal-day-label">${escHtml(holidaysMap[date]).substring(0,8)}</div>`;
                } else if(pdaNum) {
                    const col = pdaColors[pdaNum] || '#1e90ff';
                    cellStyle = `background:${col}22;border-bottom:3px solid ${col}`;
                    cellTitle = `${date} — PDA ${pdaNum}`;
                    content  += `<div class="cal-day-pda" style="color:${col}">P${pdaNum}</div>`;
                }

                html += `<div class="${cellClass}" style="${cellStyle}" title="${escHtml(cellTitle)}">${content}</div>`;
            });

            html += `</div></div>`;
        });

        html += `</div></div>`;
        return html;
    }

    function init() {
        // no listeners needed beyond inline events
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

    return { render, init, changeCycle, changeSubject };
})();
