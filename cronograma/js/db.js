'use strict';
/**
 * db.js — Capa de base de datos
 * sql.js (SQLite WASM) + persistencia en IndexedDB
 */

const DB_IDB_NAME    = 'jokarhe-cronograma';
const DB_IDB_VERSION = 1;
const DB_IDB_STORE   = 'sqlite';
const DB_IDB_KEY     = 'db';

let _db  = null;
let _SQL = null;

async function initDB() {
    _SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    const savedData = await _loadFromIndexedDB();
    if (savedData) {
        _db = new _SQL.Database(savedData);
    } else {
        _db = new _SQL.Database();
        _initSchema();
        _seedData();
        await _saveToIndexedDB();
    }
    _runMigrations();
    return _db;
}

function _initSchema() {
    _db.run(`CREATE TABLE IF NOT EXISTS school_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        total_days INTEGER NOT NULL DEFAULT 190,
        period1_days INTEGER NOT NULL DEFAULT 63,
        period2_days INTEGER NOT NULL DEFAULT 63,
        period3_days INTEGER NOT NULL DEFAULT 64,
        holidays TEXT DEFAULT '{}'
    );`);
    _db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        weekly_hours INTEGER NOT NULL,
        schedule TEXT NOT NULL,
        total_pdas INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (cycle_id) REFERENCES school_cycles(id) ON DELETE CASCADE
    );`);
    _db.run(`CREATE TABLE IF NOT EXISTS pdas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        pda_number INTEGER NOT NULL,
        topic TEXT NOT NULL,
        sessions_count INTEGER DEFAULT NULL,
        start_date_override TEXT DEFAULT NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );`);
    _db.run(`CREATE TABLE IF NOT EXISTS custom_holidays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        label TEXT NOT NULL,
        FOREIGN KEY (cycle_id) REFERENCES school_cycles(id) ON DELETE CASCADE
    );`);
}

function _runMigrations() {
    const t = sql => { try { _db.run(sql); } catch(e) {} };
    t("ALTER TABLE pdas ADD COLUMN sessions_count INTEGER DEFAULT NULL;");
    t("ALTER TABLE pdas ADD COLUMN start_date_override TEXT DEFAULT NULL;");
    t("ALTER TABLE school_cycles ADD COLUMN end_date TEXT;");
}

function _seedData() {
    const h = {"2026-09-16":"Independencia de México","2026-11-02":"Día de Muertos","2026-11-16":"Revolución Mexicana","2026-12-21":"Vacaciones de Invierno","2026-12-22":"Vacaciones de Invierno","2026-12-23":"Vacaciones de Invierno","2026-12-24":"Vacaciones de Invierno","2026-12-25":"Navidad","2026-12-28":"Vacaciones de Invierno","2026-12-29":"Vacaciones de Invierno","2026-12-30":"Vacaciones de Invierno","2026-12-31":"Fin de Año","2027-01-01":"Año Nuevo","2027-01-04":"Vacaciones de Invierno","2027-01-05":"Vacaciones de Invierno","2027-01-06":"Vacaciones de Invierno","2027-01-07":"Vacaciones de Invierno","2027-01-08":"Vacaciones de Invierno","2027-02-01":"Día de la Constitución","2027-03-15":"Natalicio de Benito Juárez","2027-03-22":"Semana Santa","2027-03-23":"Semana Santa","2027-03-24":"Semana Santa","2027-03-25":"Semana Santa","2027-03-26":"Semana Santa","2027-03-29":"Semana Santa","2027-03-30":"Semana Santa","2027-03-31":"Semana Santa","2027-04-01":"Semana Santa","2027-04-02":"Semana Santa","2027-05-01":"Día del Trabajo","2027-05-05":"Batalla de Puebla","2027-05-15":"Día del Maestro"};
    _db.run(`INSERT INTO school_cycles(name,start_date,end_date,total_days,period1_days,period2_days,period3_days,holidays) VALUES(?,?,?,?,?,?,?,?)`,["Ciclo Escolar 2026-2027","2026-08-24","2027-08-13",190,63,63,64,JSON.stringify(h)]);
    const cid = _lastInsertId();
    _db.run(`INSERT INTO subjects(cycle_id,name,weekly_hours,schedule,total_pdas) VALUES(?,?,?,?,?)`,[cid,"Español 1",4,JSON.stringify({1:1,2:1,3:1,4:1,5:0}),12]);
    const sid = _lastInsertId();
    for(let i=1;i<=12;i++) _db.run(`INSERT INTO pdas(subject_id,pda_number,topic) VALUES(?,?,?)`,[sid,i,`Proceso de Desarrollo de Aprendizaje (PDA) ${i}`]);
}

function dbQuery(sql, params=[]) {
    const stmt = _db.prepare(sql);
    stmt.bind(params);
    const r = [];
    while(stmt.step()) r.push(stmt.getAsObject());
    stmt.free();
    return r;
}

async function dbRun(sql, params=[]) {
    _db.run(sql, params);
    const id = _lastInsertId();
    await _saveToIndexedDB();
    return id;
}

function _lastInsertId() {
    try { return _db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] ?? null; }
    catch(e) { return null; }
}

function _loadFromIndexedDB() {
    return new Promise(resolve => {
        const req = indexedDB.open(DB_IDB_NAME, DB_IDB_VERSION);
        req.onupgradeneeded = e => e.target.result.createObjectStore(DB_IDB_STORE);
        req.onsuccess = e => {
            const idb = e.target.result;
            const get = idb.transaction(DB_IDB_STORE,'readonly').objectStore(DB_IDB_STORE).get(DB_IDB_KEY);
            get.onsuccess = () => resolve(get.result ? new Uint8Array(get.result) : null);
            get.onerror   = () => resolve(null);
        };
        req.onerror = () => resolve(null);
    });
}

function _saveToIndexedDB() {
    return new Promise((resolve, reject) => {
        const data = _db.export();
        const req  = indexedDB.open(DB_IDB_NAME, DB_IDB_VERSION);
        req.onupgradeneeded = e => e.target.result.createObjectStore(DB_IDB_STORE);
        req.onsuccess = e => {
            const tx = e.target.result.transaction(DB_IDB_STORE,'readwrite');
            tx.objectStore(DB_IDB_STORE).put(data.buffer, DB_IDB_KEY);
            tx.oncomplete = resolve;
            tx.onerror    = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
    });
}

function exportDatabase() {
    const data = _db.export();
    const url  = URL.createObjectURL(new Blob([data],{type:'application/octet-stream'}));
    const a    = Object.assign(document.createElement('a'),{href:url,download:`cronograma-${new Date().toISOString().split('T')[0]}.sqlite`});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function importDatabase(file) {
    const buf = await file.arrayBuffer();
    _db = new _SQL.Database(new Uint8Array(buf));
    _runMigrations();
    await _saveToIndexedDB();
}

async function resetDatabase() {
    _db = new _SQL.Database();
    _initSchema(); _seedData();
    await _saveToIndexedDB();
}
