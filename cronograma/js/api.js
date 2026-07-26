'use strict';
/**
 * api.js — Capa de datos
 * Abstrae todas las queries SQL usando dbQuery / dbRun de db.js
 * y los algoritmos de helpers.js
 */

// ──────────────────────────────────────────
//  CICLOS ESCOLARES
// ──────────────────────────────────────────

function getCycles() {
    return dbQuery("SELECT * FROM school_cycles ORDER BY start_date DESC");
}

function getCycle(id) {
    return dbQuery("SELECT * FROM school_cycles WHERE id=?", [id])[0] || null;
}

async function saveCycle(data) {
    const { id, name, start_date, end_date, total_days, period1_days, period2_days, period3_days } = data;
    if(id) {
        await dbRun(
            `UPDATE school_cycles SET name=?,start_date=?,end_date=?,total_days=?,period1_days=?,period2_days=?,period3_days=? WHERE id=?`,
            [name, start_date, end_date||null, total_days, period1_days, period2_days, period3_days, id]
        );
        return id;
    } else {
        return await dbRun(
            `INSERT INTO school_cycles(name,start_date,end_date,total_days,period1_days,period2_days,period3_days,holidays) VALUES(?,?,?,?,?,?,?,?)`,
            [name, start_date, end_date||null, total_days, period1_days, period2_days, period3_days, '{}']
        );
    }
}

async function deleteCycle(id) {
    await dbRun("DELETE FROM school_cycles WHERE id=?", [id]);
}

// ──────────────────────────────────────────
//  FESTIVOS (holidays en school_cycles)
// ──────────────────────────────────────────

function getHolidaysMap(cycleId) {
    const cycle = getCycle(cycleId);
    if(!cycle) return {};
    const { map } = parseHolidays(cycle.holidays);
    return map;
}

async function addHoliday(cycleId, date, label) {
    const cycle = getCycle(cycleId);
    const { map } = parseHolidays(cycle?.holidays);
    map[date] = label || 'Suspensión de labores';
    await dbRun("UPDATE school_cycles SET holidays=? WHERE id=?", [JSON.stringify(map), cycleId]);
}

async function updateHoliday(cycleId, date, label) {
    await addHoliday(cycleId, date, label);
}

async function removeHoliday(cycleId, date) {
    const cycle = getCycle(cycleId);
    const { map } = parseHolidays(cycle?.holidays);
    delete map[date];
    await dbRun("UPDATE school_cycles SET holidays=? WHERE id=?", [JSON.stringify(map), cycleId]);
}

// ──────────────────────────────────────────
//  PERÍODOS INHÁBILES PERSONALIZADOS
// ──────────────────────────────────────────

function getCustomHolidays(cycleId) {
    return dbQuery("SELECT * FROM custom_holidays WHERE cycle_id=? ORDER BY start_date ASC", [cycleId]);
}

async function addCustomHoliday(cycleId, startDate, endDate, label) {
    return await dbRun(
        "INSERT INTO custom_holidays(cycle_id,start_date,end_date,label) VALUES(?,?,?,?)",
        [cycleId, startDate, endDate, label]
    );
}

async function updateCustomHoliday(id, startDate, endDate, label) {
    await dbRun("UPDATE custom_holidays SET start_date=?,end_date=?,label=? WHERE id=?", [startDate, endDate, label, id]);
}

async function deleteCustomHoliday(id) {
    await dbRun("DELETE FROM custom_holidays WHERE id=?", [id]);
}

/** Obtiene un Set de todas las fechas inhábiles (festivos + períodos custom) para un ciclo */
function getAllHolidayDates(cycleId) {
    const cycle = getCycle(cycleId);
    if(!cycle) return new Set();
    const { dates } = parseHolidays(cycle.holidays);
    const customRows = getCustomHolidays(cycleId);
    const customDates = customRows.flatMap(r => expandDateRange(r.start_date, r.end_date));
    return new Set([...dates, ...customDates]);
}

/** Mapa completo {fecha: etiqueta} de todos los días inhábiles */
function getAllHolidaysMap(cycleId) {
    const cycle = getCycle(cycleId);
    if(!cycle) return {};
    const { map } = parseHolidays(cycle.holidays);
    const customRows = getCustomHolidays(cycleId);
    customRows.forEach(r => {
        expandDateRange(r.start_date, r.end_date).forEach(d => { map[d] = r.label; });
    });
    return map;
}

// ──────────────────────────────────────────
//  MATERIAS
// ──────────────────────────────────────────

function getSubjects() {
    return dbQuery(`
        SELECT s.*, c.name as cycle_name, c.start_date as cycle_start_date
        FROM subjects s
        JOIN school_cycles c ON s.cycle_id = c.id
        ORDER BY s.name ASC
    `);
}

function getSubject(id) {
    const rows = dbQuery(`
        SELECT s.*, c.name as cycle_name, c.start_date as cycle_start_date,
               c.end_date as cycle_end_date, c.total_days, c.period1_days, c.period2_days,
               c.period3_days, c.holidays
        FROM subjects s
        JOIN school_cycles c ON s.cycle_id = c.id
        WHERE s.id=?
    `, [id]);
    return rows[0] || null;
}

