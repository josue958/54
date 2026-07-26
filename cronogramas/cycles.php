<?php
/**
 * cycles.php
 * Gestión de Ciclos Escolares y días festivos.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

$message = '';
$messageType = '';

// Procesar acciones de formulario (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'save') {
        $id = $_POST['id'] ?? null;
        $name = trim($_POST['name'] ?? '');
        $startDate = $_POST['start_date'] ?? '';
        $totalDays = (int)($_POST['total_days'] ?? 190);
        $p1Days = (int)($_POST['period1_days'] ?? 63);
        $p2Days = (int)($_POST['period2_days'] ?? 63);
        $p3Days = (int)($_POST['period3_days'] ?? 64);

        if (empty($name) || empty($startDate)) {
            $message = "El nombre y la fecha de inicio son obligatorios.";
            $messageType = "error";
        } elseif (($p1Days + $p2Days + $p3Days) !== $totalDays) {
            $message = "La suma de los días de los periodos ($p1Days + $p2Days + $p3Days = " . ($p1Days + $p2Days + $p3Days) . ") debe ser igual al total de días del ciclo ($totalDays).";
            $messageType = "error";
        } else {
            try {
                if ($id) {
                    // Editar ciclo existente
                    $stmt = $pdo->prepare("UPDATE school_cycles SET name = ?, start_date = ?, total_days = ?, period1_days = ?, period2_days = ?, period3_days = ? WHERE id = ?");
                    $stmt->execute([$name, $startDate, $totalDays, $p1Days, $p2Days, $p3Days, $id]);
                    $message = "Ciclo escolar actualizado con éxito.";
                    $messageType = "success";
                } else {
                    // Crear nuevo ciclo
                    // Inicializar con un array vacío de festivos
                    $stmt = $pdo->prepare("INSERT INTO school_cycles (name, start_date, total_days, period1_days, period2_days, period3_days, holidays) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$name, $startDate, $totalDays, $p1Days, $p2Days, $p3Days, json_encode([])]);
                    $id = $pdo->lastInsertId();
                    $message = "Ciclo escolar creado con éxito. Ahora puedes configurar sus días festivos.";
                    $messageType = "success";
                }
                
                // Redirigir para limpiar POST y seleccionar el ciclo editado
                header("Location: cycles.php?edit_id=" . $id . "&msg=" . urlencode($message) . "&msg_type=" . $messageType);
                exit;
            } catch (PDOException $e) {
                $message = "Error al guardar el ciclo: " . $e->getMessage();
                $messageType = "error";
            }
        }
    } elseif ($action === 'add_holiday') {
        $cycleId = $_POST['cycle_id'] ?? null;
        $holidayDate = $_POST['holiday_date'] ?? '';

        if ($cycleId && !empty($holidayDate)) {
            try {
                // Obtener festivos actuales
                $stmt = $pdo->prepare("SELECT holidays FROM school_cycles WHERE id = ?");
                $stmt->execute([$cycleId]);
                $cycle = $stmt->fetch();

                if ($cycle) {
                    $holidays = json_decode($cycle['holidays'] ?? '[]', true);
                    if (!in_array($holidayDate, $holidays)) {
                        $holidays[] = $holidayDate;
                        sort($holidays);
                        
                        $stmtUpdate = $pdo->prepare("UPDATE school_cycles SET holidays = ? WHERE id = ?");
                        $stmtUpdate->execute([json_encode($holidays), $cycleId]);
                        $message = "Día festivo agregado correctamente.";
                        $messageType = "success";
                    } else {
                        $message = "El día festivo ya está registrado.";
                        $messageType = "warning";
                    }
                }
            } catch (PDOException $e) {
                $message = "Error al guardar festivo: " . $e->getMessage();
                $messageType = "error";
            }
        }
        header("Location: cycles.php?edit_id=" . $cycleId . "&msg=" . urlencode($message) . "&msg_type=" . $messageType);
        exit;
    } elseif ($action === 'remove_holiday') {
        $cycleId = $_POST['cycle_id'] ?? null;
        $holidayDate = $_POST['holiday_date'] ?? '';

        if ($cycleId && !empty($holidayDate)) {
            try {
                $stmt = $pdo->prepare("SELECT holidays FROM school_cycles WHERE id = ?");
                $stmt->execute([$cycleId]);
                $cycle = $stmt->fetch();

                if ($cycle) {
                    $holidays = json_decode($cycle['holidays'] ?? '[]', true);
                    $holidays = array_values(array_filter($holidays, function($d) use ($holidayDate) {
                        return $d !== $holidayDate;
                    }));
                    
                    $stmtUpdate = $pdo->prepare("UPDATE school_cycles SET holidays = ? WHERE id = ?");
                    $stmtUpdate->execute([json_encode($holidays), $cycleId]);
                    $message = "Día festivo eliminado.";
                    $messageType = "success";
                }
            } catch (PDOException $e) {
                $message = "Error al eliminar festivo: " . $e->getMessage();
                $messageType = "error";
            }
        }
        header("Location: cycles.php?edit_id=" . $cycleId . "&msg=" . urlencode($message) . "&msg_type=" . $messageType);
        exit;
    } elseif ($action === 'load_default_holidays') {
        $cycleId = $_POST['cycle_id'] ?? null;
        if ($cycleId) {
            try {
                $stmt = $pdo->prepare("SELECT start_date, holidays FROM school_cycles WHERE id = ?");
                $stmt->execute([$cycleId]);
                $cycle = $stmt->fetch();

                if ($cycle) {
                    $yearStart = (int)date('Y', strtotime($cycle['start_date']));
                    $yearEnd = $yearStart + 1;
                    
                    // Lista por defecto de festivos oficiales
                    $defaults = [
                        "$yearStart-09-16", // Independencia
                        "$yearStart-11-02", // Día de Muertos
                        "$yearStart-11-16", // Revolución
                        // Vacaciones de invierno
                        "$yearStart-12-21", "$yearStart-12-22", "$yearStart-12-23", "$yearStart-12-24", "$yearStart-12-25",
                        "$yearStart-12-28", "$yearStart-12-29", "$yearStart-12-30", "$yearStart-12-31", "$yearEnd-01-01",
                        "$yearEnd-01-04", "$yearEnd-01-05", "$yearEnd-01-06", "$yearEnd-01-07", "$yearEnd-01-08",
                        "$yearEnd-02-01", // Constitución
                        "$yearEnd-03-15", // Natalicio Juárez
                        // Semana Santa (aproximada marzo/abril)
                        "$yearEnd-03-22", "$yearEnd-03-23", "$yearEnd-03-24", "$yearEnd-03-25", "$yearEnd-03-26",
                        "$yearEnd-03-29", "$yearEnd-03-30", "$yearEnd-03-31", "$yearEnd-04-01", "$yearEnd-04-02",
                        "$yearEnd-05-01", // Día del Trabajo
                        "$yearEnd-05-05", // Batalla de Puebla
                        "$yearEnd-05-15", // Día del Maestro
                    ];

                    $holidays = json_decode($cycle['holidays'] ?? '[]', true);
                    $holidays = array_unique(array_merge($holidays, $defaults));
                    sort($holidays);

                    $stmtUpdate = $pdo->prepare("UPDATE school_cycles SET holidays = ? WHERE id = ?");
                    $stmtUpdate->execute([json_encode($holidays), $cycleId]);
                    $message = "Festivos oficiales cargados correctamente.";
                    $messageType = "success";
                }
            } catch (PDOException $e) {
                $message = "Error al cargar festivos: " . $e->getMessage();
                $messageType = "error";
            }
        }
        header("Location: cycles.php?edit_id=" . $cycleId . "&msg=" . urlencode($message) . "&msg_type=" . $messageType);
        exit;
    } elseif ($action === 'add_custom_holiday') {
        $cycleId = $_POST['cycle_id'] ?? null;
        $startDate = $_POST['start_date'] ?? '';
        $endDate = $_POST['end_date'] ?? '';
        $label = $_POST['label'] ?? '';

        if ($cycleId && !empty($startDate) && !empty($endDate) && !empty($label)) {
            try {
                $stmt = $pdo->prepare("INSERT INTO custom_holidays (cycle_id, start_date, end_date, label) VALUES (?, ?, ?, ?)");
                $stmt->execute([$cycleId, $startDate, $endDate, $label]);
                $message = "Período inhábil agregado correctamente.";
                $messageType = "success";
            } catch (PDOException $e) {
                $message = "Error al guardar período inhábil: " . $e->getMessage();
                $messageType = "error";
            }
        }
        header("Location: cycles.php?edit_id=" . $cycleId . "&msg=" . urlencode($message) . "&msg_type=" . $messageType);
        exit;
    } elseif ($action === 'remove_custom_holiday') {
        $cycleId = $_POST['cycle_id'] ?? null;
        $id = $_POST['id'] ?? null;

        if ($cycleId && $id) {
            try {
                $stmt = $pdo->prepare("DELETE FROM custom_holidays WHERE id = ?");
                $stmt->execute([$id]);
                $message = "Período inhábil eliminado.";
                $messageType = "success";
            } catch (PDOException $e) {
                $message = "Error al eliminar período: " . $e->getMessage();
                $messageType = "error";
            }
        }
        header("Location: cycles.php?edit_id=" . $cycleId . "&msg=" . urlencode($message) . "&msg_type=" . $messageType);
        exit;
    } elseif ($action === 'delete') {
        $cycleId = $_POST['cycle_id'] ?? null;
        if ($cycleId) {
            try {
                $stmt = $pdo->prepare("DELETE FROM school_cycles WHERE id = ?");
                $stmt->execute([$cycleId]);
                $message = "Ciclo escolar eliminado con éxito.";
                $messageType = "success";
            } catch (PDOException $e) {
                $message = "Error al eliminar el ciclo: " . $e->getMessage();
                $messageType = "error";
            }
        }
        header("Location: cycles.php?msg=" . urlencode($message) . "&msg_type=" . $messageType);
        exit;
    }
}

// Cargar mensajes redirigidos
if (isset($_GET['msg'])) {
    $message = $_GET['msg'];
    $messageType = $_GET['msg_type'] ?? 'info';
}

// Cargar ciclos
$cycles = $pdo->query("SELECT * FROM school_cycles ORDER BY start_date DESC")->fetchAll();

// Cargar ciclo a editar si se solicita
$editCycle = null;
$editCycleCustomHolidays = [];
$editId = $_GET['edit_id'] ?? null;
if ($editId) {
    $stmt = $pdo->prepare("SELECT * FROM school_cycles WHERE id = ?");
    $stmt->execute([$editId]);
    $editCycle = $stmt->fetch();
    
    if ($editCycle) {
        $stmtCh = $pdo->prepare("SELECT * FROM custom_holidays WHERE cycle_id = ? ORDER BY start_date ASC");
        $stmtCh->execute([$editCycle['id']]);
        $editCycleCustomHolidays = $stmtCh->fetchAll();
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JOKARHE CORE — Gestión de Ciclos Escolares</title>
    <link rel="stylesheet" href="styles.css">
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
                    <a href="cycles.php" class="nav-item active">
                        <span class="nav-item-icon">📅</span>
                        Ciclos Escolares
                    </a>
                    <a href="subjects.php" class="nav-item">
                        <span class="nav-item-icon">📚</span>
                        Materias / PDAs
                    </a>
                </div>
            </nav>
        </aside>

        <!-- Contenido Principal -->
        <main class="main-content">
            <header class="topbar">
                <h2>Gestión de Ciclos Escolares</h2>
                <div class="topbar-actions">
                    <a href="cycles.php" class="btn btn-secondary btn-sm">➕ Nuevo Ciclo</a>
                </div>
            </header>

            <div class="page-content">
                <?php if (!empty($message)): ?>
                    <div class="alert alert-<?php echo htmlspecialchars($messageType); ?>">
                        <span>
                            <?php 
                            if ($messageType === 'success') echo '✅';
                            elseif ($messageType === 'error') echo '⚠️';
                            else echo 'ℹ️';
                            ?>
                        </span>
                        <?php echo htmlspecialchars($message); ?>
                    </div>
                <?php endif; ?>

                <div class="grid-container">
                    <!-- Columna Izquierda: Lista de Ciclos -->
                    <div>
                        <div class="card">
                            <div class="card-title">
                                <span>📅</span> Ciclos Registrados
                            </div>
                            <?php if (empty($cycles)): ?>
                                <div class="empty-state">
                                    <div class="empty-state-icon">📅</div>
                                    <p>No hay ciclos escolares registrados. Registra uno usando el formulario de la derecha.</p>
                                </div>
                            <?php else: ?>
                                <div class="table-container">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Inicio</th>
                                                <th>Días Totales</th>
                                                <th style="text-align: right;">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($cycles as $c): ?>
                                                <tr class="<?php echo ($editId == $c['id']) ? 'active-row' : ''; ?>" style="<?php echo ($editId == $c['id']) ? 'background-color: var(--bg-hover);' : ''; ?>">
                                                    <td><strong><?php echo htmlspecialchars($c['name']); ?></strong></td>
                                                    <td><?php echo formatDateSpanish($c['start_date'], true); ?></td>
                                                    <td>
                                                        <span class="badge badge-p3"><?php echo $c['total_days']; ?> días</span>
                                                    </td>
                                                    <td style="text-align: right;">
                                                        <div style="display: inline-flex; gap: 4px;">
                                                            <a href="cycles.php?edit_id=<?php echo $c['id']; ?>" class="btn btn-secondary btn-sm">✏️</a>
                                                            <form method="POST" onsubmit="return confirm('¿Seguro que deseas eliminar este ciclo escolar? Se eliminarán todas las materias y planeaciones asociadas.');" style="display:inline;">
                                                                <input type="hidden" name="action" value="delete">
                                                                <input type="hidden" name="cycle_id" value="<?php echo $c['id']; ?>">
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

                    <!-- Columna Derecha: Formulario y Festivos -->
                    <div>
                        <div class="card">
                            <div class="card-title">
                                <span><?php echo $editCycle ? '✏️ Editar' : '➕ Crear'; ?> Ciclo Escolar</span>
                            </div>
                            <form method="POST">
                                <input type="hidden" name="action" value="save">
                                <input type="hidden" name="id" value="<?php echo $editCycle['id'] ?? ''; ?>">

                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label class="form-label">Nombre del Ciclo</label>
                                    <input type="text" name="name" class="form-control" placeholder="Ej. Ciclo Escolar 2026-2027" value="<?php echo htmlspecialchars($editCycle['name'] ?? ''); ?>" required autocomplete="off">
                                </div>

                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label class="form-label">Fecha de Inicio (Primer día de clases)</label>
                                    <input type="date" name="start_date" class="form-control" value="<?php echo htmlspecialchars($editCycle['start_date'] ?? ''); ?>" required>
                                </div>

                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label class="form-label">Total de Días Hábiles de Clase</label>
                                    <input type="number" id="total_days" name="total_days" class="form-control" min="50" max="300" value="<?php echo htmlspecialchars($editCycle['total_days'] ?? '190'); ?>" required>
                                </div>

                                <div style="display: flex; gap: 8px; margin-bottom: 20px;">
                                    <div class="form-group" style="flex:1;">
                                        <label class="form-label">Días Periodo 1</label>
                                        <input type="number" class="form-control period-day-input" name="period1_days" value="<?php echo htmlspecialchars($editCycle['period1_days'] ?? '63'); ?>" required>
                                    </div>
                                    <div class="form-group" style="flex:1;">
                                        <label class="form-label">Días Periodo 2</label>
                                        <input type="number" class="form-control period-day-input" name="period2_days" value="<?php echo htmlspecialchars($editCycle['period2_days'] ?? '63'); ?>" required>
                                    </div>
                                    <div class="form-group" style="flex:1;">
                                        <label class="form-label">Días Periodo 3</label>
                                        <input type="number" class="form-control period-day-input" name="period3_days" value="<?php echo htmlspecialchars($editCycle['period3_days'] ?? '64'); ?>" required>
                                    </div>
                                </div>

                                <button type="submit" class="btn btn-primary w-full">💾 Guardar Configuración</button>
                            </form>
                        </div>

                        <!-- Sección de Días Festivos (Solo si se está editando un ciclo) -->
                        <?php if ($editCycle): ?>
                            <?php $holidays = json_decode($editCycle['holidays'] ?? '[]', true); ?>
                            <div class="card">
                                <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>🚫 Días Inhábiles (Festivos)</span>
                                    <form method="POST" style="display: inline;">
                                        <input type="hidden" name="action" value="load_default_holidays">
                                        <input type="hidden" name="cycle_id" value="<?php echo $editCycle['id']; ?>">
                                        <button type="submit" class="btn btn-secondary btn-sm">Cargar Oficiales MX</button>
                                    </form>
                                </div>
                                <p class="text-secondary" style="font-size: 11px; margin-top:-10px; margin-bottom: 12px;">Estos días se omiten al calcular el calendario de sesiones.</p>
                                
                                <form method="POST" style="display: flex; gap: 8px; margin-bottom: 16px;">
                                    <input type="hidden" name="action" value="add_holiday">
                                    <input type="hidden" name="cycle_id" value="<?php echo $editCycle['id']; ?>">
                                    <input type="date" name="holiday_date" class="form-control" required style="padding: 6px 12px; font-size:12px;">
                                    <button type="submit" class="btn btn-primary btn-sm">➕ Agregar</button>
                                </form>

                                <?php if (empty($holidays)): ?>
                                    <div class="empty-state" style="padding: 20px 0;">
                                        <p style="font-size: 12px;">No hay días festivos registrados en este ciclo.</p>
                                    </div>
                                <?php else: ?>
                                    <div class="holidays-grid" style="max-height: 250px; overflow-y: auto; padding: 4px;">
                                        <?php foreach ($holidays as $hDate): ?>
                                            <div class="holiday-chip">
                                                <span><?php echo formatDateSpanish($hDate, true); ?></span>
                                                <form method="POST" style="display: inline;">
                                                    <input type="hidden" name="action" value="remove_holiday">
                                                    <input type="hidden" name="cycle_id" value="<?php echo $editCycle['id']; ?>">
                                                    <input type="hidden" name="holiday_date" value="<?php echo $hDate; ?>">
                                                    <button type="submit" class="holiday-remove">✕</button>
                                                </form>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>
                            </div>

                            <!-- Sección de Períodos Inhábiles Personalizados -->
                            <div class="card" style="margin-top: 20px;">
                                <div class="card-title">
                                    <span>📅 Períodos Inhábiles Personalizados</span>
                                </div>
                                <p class="text-secondary" style="font-size: 11px; margin-top:-10px; margin-bottom: 12px;">Registra rangos de fechas (ej: Vacaciones de Primavera, Semana Cultural) con una etiqueta personalizada que se mostrará en el cronograma.</p>
                                
                                <form method="POST" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: var(--radius); border: 1px solid var(--border);">
                                    <input type="hidden" name="action" value="add_custom_holiday">
                                    <input type="hidden" name="cycle_id" value="<?php echo $editCycle['id']; ?>">
                                    
                                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 8px;">
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label class="form-label" style="font-size: 10px; margin-bottom: 2px;">Fecha Inicio</label>
                                            <input type="date" name="start_date" class="form-control" required style="padding: 6px 10px; font-size:12px;">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label class="form-label" style="font-size: 10px; margin-bottom: 2px;">Fecha Fin</label>
                                            <input type="date" name="end_date" class="form-control" required style="padding: 6px 10px; font-size:12px;">
                                        </div>
                                    </div>
                                    <div class="form-group" style="margin-bottom: 4px;">
                                        <label class="form-label" style="font-size: 10px; margin-bottom: 2px;">Etiqueta Descriptiva</label>
                                        <input type="text" name="label" class="form-control" placeholder="Ej. PERIODO VACACIONAL PRIMAVERA" required style="padding: 6px 10px; font-size:12px;" autocomplete="off">
                                    </div>
                                    <button type="submit" class="btn btn-primary btn-sm" style="align-self: flex-end; padding: 6px 16px;">➕ Agregar Período</button>
                                </form>

                                <?php if (empty($editCycleCustomHolidays)): ?>
                                    <div class="empty-state" style="padding: 20px 0;">
                                        <p style="font-size: 12px;">No hay períodos personalizados registrados.</p>
                                    </div>
                                <?php else: ?>
                                    <div class="table-container" style="max-height: 250px; overflow-y: auto;">
                                        <table class="data-table" style="font-size: 12px;">
                                            <thead>
                                                <tr>
                                                    <th>Inicio</th>
                                                    <th>Fin</th>
                                                    <th>Etiqueta</th>
                                                    <th style="text-align: right;">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach ($editCycleCustomHolidays as $chRow): ?>
                                                    <tr>
                                                        <td><?php echo formatDateSpanish($chRow['start_date']); ?></td>
                                                        <td><?php echo formatDateSpanish($chRow['end_date']); ?></td>
                                                        <td><strong><?php echo htmlspecialchars($chRow['label']); ?></strong></td>
                                                        <td style="text-align: right;">
                                                            <form method="POST" style="display: inline;" onsubmit="return confirm('¿Seguro que deseas eliminar este período?');">
                                                                <input type="hidden" name="action" value="remove_custom_holiday">
                                                                <input type="hidden" name="cycle_id" value="<?php echo $editCycle['id']; ?>">
                                                                <input type="hidden" name="id" value="<?php echo $chRow['id']; ?>">
                                                                <button type="submit" class="btn btn-danger btn-sm" style="padding: 2px 6px; font-size: 10px;">✕ Eliminar</button>
                                                            </form>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Script de validación simple del lado del cliente -->
    <script>
        const totalInput = document.getElementById('total_days');
        const periodInputs = document.querySelectorAll('.period-day-input');

        function validateSum() {
            let sum = 0;
            periodInputs.forEach(input => {
                sum += parseInt(input.value) || 0;
            });
            const total = parseInt(totalInput.value) || 0;
            
            if (sum !== total) {
                periodInputs.forEach(input => {
                    input.style.borderColor = 'var(--color-danger)';
                });
            } else {
                periodInputs.forEach(input => {
                    input.style.borderColor = 'var(--border)';
                });
            }
        }

        periodInputs.forEach(input => {
            input.addEventListener('input', validateSum);
        });
        totalInput.addEventListener('input', validateSum);
    </script>
</body>
</html>
