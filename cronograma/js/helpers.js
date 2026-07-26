'use strict';
/**
 * helpers.js — Algoritmos de cálculo del ciclo escolar, sesiones y distribución de PDAs
 * Traducción directa de helpers.php a JavaScript puro.
 */

// ─────────────────────────────────────────────
//  Constantes de fecha
// ─────────────────────────────────────────────

const DAYS_ES   = {0:'Domingo',1:'Lunes',2:'Martes',3:'Miércoles',4:'Jueves',5:'Viernes',6:'Sábado'};
const MONTHS_ES = {0:'Enero',1:'Febrero',2:'Marzo',3:'Abril',4:'Mayo',5:'Junio',6:'Julio',7:'Agosto',8:'Septiembre',9:'Octubre',10:'Noviembre',11:'Diciembre'};
const MONTHS_SHORT = {0:'Ene',1:'Feb',2:'Mar',3:'Abr',4:'May',5:'Jun',6:'Jul',7:'Ago',8:'Sep',9:'Oct',10:'Nov',11:'Dic'};

// ─────────────────────────────────────────────
//  Utilidades de fecha
// ─────────────────────────────────────────────

/** Parsear 'YYYY-MM-DD' sin desfase de zona horaria */
function parseDate(str) {
    if(!str) return null;
    const [y,m,d] = str.split('-').map(Number);
    return new Date(y, m-1, d);
}

/** Formatear fecha al español: "Lunes 24/Ago/2026" o "Lunes, 24 de Agosto de 2026" */
function formatDateSpanish(dateStr, short=false) {
    if(!dateStr) return 'N/A';
    const d = parseDate(dateStr);
    if(!d) return 'N/A';
    const dayName   = DAYS_ES[d.getDay()];
    const dayNum    = d.getDate();
    const monthName = short ? MONTHS_SHORT[d.getMonth()] : MONTHS_ES[d.getMonth()];
    const year      = d.getFullYear();
    return short
        ? `${dayName} ${dayNum}/${monthName}/${year}`
        : `${dayName}, ${dayNum} de ${monthName} de ${year}`;
}

/** Retorna string 'YYYY-MM-DD' de un objeto Date */
function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
}

/** PHP date('N') equivalente: Lunes=1 … Domingo=7 */
function phpDayOfWeek(date) {
    const js = date.getDay(); // 0=Dom
    return js === 0 ? 7 : js;
}

// ─────────────────────────────────────────────
//  Fechas de períodos inhábiles personalizados
// ─────────────────────────────────────────────

/** Genera array plano de fechas YYYY-MM-DD para un rango [start, end] */
function expandDateRange(startStr, endStr) {
    const dates = [];
    const cur = parseDate(startStr);
    const end = parseDate(endStr);
    if(!cur || !end) return dates;
    while(cur <= end) {
        dates.push(toDateStr(cur));
        cur.setDate(cur.getDate()+1);
    }
    return dates;
}

/**
 * Aplana un objeto de festivos (asociativo {fecha: etiqueta} o array [fecha, ...])
 * al array plano de fechas y al mapa {fecha: etiqueta}.
 */
function parseHolidays(holidaysRaw) {
    const dates = [];
    const map   = {};
    if(!holidaysRaw) return {dates, map};

    let parsed = holidaysRaw;
    if(typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch(e) { return {dates,map}; }
    }

    if(Array.isArray(parsed)) {
        parsed.forEach(v => { dates.push(v); map[v] = 'Suspensión de labores'; });
    } else if(typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k,v]) => {
            dates.push(k); map[k] = v || 'Suspensión de labores';
        });
    }
    return {dates, map};
}

// ─────────────────────────────────────────────
//  Días hábiles del ciclo escolar
// ─────────────────────────────────────────────

/**
 * Genera la lista de fechas de días hábiles de clase (L–V sin festivos).
 * @param {string} startDate  YYYY-MM-DD
 * @param {number} totalDays  190 usualmente
 * @param {string[]} holidays Fechas inhábiles
 * @returns {string[]} Array de YYYY-MM-DD
 */
function getSchoolDays(startDate, totalDays, holidays=[]) {
    const days    = [];
    const cur     = parseDate(startDate);
    const hSet    = new Set(holidays);
    let count     = 0;
    const maxIter = totalDays * 4;
    let iter      = 0;

    while(count < totalDays && iter < maxIter) {
        iter++;
        const day  = cur.getDay();
        const dStr = toDateStr(cur);
        if(day !== 0 && day !== 6 && !hSet.has(dStr)) {
            days.push(dStr);
            count++;
        }
        cur.setDate(cur.getDate()+1);
    }
    return days;
}

// ─────────────────────────────────────────────
//  Sesiones de una materia
// ─────────────────────────────────────────────

/**
 * Mapea sesiones de una materia según su horario semanal.
 * @param {string[]} schoolDays  Días hábiles
 * @param {Object}   schedule    {1:h, 2:h, 3:h, 4:h, 5:h} (1=Lun…5=Vie)
 * @param {number}   p1Days
 * @param {number}   p2Days
 * @returns {Object[]} Array de sesiones
 */
