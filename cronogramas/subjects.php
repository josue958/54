<?php
/**
 * subjects.php
 * Gestión de Asignaturas y Planificación/Cálculo de PDAs.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

$message = '';
$messageType = '';

$subjectId = $_GET['id'] ?? null;
$editSubjectId = $_GET['edit_id'] ?? null;

// Procesar formularios (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'save_subject') {
        $id = $_POST['id'] ?? null;
        $name = trim($_POST['name'] ?? '');
        $cycleId = $_POST['cycle_id'] ?? null;
        $weeklyHours = (int)($_POST['weekly_hours'] ?? 1);
        $totalPdas = (int)($_POST['total_pdas'] ?? 1);
        
        // Procesar horario semanal de lunes a viernes
        $schedule = [];
        $scheduleSum = 0;
        for ($d = 1; $d <= 5; $d++) {
            $hours = (int)($_POST["day_$d"] ?? 0);
            $schedule[$d] = $hours;
            $scheduleSum += $hours;
        }

        if (empty($name) || !$cycleId) {
            $message = "El nombre y el ciclo escolar son obligatorios.";
            $messageType = "error";
        } elseif ($weeklyHours < 1 || $weeklyHours > 8) {
            $message = "Las horas semanales deben ser de 1 a 8.";
            $messageType = "error";
        } elseif ($scheduleSum !== $weeklyHours) {
            $message = "La suma de horas asignadas en el horario semanal ($scheduleSum hs) debe coincidir exactamente con las horas semanales indicadas ($weeklyHours hs).";
            $messageType = "error";
        } else {
            try {
                $scheduleJson = json_encode($schedule);
                
                if ($id) {
                    // Editar materia existente
                    $stmt = $pdo->prepare("UPDATE subjects SET name = ?, cycle_id = ?, weekly_hours = ?, schedule = ?, total_pdas = ? WHERE id = ?");
                    $stmt->execute([$name, $cycleId, $weeklyHours, $scheduleJson, $totalPdas, $id]);
                    $subjectDbId = $id;
                    $message = "Materia actualizada correctamente.";
                } else {
                    // Crear nueva materia
                    $stmt = $pdo->prepare("INSERT INTO subjects (cycle_id, name, weekly_hours, schedule, total_pdas) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$cycleId, $name, $weeklyHours, $scheduleJson, $totalPdas]);
                    $subjectDbId = $pdo->lastInsertId();
                    $message = "Materia creada correctamente.";
                }

                // Sincronizar tabla de PDAs para mantener/actualizar la cantidad
                $stmtCheck = $pdo->prepare("SELECT COUNT(*) as count FROM pdas WHERE subject_id = ?");
                $stmtCheck->execute([$subjectDbId]);
                $currentPdaCount = $stmtCheck->fetch()['count'];

                if ($currentPdaCount < $totalPdas) {
                    $stmtInsert = $pdo->prepare("INSERT INTO pdas (subject_id, pda_number, topic) VALUES (?, ?, ?)");
                    for ($i = $currentPdaCount + 1; $i <= $totalPdas; $i++) {
                        $stmtInsert->execute([$subjectDbId, $i, "Proceso de Desarrollo de Aprendizaje (PDA) $i"]);
                    }
                } elseif ($currentPdaCount > $totalPdas) {
                    $stmtDelete = $pdo->prepare("DELETE FROM pdas WHERE subject_id = ? AND pda_number > ?");
                    $stmtDelete->execute([$subjectDbId, $totalPdas]);
                }

                $messageType = "success";
                header("Location: subjects.php?id=" . $subjectDbId . "&msg=" . urlencode($message) . "&msg_type=" . $messageType);
                exit;
            } catch (PDOException $e) {
                $message = "Error al guardar la materia: " . $e->getMessage();
                $messageType = "error";
            }
        }
    } elseif ($action === 'save_pda_topic') {
        $subjId = (int)$_POST['subject_id'];
        $pdaNumber = (int)$_POST['pda_number'];
        $topic = trim($_POST['topic'] ?? '');

        try {
            $stmtUpdate = $pdo->prepare("UPDATE pdas SET topic = ? WHERE subject_id = ? AND pda_number = ?");
            $stmtUpdate->execute([$topic, $subjId, $pdaNumber]);
            $message = "Tema del PDA $pdaNumber actualizado.";
            $messageType = "success";
        } catch (PDOException $e) {
            $message = "Error al actualizar tema: " . $e->getMessage();
            $messageType = "error";
        }
        
        // Redirigir para mantener la vista del PDA detallada
        header("Location: subjects.php?id=" . $subjId . "&msg=" . urlencode($message) . "&msg_type=" . $messageType);
        exit;
    } elseif ($action === 'delete') {
        $subjId = $_POST['subject_id'] ?? null;
        if ($subjId) {
            try {
                $stmt = $pdo->prepare("DELETE FROM subjects WHERE id = ?");
                $stmt->execute([$subjId]);
                $message = "Materia eliminada correctamente.";
                $messageType = "success";
            } catch (PDOException $e) {
                $message = "Error al eliminar materia: " . $e->getMessage();
                $messageType = "error";
            }
        }
        header("Location: subjects.php?msg=" . urlencode($message) . "&msg_type=" . $messageType);
        exit;
    }
}

// Cargar mensajes redirigidos
if (isset($_GET['msg'])) {
    $message = $_GET['msg'];
    $messageType = $_GET['msg_type'] ?? 'info';
}

// Cargar ciclos escolares para los dropdowns
$cycles = $pdo->query("SELECT * FROM school_cycles ORDER BY start_date DESC")->fetchAll();

// Cargar todas las materias con el nombre del ciclo
$subjects = $pdo->query("
    SELECT s.*, c.name as cycle_name 
    FROM subjects s 
    JOIN school_cycles c ON s.cycle_id = c.id 
    ORDER BY s.name ASC
")->fetchAll();

// Cargar materia específica a editar
$editSubject = null;
if ($editSubjectId) {
    $stmt = $pdo->prepare("SELECT * FROM subjects WHERE id = ?");
    $stmt->execute([$editSubjectId]);
    $editSubject = $stmt->fetch();
}

// Cargar materia seleccionada para ver planificación/cálculos de PDAs
$viewSubject = null;
$viewCycle = null;
$pdaDistribution = [];
$sessions = [];

if ($subjectId) {
    $stmt = $pdo->prepare("SELECT * FROM subjects WHERE id = ?");
    $stmt->execute([$subjectId]);
    $viewSubject = $stmt->fetch();

    if ($viewSubject) {
        $stmtCycle = $pdo->prepare("SELECT * FROM school_cycles WHERE id = ?");
        $stmtCycle->execute([$viewSubject['cycle_id']]);
        $viewCycle = $stmtCycle->fetch();

        if ($viewCycle) {
            // Algoritmo de cálculo
            $holidays = json_decode($viewCycle['holidays'] ?? '[]', true);
            $startYear = (int)date('Y', strtotime($viewCycle['start_date']));
            $excelOccupied = getExcelOccupiedDates($startYear);
            $holidays = array_unique(array_merge($holidays, $excelOccupied));
            
            $schoolDays = getSchoolDays($viewCycle['start_date'], $viewCycle['total_days'], $holidays);
            
            $schedule = json_decode($viewSubject['schedule'] ?? '[]', true);
            $sessions = getSubjectSessions($schoolDays, $schedule, $viewCycle['period1_days'], $viewCycle['period2_days']);
            
            $pdaDistribution = calculatePdaDistribution($sessions, $viewSubject['total_pdas'], $viewSubject['id'], $pdo);
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JOKARHE CORE — Gestión de Materias y PDAs</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        .accordion-arrow {
            transition: transform var(--transition);
        }
        .pda-item-card.expanded .accordion-arrow {
            transform: rotate(90deg);
        }
        .active-row {
            background-color: var(--bg-hover) !important;
        }
    </style>
</head>
<body>
    <div class="app-layout">
        <!-- Barra Lateral -->
        <aside class="sidebar">
            <div class="sidebar-logo">
                <div class="logo-wrapper">📋</div>
                <div class="sidebar-logo-text">
                    <h1>JOKARHE CORE</h1>
                    <span class="sub-brand">Planeador de PDAs</span>
                </div>
            </div>
            <nav class="sidebar-nav">
                <div class="nav-section">
                    <a href="cronograma.php" class="nav-item">
                        <span class="nav-item-icon">🏠</span>
                        Dashboard
                    </a>
                    <a href="cycles.php" class="nav-item">
                        <span class="nav-item-icon">📅</span>
                        Ciclos Escolares
                    </a>
                    <a href="subjects.php" class="nav-item active">
                        <span class="nav-item-icon">📚</span>
                        Materias / PDAs
                    </a>
                </div>
            </nav>
        </aside>

        <!-- Contenido Principal -->
        <main class="main-content">
            <?php if ($viewSubject && $viewCycle): ?>
                <!-- VISTA 1: Planificación y Distribución Detallada de PDAs de una Materia -->
                <header class="topbar">
                    <div style="display:flex; align-items:center; gap: 12px;">
                        <a href="subjects.php" class="btn btn-secondary btn-sm">← Volver</a>
                        <h2>Distribución de PDAs: <?php echo htmlspecialchars($viewSubject['name']); ?></h2>
                    </div>
                    <span class="badge badge-p1"><?php echo htmlspecialchars($viewCycle['name']); ?></span>
                </header>

                <div class="page-content" style="padding-bottom: 50px;">
                    <?php if (!empty($message)): ?>
                        <div class="alert alert-<?php echo htmlspecialchars($messageType); ?>">
                            <span><?php echo ($messageType === 'success') ? '✅' : '⚠️'; ?></span>
                            <?php echo htmlspecialchars($message); ?>
                        </div>
                    <?php endif; ?>

                    <!-- Tarjeta Informativa de Parámetros de Planificación -->
                    <div class="stats-grid" style="margin-bottom: 20px;">
                        <div class="stat-card">
                            <div class="stat-icon">⏰</div>
                            <div class="stat-details">
                                <span class="stat-value"><?php echo count($sessions); ?></span>
                                <span class="stat-label">Sesiones Totales en el Ciclo</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📑</div>
                            <div class="stat-details">
                                <span class="stat-value"><?php echo $viewSubject['total_pdas']; ?></span>
                                <span class="stat-label">PDAs a Cubrir</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📊</div>
                            <div class="stat-details">
                                <span class="stat-value">
                                    <?php 
                                    $avg = count($sessions) / $viewSubject['total_pdas'];
                                    echo number_format($avg, 1);
                                    ?>
                                </span>
                                <span class="stat-label">Sesiones Promedio por PDA</span>
                            </div>
                        </div>
                    </div>

                    <!-- Listado de Distribución de PDAs -->
                    <div class="card">
                        <div class="card-title">
                            <span>📅</span> Cronograma de Cobertura de PDAs
                        </div>
                        <p class="text-secondary" style="font-size: 13px; margin-top: -10px; margin-bottom: 20px;">
                            El sistema ha distribuido equitativamente las <?php echo count($sessions); ?> sesiones del ciclo escolar entre los <?php echo $viewSubject['total_pdas']; ?> PDAs. Haz clic en un PDA para personalizar su tema o ver el desglose diario de sus sesiones.
                        </p>

                        <div class="pda-timeline-list">
                            <?php foreach ($pdaDistribution as $pda): ?>
                                <?php 
                                // Determinar badge de periodo predominante
                                $periodBadge = 'badge-p1';
                                if ($pda['start_period'] == 2) $periodBadge = 'badge-p2';
                                if ($pda['start_period'] == 3) $periodBadge = 'badge-p3';
                                ?>
                                <div class="pda-item-card" id="pda-card-<?php echo $pda['pda_number']; ?>">
                                    <!-- Cabecera colapsable -->
                                    <div class="pda-item-header" onclick="togglePda(<?php echo $pda['pda_number']; ?>)">
                                        <div class="pda-meta">
                                            <div class="pda-number-badge"><?php echo $pda['pda_number']; ?></div>
                                            <div>
                                                <span class="pda-title-text"><?php echo htmlspecialchars($pda['topic']); ?></span>
                                                <div style="margin-top: 4px; display: flex; gap: 6px; align-items:center;">
                                                    <span class="badge <?php echo $periodBadge; ?> btn-sm">Periodo <?php echo $pda['start_period']; ?><?php echo ($pda['start_period'] != $pda['end_period']) ? ' al '.$pda['end_period'] : ''; ?></span>
                                                    <span class="badge badge-neutral btn-sm"><?php echo $pda['sessions_count']; ?> sesiones</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="pda-dates-info">
                                            <div class="pda-dates-text">
                                                🗓️ <?php echo formatDateSpanish($pda['start_date'], true); ?> 
                                                <strong>al</strong> 
                                                <?php echo formatDateSpanish($pda['end_date'], true); ?>
                                            </div>
                                            <span class="accordion-arrow" style="font-size: 16px;">▶</span>
                                        </div>
                                    </div>

                                    <!-- Cuerpo de información adicional y personalización -->
                                    <div class="pda-content-body" id="pda-body-<?php echo $pda['pda_number']; ?>" style="display: none;">
                                        <!-- Formulario para editar el nombre del PDA -->
                                        <form method="POST" style="display:flex; gap:8px; margin-bottom: 16px;">
                                            <input type="hidden" name="action" value="save_pda_topic">
                                            <input type="hidden" name="subject_id" value="<?php echo $viewSubject['id']; ?>">
                                            <input type="hidden" name="pda_number" value="<?php echo $pda['pda_number']; ?>">
                                            <div style="flex:1;">
                                                <input type="text" name="topic" class="form-control" placeholder="Escribe el nombre o contenido temático de este PDA..." value="<?php echo htmlspecialchars($pda['topic']); ?>" required autocomplete="off" style="padding: 8px 12px; font-size:12px;">
                                            </div>
                                            <button type="submit" class="btn btn-primary btn-sm">💾 Guardar Tema</button>
                                        </form>

                                        <!-- Desglose de sesiones -->
                                        <span class="form-label" style="display:block; margin-bottom: 8px;">Días de sesión programados:</span>
                                        <div class="session-list-grid">
                                            <?php foreach ($pda['sessions'] as $sess): ?>
                                                <?php 
                                                $sPeriodBadge = 'badge-p1';
                                                if ($sess['period'] == 2) $sPeriodBadge = 'badge-p2';
                                                if ($sess['period'] == 3) $sPeriodBadge = 'badge-p3';
                                                ?>
                                                <div class="session-pill">
                                                    <span class="session-pill-num">Sesión <?php echo $sess['session_number']; ?></span>
                                                    <span class="session-pill-date"><?php echo formatDateSpanish($sess['date'], true); ?></span>
                                                    <span class="badge <?php echo $sPeriodBadge; ?>" style="font-size: 8px; padding: 2px 6px; align-self: flex-start;">P<?php echo $sess['period']; ?></span>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

                <script>
                    function togglePda(pdaNum) {
                        const card = document.getElementById('pda-card-' + pdaNum);
                        const body = document.getElementById('pda-body-' + pdaNum);
                        
                        if (body.style.display === 'none') {
                            body.style.display = 'block';
                            card.classList.add('expanded');
                            card.querySelector('.accordion-arrow').textContent = '▼';
                        } else {
                            body.style.display = 'none';
                            card.classList.remove('expanded');
                            card.querySelector('.accordion-arrow').textContent = '▶';
                        }
                    }
                </script>

            <?php else: ?>
                <!-- VISTA 2: Listado y Creación/Edición de Materias -->
                <header class="topbar">
                    <h2>Gestión de Materias</h2>
                    <div class="topbar-actions">
                        <a href="subjects.php" class="btn btn-secondary btn-sm">➕ Nueva Materia</a>
                    </div>
                </header>

                <div class="page-content">
                    <?php if (!empty($message)): ?>
                        <div class="alert alert-<?php echo htmlspecialchars($messageType); ?>">
                            <span><?php echo ($messageType === 'success') ? '✅' : '⚠️'; ?></span>
                            <?php echo htmlspecialchars($message); ?>
                        </div>
                    <?php endif; ?>

                    <div class="grid-container">
                        <!-- Lista de Materias -->
                        <div>
                            <div class="card">
                                <div class="card-title">
                                    <span>📚</span> Materias Registradas
                                </div>
                                <?php if (empty($subjects)): ?>
                                    <div class="empty-state">
                                        <div class="empty-state-icon">📚</div>
                                        <p>No hay materias registradas. Configura una a la derecha.</p>
                                    </div>
                                <?php else: ?>
                                    <div class="table-container">
                                        <table class="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Materia</th>
                                                    <th>Ciclo Escolar</th>
                                                    <th>Horas</th>
                                                    <th>PDAs</th>
                                                    <th style="text-align: right;">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach ($subjects as $s): ?>
                                                    <tr class="<?php echo ($editSubjectId == $s['id']) ? 'active-row' : ''; ?>">
                                                        <td>
                                                            <strong>
                                                                <a href="subjects.php?id=<?php echo $s['id']; ?>" style="color:var(--color-azul-tecnologico); text-decoration:none; font-weight:700;">
                                                                    <?php echo htmlspecialchars($s['name']); ?>
                                                                </a>
                                                            </strong>
                                                        </td>
                                                        <td><span class="badge badge-neutral"><?php echo htmlspecialchars($s['cycle_name']); ?></span></td>
                                                        <td><?php echo $s['weekly_hours']; ?> hs/sem</td>
                                                        <td><span class="badge badge-p1"><?php echo $s['total_pdas']; ?> PDAs</span></td>
                                                        <td style="text-align: right;">
                                                            <div style="display: inline-flex; gap: 4px;">
                                                                <a href="subjects.php?id=<?php echo $s['id']; ?>" class="btn btn-secondary btn-sm" title="Ver Planificación / Calendario">📅 Calendario</a>
                                                                <a href="subjects.php?edit_id=<?php echo $s['id']; ?>" class="btn btn-ghost btn-sm" style="padding: 6px 8px;" title="Editar Parámetros">✏️</a>
                                                                <form method="POST" onsubmit="return confirm('¿Seguro que deseas eliminar esta materia? Se borrarán sus PDAs de forma irreversible.');" style="display:inline;">
                                                                    <input type="hidden" name="action" value="delete">
                                                                    <input type="hidden" name="subject_id" value="<?php echo $s['id']; ?>">
                                                                    <button type="submit" class="btn btn-danger btn-sm" style="padding: 6px 8px;">🗑️</button>
                                                                </form>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <!-- Formulario para crear/editar materia -->
                        <div>
                            <div class="card">
                                <div class="card-title">
                                    <span><?php echo $editSubject ? '✏️ Editar' : '➕ Crear'; ?> Asignatura</span>
                                </div>
                                <?php if (empty($cycles)): ?>
                                    <div class="alert alert-warning" style="font-size:12px;">
                                        ⚠️ <strong>Atención:</strong> Primero debes registrar al menos un <a href="cycles.php" style="color:inherit; font-weight:bold;">Ciclo Escolar</a> antes de crear una materia.
                                    </div>
                                <?php else: ?>
                                    <form method="POST">
                                        <input type="hidden" name="action" value="save_subject">
                                        <input type="hidden" name="id" value="<?php echo $editSubject['id'] ?? ''; ?>">

                                        <div class="form-group" style="margin-bottom: 12px;">
                                            <label class="form-label">Nombre de la Materia</label>
                                            <input type="text" name="name" class="form-control" placeholder="Ej. Español 1, Matemáticas 2" value="<?php echo htmlspecialchars($editSubject['name'] ?? ''); ?>" required autocomplete="off">
                                        </div>

                                        <div class="form-group" style="margin-bottom: 12px;">
                                            <label class="form-label">Ciclo Escolar Asociado</label>
                                            <select name="cycle_id" class="form-control form-select" required>
                                                <option value="">Selecciona un ciclo...</option>
                                                <?php foreach ($cycles as $c): ?>
                                                    <option value="<?php echo $c['id']; ?>" <?php echo (isset($editSubject['cycle_id']) && $editSubject['cycle_id'] == $c['id']) ? 'selected' : ''; ?>>
                                                        <?php echo htmlspecialchars($c['name']); ?> (<?php echo $c['total_days']; ?> días)
                                                    </option>
                                                <?php endforeach; ?>
                                            </select>
                                        </div>

                                        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                            <div class="form-group">
                                                <label class="form-label">Horas Semanales (1 a 8)</label>
                                                <input type="number" id="weekly_hours" name="weekly_hours" class="form-control" min="1" max="8" value="<?php echo htmlspecialchars($editSubject['weekly_hours'] ?? '4'); ?>" required>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Total de PDAs</label>
                                                <input type="number" name="total_pdas" class="form-control" min="1" max="100" value="<?php echo htmlspecialchars($editSubject['total_pdas'] ?? '12'); ?>" required>
                                            </div>
                                        </div>

                                        <!-- Horario Semanal selector -->
                                        <?php 
                                        $sched = isset($editSubject['schedule']) ? json_decode($editSubject['schedule'], true) : [1=>1, 2=>1, 3=>1, 4=>1, 5=>0];
                                        ?>
                                        <div class="form-group" style="margin-bottom: 20px;">
                                            <label class="form-label">Horario Semanal (Distribución de Horas por Día)</label>
                                            <p class="text-secondary" style="font-size:11px; margin-top:-4px;">Asigna cuántas horas se dan cada día. La suma debe coincidir con las horas semanales arriba.</p>
                                            <div class="schedule-selector">
                                                <?php for ($d = 1; $d <= 5; $d++): ?>
                                                    <div class="schedule-day-card">
                                                        <span class="schedule-day-label"><?php echo substr(getDayNameSpanish($d), 0, 3); ?></span>
                                                        <input type="number" name="day_<?php echo $d; ?>" class="form-control schedule-day-input day-hour-input" min="0" max="6" value="<?php echo (int)($sched[$d] ?? 0); ?>" required>
                                                    </div>
                                                <?php endfor; ?>
                                            </div>
                                            <div id="schedule-error" class="form-error" style="display:none; color:var(--color-danger); margin-top:8px;">
                                                ⚠️ La suma de las horas diarias no coincide con las horas semanales.
                                            </div>
                                        </div>

                                        <button type="submit" id="save-subject-btn" class="btn btn-primary w-full">💾 Guardar Materia y Calcular PDAs</button>
                                    </form>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    const weeklyInput = document.getElementById('weekly_hours');
                    const dayInputs = document.querySelectorAll('.day-hour-input');
                    const errorMsg = document.getElementById('schedule-error');
                    const submitBtn = document.getElementById('save-subject-btn');

                    function validateHours() {
                        let sum = 0;
                        dayInputs.forEach(input => {
                            sum += parseInt(input.value) || 0;
                        });
                        const weekly = parseInt(weeklyInput.value) || 0;
                        
                        if (sum !== weekly) {
                            errorMsg.style.display = 'block';
                            errorMsg.textContent = `⚠️ La suma de horas diarias (${sum} hs) debe ser exactamente igual a las horas semanales (${weekly} hs).`;
                            submitBtn.disabled = true;
                            weeklyInput.style.borderColor = 'var(--color-danger)';
                        } else {
                            errorMsg.style.display = 'none';
                            submitBtn.disabled = false;
                            weeklyInput.style.borderColor = 'var(--border)';
                        }
                    }

                    if (weeklyInput && dayInputs.length > 0) {
                        dayInputs.forEach(input => {
                            input.addEventListener('input', validateHours);
                        });
                        weeklyInput.addEventListener('input', validateHours);
                        // Ejecutar al cargar por si hay datos
                        validateHours();
                    }
                </script>
            <?php endif; ?>
        </main>
    </div>
</body>
</html>
