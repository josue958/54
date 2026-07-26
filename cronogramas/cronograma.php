<?php
/**
 * cronograma.php
 * Dashboard principal del Planeador de Ciclos y PDAs.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

// Leer datos del JSON de cuadrícula del cronograma de Excel
$jsonPath = __DIR__ . '/database/calendar_parsed_grid.json';
$calendarGrid = [];
if (file_exists($jsonPath)) {
    $calendarGrid = json_decode(file_get_contents($jsonPath), true);
}

// Organizar datos del cronograma por trimestres
$moments = [];
if (!empty($calendarGrid)) {
    foreach ($calendarGrid as $mGrid) {
        $moments[$mGrid['moment']] = $mGrid['months'];
    }
}

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

// Función auxiliar para determinar el estilo de celda
function getCellStyles($text) {
    if (empty($text)) {
        return [
            'bg' => 'var(--bg-card)',
            'color' => 'var(--text-muted)',
            'border' => '1px solid var(--border)'
        ];
    }
    
    $textUpper = mb_strtoupper($text);
    
    if (str_contains($textUpper, 'CTE') || str_contains($textUpper, 'CONSEJO TÉCNICO')) {
        return [
            'bg' => 'rgba(201, 166, 70, 0.15)',
            'color' => 'var(--color-dorado)',
            'border' => '1px solid var(--color-dorado)'
        ];
    }
    
    if (str_contains($textUpper, 'SUSPENSIÓN') || str_contains($textUpper, 'SUS PEN') || str_contains($textUpper, 'RECESO') || str_contains($textUpper, 'VACACIONAL') || str_contains($textUpper, 'VACACIONES')) {
        return [
            'bg' => 'rgba(239, 68, 68, 0.15)',
            'color' => 'var(--color-danger)',
            'border' => '1px solid var(--color-danger)'
        ];
    }
    
    if (str_contains($textUpper, 'CALIFICACIONES') || str_contains($textUpper, 'BOLETAS') || str_contains($textUpper, 'REGISTRO')) {
        return [
            'bg' => 'rgba(34, 197, 94, 0.15)',
            'color' => 'var(--color-success)',
            'border' => '1px solid var(--color-success)'
        ];
    }
    
    if (str_contains($textUpper, 'DIAGNÓSTICO') || str_contains($textUpper, 'DIAG NÓS') || str_contains($textUpper, 'MEJOREDU')) {
        return [
            'bg' => 'rgba(30, 144, 255, 0.15)',
            'color' => 'var(--color-azul-tecnologico)',
            'border' => '1px solid var(--color-azul-tecnologico)'
        ];
    }

    if (str_contains($textUpper, 'TALLER INTENSIVO') || str_contains($textUpper, 'TALLER  INTENSI')) {
        return [
            'bg' => 'rgba(59, 130, 246, 0.15)',
            'color' => 'var(--color-info)',
            'border' => '1px solid var(--color-info)'
        ];
    }

    return [
        'bg' => 'rgba(245, 158, 11, 0.15)',
        'color' => 'var(--color-warning)',
        'border' => '1px solid var(--color-warning)'
    ];
}

function getWeekdayLabel($letter) {
    switch ($letter) {
        case 'L': return 'Lunes';
        case 'M': return 'Martes / Miércoles';
        case 'J': return 'Jueves';
        case 'V': return 'Viernes';
        default: return $letter;
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JOKARHE CORE — Planeador de Ciclos y PDAs</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        /* Pestañas de Navegación del Cronograma */
        .tabs-header {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 12px;
            margin-top: 30px;
        }

        .tab-btn {
            background: var(--bg-elevated);
            color: var(--text-secondary);
            border: 1px solid var(--border);
            padding: 10px 20px;
            border-radius: var(--radius);
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition);
        }

        .tab-btn:hover {
            color: var(--text-primary);
            border-color: var(--border-light);
        }

        .tab-btn.active {
            background: rgba(30, 144, 255, 0.15);
            color: var(--color-azul-tecnologico);
            border-color: var(--color-azul-tecnologico);
        }

        .moment-content {
            display: none;
        }

        .moment-content.active {
            display: block;
        }

        /* Contenedor con Scroll Horizontal de las tablas */
        .table-scroll-container {
            overflow-x: auto;
            max-width: 100%;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border);
            background: var(--bg-card);
            margin-bottom: 24px;
            box-shadow: var(--shadow-sm);
        }

        /* Tabla Estilo Excel */
        .excel-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            table-layout: auto;
        }

        .excel-table th, .excel-table td {
            border: 1px solid var(--border);
            padding: 8px 12px;
            text-align: center;
            vertical-align: middle;
            min-width: 48px;
            max-width: 250px;
            white-space: normal;
            word-wrap: break-word;
        }

        /* Estilo de fila de encabezados y nombres de día */
        .excel-table tr:nth-child(1) th {
            background: var(--bg-elevated);
            color: var(--text-secondary);
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
        }

        .excel-table tr:nth-child(2) th, 
        .excel-table tr:nth-child(2) td {
            background: rgba(255,255,255,0.02);
            color: var(--text-primary);
            font-weight: 800;
            font-size: 13px;
        }

        /* Primera columna sticky (MES, AGOSTO, PDA, SEGUIMIENTO) */
        .excel-table tr th:first-child,
        .excel-table tr td:first-child {
            width: 180px;
            min-width: 180px;
            max-width: 180px;
            text-align: left;
            font-weight: 700;
            background: var(--bg-elevated) !important;
            color: var(--text-primary) !important;
            position: sticky;
            left: 0;
            z-index: 5;
            border-right: 2px solid var(--border-light);
            box-shadow: 4px 0 8px rgba(0,0,0,0.15);
        }

        /* Celdas con eventos y fusiones */
        .excel-cell-event {
            font-weight: 700;
            font-size: 11px;
            line-height: 1.4;
            padding: 12px;
        }

        /* Leyendas */
        .legend-card {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            padding: 16px 20px;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            margin-bottom: 24px;
            margin-top: 30px;
            align-items: center;
        }

        .legend-title {
            font-weight: 700;
            font-size: 12px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-right: 8px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }

        .legend-color {
            width: 14px;
            height: 14px;
            border-radius: 4px;
        }
    </style>
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
                
                <!-- SECCIÓN DE CRONOGRAMA DE EXCEL INTEGRADA -->
                <?php if (!empty($moments)): ?>
                    <div class="legend-card">
                        <span class="legend-title">Leyenda del Cronograma 5 HS:</span>
                        <div class="legend-item">
                            <div class="legend-color" style="background: rgba(239, 68, 68, 0.2); border: 1px solid var(--color-danger);"></div>
                            <span>Inhábil / Vacaciones</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: rgba(201, 166, 70, 0.2); border: 1px solid var(--color-dorado);"></div>
                            <span>Consejo Técnico (CTE)</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: rgba(34, 197, 94, 0.2); border: 1px solid var(--color-success);"></div>
                            <span>Registro / Entrega Calificaciones</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: rgba(30, 144, 255, 0.2); border: 1px solid var(--color-azul-tecnologico);"></div>
                            <span>Diagnóstico Académico</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: rgba(59, 130, 246, 0.2); border: 1px solid var(--color-info);"></div>
                            <span>Taller Docente</span>
                        </div>
                    </div>

                    <!-- Pestañas para los 3 Trimestres -->
                    <div class="tabs-header">
                        <?php $first = true; foreach (array_keys($moments) as $mName): ?>
                            <button class="tab-btn <?php echo $first ? 'active' : ''; ?>" onclick="switchMoment('<?php echo hash('sha256', $mName); ?>', this)">
                                <?php echo htmlspecialchars($mName); ?>
                            </button>
                        <?php $first = false; endforeach; ?>
                    </div>

                    <!-- Contenido de cada Trimestre -->
                    <?php $first = true; foreach ($moments as $mName => $monthsList): ?>
                        <div id="<?php echo hash('sha256', $mName); ?>" class="moment-content <?php echo $first ? 'active' : ''; ?>">
                            <?php foreach ($monthsList as $monthData): ?>
                                <div class="card">
                                    <div class="card-title">
                                        <span>📅</span> <?php echo htmlspecialchars($monthData['month']); ?>
                                    </div>
                                    
                                    <div class="table-scroll-container">
                                        <table class="excel-table">
                                            <tbody>
                                                <?php foreach ($monthData['rows'] as $rowIdx => $row): ?>
                                                    <tr>
                                                        <?php foreach ($row as $cell): 
                                                            $colspanAttr = $cell['colspan'] > 1 ? ' colspan="' . $cell['colspan'] . '"' : '';
                                                            $rowspanAttr = $cell['rowspan'] > 1 ? ' rowspan="' . $cell['rowspan'] . '"' : '';
                                                            
                                                            $text = $cell['text'] ?? '';
                                                            $cleanText = preg_replace('/\s+/', ' ', trim($text));
                                                            
                                                            if ($cell['is_header']): ?>
                                                                <th<?php echo $colspanAttr . $rowspanAttr; ?>>
                                                                    <?php echo htmlspecialchars($cleanText); ?>
                                                                </th>
                                                            <?php else: 
                                                                $styles = getCellStyles($text);
                                                                $styleAttr = '';
                                                                $classAttr = '';
                                                                
                                                                if ($cell['type'] === 'pda' || $cell['type'] === 'seguimiento') {
                                                                    if (!empty($text)) {
                                                                        $styleAttr = ' style="background: ' . $styles['bg'] . '; color: ' . $styles['color'] . '; border: ' . $styles['border'] . ';"';
                                                                        $classAttr = ' class="excel-cell-event"';
                                                                    }
                                                                }
                                                            ?>
                                                                <td<?php echo $colspanAttr . $rowspanAttr . $styleAttr . $classAttr; ?>>
                                                                    <?php echo htmlspecialchars($cleanText); ?>
                                                                </td>
                                                            <?php endif; ?>
                                                        <?php endforeach; ?>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php $first = false; endforeach; ?>
                <?php endif; ?>
            </div>
        </main>
    </div>

    <script>
        function switchMoment(momentId, btn) {
            document.querySelectorAll('.moment-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            
            document.getElementById(momentId).classList.add('active');
            btn.classList.add('active');
        }
    </script>
</body>
</html>