async function saveSubject(data) {
    const { id, cycle_id, name, weekly_hours, schedule, total_pdas } = data;
    const schedJson = typeof schedule === 'string' ? schedule : JSON.stringify(schedule);
    if(id) {
        await dbRun(
            `UPDATE subjects SET cycle_id=?,name=?,weekly_hours=?,schedule=?,total_pdas=? WHERE id=?`,
            [cycle_id, name, weekly_hours, schedJson, total_pdas, id]
        );
        _syncPdas(id, total_pdas);
        return id;
    } else {
        const newId = await dbRun(
            `INSERT INTO subjects(cycle_id,name,weekly_hours,schedule,total_pdas) VALUES(?,?,?,?,?)`,
            [cycle_id, name, weekly_hours, schedJson, total_pdas]
        );
        _syncPdas(newId, total_pdas);
        return newId;
    }
}

/** Sincronizar filas de PDAs con total_pdas */
async function _syncPdas(subjectId, totalPdas) {
    const existing = dbQuery("SELECT pda_number FROM pdas WHERE subject_id=? ORDER BY pda_number", [subjectId]);
    const existNums = new Set(existing.map(r => r.pda_number));
    for(let i=1; i<=totalPdas; i++) {
        if(!existNums.has(i)) {
            await dbRun(
                "INSERT INTO pdas(subject_id,pda_number,topic) VALUES(?,?,?)",
                [subjectId, i, `Proceso de Desarrollo de Aprendizaje (PDA) ${i}`]
            );
        }
    }
    // Eliminar PDAs excedentes
    await dbRun("DELETE FROM pdas WHERE subject_id=? AND pda_number>?", [subjectId, totalPdas]);
}

async function deleteSubject(id) {
    await dbRun("DELETE FROM subjects WHERE id=?", [id]);
}

// ──────────────────────────────────────────
//  PDAs
// ──────────────────────────────────────────

function getPdas(subjectId) {
    return dbQuery("SELECT * FROM pdas WHERE subject_id=? ORDER BY pda_number ASC", [subjectId]);
}

async function savePda(subjectId, pdaNumber, topic, sessionsCount, startDateOverride) {
    const sc  = (sessionsCount !== null && sessionsCount !== '' && sessionsCount !== undefined) ? parseInt(sessionsCount) : null;
    const sdo = (startDateOverride && /^\d{4}-\d{2}-\d{2}$/.test(startDateOverride)) ? startDateOverride : null;
    await dbRun(
        "UPDATE pdas SET topic=?,sessions_count=?,start_date_override=? WHERE subject_id=? AND pda_number=?",
        [topic, sc, sdo, subjectId, pdaNumber]
    );
}

// ──────────────────────────────────────────
//  DISTRIBUCIÓN DE PDAs (cálculo completo)
// ──────────────────────────────────────────

/**
 * Calcula la distribución completa de PDAs para una materia.
 * Combina getCycle, getSchoolDays, getSubjectSessions y calculatePdaDistribution.
 */
function getPdaDistribution(subjectId) {
    const subj = getSubject(subjectId);
    if(!subj) return { sessions:[], distribution:[] };

    const cycle = getCycle(subj.cycle_id);
    if(!cycle) return { sessions:[], distribution:[] };

    const holidayDates = Array.from(getAllHolidayDates(subj.cycle_id));
    const schoolDays   = getSchoolDays(cycle.start_date, cycle.total_days, holidayDates);
    const schedule     = typeof subj.schedule === 'string' ? JSON.parse(subj.schedule) : subj.schedule;
    const sessions     = getSubjectSessions(schoolDays, schedule, cycle.period1_days, cycle.period2_days);
    const savedPdas    = getPdas(subjectId);
    const distribution = calculatePdaDistribution(sessions, subj.total_pdas, savedPdas);

    return { sessions, distribution, cycle, subj };
}

// ──────────────────────────────────────────
//  ESTADÍSTICAS GENERALES
// ──────────────────────────────────────────

function getStats() {
    const cycles   = dbQuery("SELECT COUNT(*) as c FROM school_cycles")[0]?.c ?? 0;
    const subjects = dbQuery("SELECT COUNT(*) as c FROM subjects")[0]?.c ?? 0;
    const pdas     = dbQuery("SELECT SUM(total_pdas) as s FROM subjects")[0]?.s ?? 0;
    return { cycles, subjects, pdas };
}

// ──────────────────────────────────────────
//  MAPA FECHA → PDA (para cronograma grid)
// ──────────────────────────────────────────

/**
 * Genera el mapa {date: {pda_number, topic}} para una materia.
 */
function getSubjectDateMap(subjectId) {
    const { distribution } = getPdaDistribution(subjectId);
    const map = {};
    distribution.forEach(pda => {
        pda.sessions.forEach(s => {
            map[s.date] = { pda_number: pda.pda_number, topic: pda.topic };
        });
    });
    return map;
}
