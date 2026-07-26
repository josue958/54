<?php
/**
 * db.php
 * Conexión a la base de datos SQLite y creación de esquema.
 */

// Asegurar que el directorio de la base de datos existe
$dbDir = __DIR__ . '/database';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0777, true);
}

$dbPath = $dbDir . '/db.sqlite';

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Habilitar claves foráneas
    $pdo->exec("PRAGMA foreign_keys = ON;");

    // Crear tabla de Ciclos Escolares
    $pdo->exec("CREATE TABLE IF NOT EXISTS school_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL, -- YYYY-MM-DD
        end_date TEXT, -- YYYY-MM-DD
        total_days INTEGER NOT NULL DEFAULT 190,
        period1_days INTEGER NOT NULL DEFAULT 63,
        period2_days INTEGER NOT NULL DEFAULT 63,
        period3_days INTEGER NOT NULL DEFAULT 64,
        holidays TEXT -- JSON array of dates ['YYYY-MM-DD']
    );");

    // Ejecutar migración por si la tabla ya existe
    try {
        $pdo->exec("ALTER TABLE school_cycles ADD COLUMN end_date TEXT;");
    } catch (PDOException $e) {
        // Ignorar si la columna ya existe
    }

    // Crear tabla de Materias
    $pdo->exec("CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        weekly_hours INTEGER NOT NULL, -- 1 a 8 horas
        schedule TEXT NOT NULL, -- JSON string de horarios, ej: {'1':1, '3':2, '5':1} (1=Lun, 5=Vie)
        total_pdas INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (cycle_id) REFERENCES school_cycles(id) ON DELETE CASCADE
    );");

    // Crear tabla de PDAs (opcional para personalizar nombres de los PDAs)
    $pdo->exec("CREATE TABLE IF NOT EXISTS pdas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        pda_number INTEGER NOT NULL,
        topic TEXT NOT NULL, -- Descripción/Nombre del PDA
        sessions_count INTEGER DEFAULT NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );");

    // Ejecutar migración por si la tabla ya existe
    try {
        $pdo->exec("ALTER TABLE pdas ADD COLUMN sessions_count INTEGER DEFAULT NULL;");
    } catch (PDOException $e) {
        // Ignorar si la columna ya existe
    }

    // Crear tabla de Períodos Inhábiles Personalizados
    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_holidays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id INTEGER NOT NULL,
        start_date TEXT NOT NULL, -- YYYY-MM-DD
        end_date TEXT NOT NULL, -- YYYY-MM-DD
        label TEXT NOT NULL, -- Etiqueta descriptiva
        FOREIGN KEY (cycle_id) REFERENCES school_cycles(id) ON DELETE CASCADE
    );");

    // Seed de ejemplo si la tabla de ciclos está vacía
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM school_cycles");
    $row = $stmt->fetch();
    if ($row['count'] == 0) {
        // Ciclo Escolar por defecto 2026-2027
        // Fecha estimada de inicio: 2026-08-24
        $defaultHolidays = json_encode([
            "2026-09-16", // Independencia
            "2026-11-02", // Día de Muertos
            "2026-11-16", // Revolución
            // Vacaciones de invierno
            "2026-12-21", "2026-12-22", "2026-12-23", "2026-12-24", "2026-12-25",
            "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01",
            "2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07", "2027-01-08",
            "2027-02-01", // Constitución
            "2027-03-15", // Natalicio Juárez
            // Semana Santa
            "2027-03-22", "2027-03-23", "2027-03-24", "2027-03-25", "2027-03-26",
            "2027-03-29", "2027-03-30", "2027-03-31", "2027-04-01", "2027-04-02",
            "2027-05-01", // Día del Trabajo
            "2027-05-05", // Batalla de Puebla
            "2027-05-15", // Día del Maestro
        ]);

        $stmtInsert = $pdo->prepare("INSERT INTO school_cycles (name, start_date, total_days, period1_days, period2_days, period3_days, holidays) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmtInsert->execute([
            "Ciclo Escolar 2026-2027",
            "2026-08-24",
            190,
            63,
            63,
            64,
            $defaultHolidays
        ]);
        
        $cycleId = $pdo->lastInsertId();

        // Materia de ejemplo
        $stmtMateria = $pdo->prepare("INSERT INTO subjects (cycle_id, name, weekly_hours, schedule, total_pdas) VALUES (?, ?, ?, ?, ?)");
        $stmtMateria->execute([
            $cycleId,
            "Español 1",
            4,
            json_encode([
                "1" => 1, // Lunes: 1h
                "2" => 1, // Martes: 1h
                "3" => 1, // Miércoles: 1h
                "4" => 1, // Jueves: 1h
                "5" => 0  // Viernes: 0h
            ]),
            12
        ]);
        
        $subjectId = $pdo->lastInsertId();

        // PDAs por defecto para la materia de ejemplo
        for ($i = 1; $i <= 12; $i++) {
            $stmtPda = $pdo->prepare("INSERT INTO pdas (subject_id, pda_number, topic) VALUES (?, ?, ?)");
            $stmtPda->execute([
                $subjectId,
                $i,
                "Proceso de Desarrollo de Aprendizaje (PDA) $i para Español 1"
            ]);
        }
    }

} catch (PDOException $e) {
    die("Error al conectar con la base de datos SQLite: " . $e->getMessage());
}