function getSubjectSessions(schoolDays, schedule, p1Days, p2Days) {
    const sessions   = [];
    const p1End      = p1Days - 1;
    const p2End      = p1Days + p2Days - 1;
    let sessionNum   = 1;

    schoolDays.forEach((dateStr, index) => {
        const d   = parseDate(dateStr);
        const dow = phpDayOfWeek(d);
        const sch = schedule[dow] ?? schedule[String(dow)];
        if(sch && parseInt(sch) > 0) {
            const hours  = parseInt(sch);
            const period = index > p2End ? 3 : index > p1End ? 2 : 1;
            for(let h=0; h<hours; h++) {
                sessions.push({ session_number: sessionNum++, date: dateStr, day_of_week: dow, period });
            }
        }
    });
    return sessions;
}

// ─────────────────────────────────────────────
//  Distribución de PDAs
// ─────────────────────────────────────────────

/**
 * Distribuye sesiones entre los PDAs de una materia respetando overrides.
 * @param {Object[]} sessions   Resultado de getSubjectSessions
 * @param {number}   totalPDAs
 * @param {Object[]} savedPdas  Rows de la BD con pda_number, topic, sessions_count, start_date_override
 */
function calculatePdaDistribution(sessions, totalPDAs, savedPdas=[]) {
    const totalSessions = sessions.length;
    if(!totalSessions || !totalPDAs) return [];

    // Mapas de datos guardados
    const topics    = {};
    const counts    = {};
    const overrides = {};
    savedPdas.forEach(r => {
        topics   [r.pda_number] = r.topic;
        counts   [r.pda_number] = r.sessions_count;
        overrides[r.pda_number] = r.start_date_override;
    });

    // Mapa fecha → primer índice de sesión
    const dateIdx = {};
    sessions.forEach((s,i) => { if(dateIdx[s.date]===undefined) dateIdx[s.date] = i; });

    // Sesiones base por PDA
    const base = Math.floor(totalSessions / totalPDAs);
    const rem  = totalSessions % totalPDAs;
    const pdaCounts = {};
    for(let i=1; i<=totalPDAs; i++) {
        const c = counts[i];
        pdaCounts[i] = (c !== null && c !== undefined && c !== '') ? parseInt(c) : base + (i<=rem ? 1 : 0);
    }

    // Distribución con cascade override
    const dist     = [];
    let   cursor   = 0;

    for(let i=1; i<=totalPDAs; i++) {
        const topic    = topics[i] || `Proceso de Desarrollo de Aprendizaje (PDA) ${i}`;
        const override = overrides[i] || null;

        let startIdx = cursor;

        if(override) {
            let anchor = dateIdx[override];
            if(anchor === undefined) {
                const ovDt = parseDate(override);
                for(let j=0; j<sessions.length; j++) {
                    if(parseDate(sessions[j].date) >= ovDt) { anchor = j; break; }
                }
            }
            if(anchor !== undefined && anchor >= 0 && anchor < totalSessions) {
                if(anchor !== cursor && dist.length > 0) {
                    const prev      = dist[dist.length-1];
                    const pStartIdx = prev._si;
                    const pCount    = anchor - pStartIdx;
                    if(pCount >= 0) {
                        const pEndIdx = Math.min(pStartIdx+pCount-1, totalSessions-1);
                        prev.sessions_count = pCount;
                        prev.sessions       = sessions.slice(pStartIdx, pStartIdx+pCount);
                        if(pCount > 0) {
                            prev.end_date   = sessions[pEndIdx].date;
                            prev.end_period = sessions[pEndIdx].period;
                        }
                    }
                }
                startIdx = anchor;
            }
        }

        cursor = startIdx;
        const cnt = pdaCounts[i];

        if(cnt > 0 && cursor < totalSessions) {
            const ss   = sessions[cursor];
            const eidx = Math.min(cursor+cnt-1, totalSessions-1);
            const se   = sessions[eidx];
            dist.push({
                pda_number:          i,
                topic,
                sessions_count:      cnt,
                start_date:          ss.date,
                end_date:            se.date,
                start_period:        ss.period,
                end_period:          se.period,
                sessions:            sessions.slice(cursor, cursor+cnt),
                start_date_override: override,
                _si:                 cursor
            });
            cursor += cnt;
        } else {
            dist.push({
                pda_number:          i,
                topic,
                sessions_count:      0,
                start_date:          null,
                end_date:            null,
                start_period:        null,
                end_period:          null,
                sessions:            [],
                start_date_override: override,
                _si:                 cursor
            });
        }
    }

    dist.forEach(d => delete d._si);
    return dist;
}

// ─────────────────────────────────────────────
//  Mapa de días de la semana por mes
// ─────────────────────────────────────────────

/**
 * Retorna los días hábiles de un mes con su número de día y letra (L/M/M/J/V).
 */
function getMonthWorkdays(year, month) { // month: 0-11
    const days    = [];
    const letters = {1:'L',2:'M',3:'M',4:'J',5:'V'};
    const date    = new Date(year, month, 1);
    while(date.getMonth() === month) {
        const dow = date.getDay();
        if(dow >= 1 && dow <= 5) {
            days.push({ date: toDateStr(date), num: date.getDate(), letter: letters[dow] });
        }
        date.setDate(date.getDate()+1);
    }
    return days;
}

/**
 * Genera la secuencia de meses del ciclo escolar (Ago–Jul).
 */
function getCycleMonths(startDateStr) {
    const start  = parseDate(startDateStr);
    const months = [];
    const cur    = new Date(start.getFullYear(), start.getMonth(), 1);
    for(let i=0; i<12; i++) {
        months.push({ year: cur.getFullYear(), month: cur.getMonth() });
        cur.setMonth(cur.getMonth()+1);
    }
    return months;
}
