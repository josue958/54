<?php
/**
 * cronograma.php
 * Dashboard principal del Planeador de Ciclos y PDAs.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

// Obtener estadísticas para los widgets del Dashboard
try {
    // Total de ciclos
    $stmtCyclesCount = $pdo->query("SELECT COUNT(*) as count FROM school_cycles");
    $totalCycles = $stmtCyclesCount->fetch()['count'];

    // Total de materias
    $stmtSubjectsCount = $pdo->query("SELECT COUNT(*) as count FROM subjects");
    $totalSubjects = $stmtSubjectsCount->fetch()['count'];

    // Total de PDAs
    $stmtPdasCount = $pdo->query("SELECT SUM(total_pdas) as sum FROM subjects");
    $totalPdas = $stmtPdasCount->fetch()['sum'] ?? 0;

    // Lista de Ciclos Escolares
    $cycles = $pdo->query("SELECT * FROM school_cycles ORDER BY start_date DESC")->fetchAll();

    // Lista de Materias con el nombre del Ciclo Escolar al que pertenecen
    $subjects = $pdo->query("
        SELECT s.*, c.name as cycle_name 
        FROM subjects s 
        JOIN school_cycles c ON s.cycle_id = c.id 
        ORDER BY s.name ASC
    ")->fetchAll();

} catch (PDOException $e) {
    $error = "Error al recuperar datos: " . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JOKARHE CORE — Planeador de Ciclos y PDAs</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="app-layout">
        <!-- Barra Lateral de Navegación -->
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
                    <a href="cronograma.php" class="nav-item active">
                        <span class="nav-item-icon">🏠</span>
                        Dashboard
                    </a>
                    <a href="cycles.php" class="nav-item">
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
                <h2>Dashboard de Planeación</h2>
                <div class="topbar-actions">
                    <span class="badge badge-p1" style="font-size: 11px;">JOKARHE CORE v1.19</span>
                </div>
            </header>

            <div class="page-content">
                <?php if (isset($error)): ?>
                    <div class="alert alert-error">
                        <span>⚠️</span> <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>

                <!-- Widgets de Estadísticas -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📅</div>
                        <div class="stat-details">
                            <span class="stat-value"><?php echo $totalCycles; ?></span>
                            <span class="stat-label">Ciclos Escolares</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📚</div>
                        <div class="stat-details">
                            <span class="stat-value"><?php echo $totalSubjects; ?></span>
                            <span class="stat-label">Asignaturas</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📑</div>
                        <div class="stat-details">
                            <span class="stat-value"><?php echo $totalPdas; ?></span>
                            <span class="stat-label">PDAs Totales</span>
                        </div>
                    </div>
                </div>

                <div class="grid-container">
                    <!-- Columna Izquierda: Listado de Materias -->
                    <div>
                        <div class="card">
                            <div class="card-title">
                                <span>📚</span> Materias Configuradas
                            </div>
                            <?php if (empty($subjects)): ?>
                                <div class="empty-state">
                                    <div class="empty-state-icon">📚</div>
                                    <p>No hay materias creadas aún. Ve a la sección de materias para añadir una.</p>
                                    <a href="subjects.php" class="btn btn-primary btn-sm" style="margin-top: 12px;">Crear Materia</a>
                                </div>
                            <?php else: ?>
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
                                            <?php foreach ($subjects as $subj): ?>
                                                <tr>
                                                    <td><strong><?php echo htmlspecialchars($subj['name']); ?></strong></td>
                                                    <td><span class="badge badge-neutral"><?php echo htmlspecialchars($subj['cycle_name']); ?></span></td>
                                                    <td><?php echo (int)$subj['weekly_hours']; ?> hs / semana</td>
                                                    <td>
                                                        <span class="badge badge-p1"><?php echo (int)$subj['total_pdas']; ?> PDAs</span>
                                                    </td>
                                                    <td style="text-align: right;">
                                                        <a href="subjects.php?id=<?php echo $subj['id']; ?>" class="btn btn-secondary btn-sm">
                                                            <span>📅</span> Ver Calendario
                                                        </a>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Columna Derecha: Ciclos Escolares Activos -->
                    <div>
                        <div class="card">
                            <div class="card-title">
                                <span>📅</span> Ciclos Escolares
                            </div>
                            <?php if (empty($cycles)): ?>
                                <div class="empty-state">
                                    <div class="empty-state-icon">📅</div>
                                    <p>No hay ciclos escolares registrados.</p>
                                    <a href="cycles.php" class="btn btn-primary btn-sm" style="margin-top: 12px;">Crear Ciclo</a>
                                </div>
                            <?php else: ?>
                                <div class="pda-timeline-list">
                                    <?php foreach ($cycles as $cyc): ?>
                                        <div class="pda-item-card" style="padding: 16px;">
                                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                                <strong><?php echo htmlspecialchars($cyc['name']); ?></strong>
                                                <span class="badge badge-p3"><?php echo $cyc['total_days']; ?> Días</span>
                                            </div>
                                            <div class="pda-dates-text" style="margin-bottom: 8px;">
                                                Inicio: <strong><?php echo formatDateSpanish($cyc['start_date']); ?></strong>
                                            </div>
                                            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                                <span class="badge badge-p1" style="font-size: 9px;">P1: <?php echo $cyc['period1_days']; ?>d</span>
                                                <span class="badge badge-p2" style="font-size: 9px;">P2: <?php echo $cyc['period2_days']; ?>d</span>
                                                <span class="badge badge-p3" style="font-size: 9px;">P3: <?php echo $cyc['period3_days']; ?>d</span>
                                            </div>
                                            <div style="margin-top: 12px; text-align: right;">
                                                <a href="cycles.php?edit_id=<?php echo $cyc['id']; ?>" class="btn btn-ghost btn-sm" style="padding: 4px 8px;">
                                                    ✏️ Editar
                                                </a>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</body>
</html>
