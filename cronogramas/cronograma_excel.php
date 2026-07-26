<?php
/**
 * cronograma_excel.php
 * Vista interactiva de la dosificación de 5 horas a partir de los datos del Excel.
 * Muestra el cronograma en formato de tabla horizontal con celdas combinadas (fiel al Excel).
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

// Leer datos del JSON de cuadrícula
$jsonPath = __DIR__ . '/database/calendar_parsed_grid.json';
$calendarGrid = [];
if (file_exists($jsonPath)) {
    $calendarGrid = json_decode(file_get_contents($jsonPath), true);
} else {
    $error = "No se encontró el archivo de datos del cronograma. Por favor, asegúrate de que el archivo 'database/calendar_parsed_grid.json' exista.";
}

// Organizar datos por momentos
$moments = [];
if (!empty($calendarGrid)) {
    foreach ($calendarGrid as $mGrid) {
        $moments[$mGrid['moment']] = $mGrid['months'];
    }
}

// Función auxiliar para determinar la clase css/estilo de un día según su actividad
function getCellStyles($text) {
    if (empty($text)) {
        return [
            'bg' => 'var(--bg-card)',
            'color' => 'var(--text-muted)',
            'border' => '1px solid var(--border)'
        ];
    }
    
    $textUpper = mb_strtoupper($text);
    
    // Consejo Técnico Escolar
    if (str_contains($textUpper, 'CTE') || str_contains($textUpper, 'CONSEJO TÉCNICO')) {
        return [
            'bg' => 'rgba(201, 166, 70, 0.15)',
            'color' => 'var(--color-dorado)',
            'border' => '1px solid var(--color-dorado)'
        ];
    }
    
    // Receso Escolar / Periodos Vacacionales / Suspensiones
    if (str_contains($textUpper, 'SUSPENSIÓN') || str_contains($textUpper, 'SUS PEN') || str_contains($textUpper, 'RECESO') || str_contains($textUpper, 'VACACIONAL') || str_contains($textUpper, 'VACACIONES')) {
        return [
            'bg' => 'rgba(239, 68, 68, 0.15)',
            'color' => 'var(--color-danger)',
            'border' => '1px solid var(--color-danger)'
        ];
    }
    
    // Evaluaciones, calificaciones o entrega de boletas
    if (str_contains($textUpper, 'CALIFICACIONES') || str_contains($textUpper, 'BOLETAS') || str_contains($textUpper, 'REGISTRO')) {
        return [
            'bg' => 'rgba(34, 197, 94, 0.15)',
            'color' => 'var(--color-success)',
            'border' => '1px solid var(--color-success)'
        ];
    }
    
    // Diagnósticos Académicos
    if (str_contains($textUpper, 'DIAGNÓSTICO') || str_contains($textUpper, 'DIAG NÓS') || str_contains($textUpper, 'MEJOREDU')) {
        return [
            'bg' => 'rgba(30, 144, 255, 0.15)',
            'color' => 'var(--color-azul-tecnologico)',
            'border' => '1px solid var(--color-azul-tecnologico)'
        ];
    }

    // Talleres Docentes
    if (str_contains($textUpper, 'TALLER INTENSIVO') || str_contains($textUpper, 'TALLER  INTENSI')) {
        return [
            'bg' => 'rgba(59, 130, 246, 0.15)',
            'color' => 'var(--color-info)',
            'border' => '1px solid var(--color-info)'
        ];
    }

    // Cualquier otra festividad o actividad especial
    return [
        'bg' => 'rgba(245, 158, 11, 0.15)',
        'color' => 'var(--color-warning)',
        'border' => '1px solid var(--color-warning)'
    ];
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JOKARHE CORE — Cronograma 5 HS (Excel)</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        /* Pestañas de Navegación del Cronograma */
        .tabs-header {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 12px;
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
                    <a href="cronograma.php" class="nav-item">
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
                    <a href="cronograma_excel.php" class="nav-item active">
                        <span class="nav-item-icon">📊</span>
                        Cronograma 5 HS
                    </a>
                </div>
            </nav>
        </aside>

        <!-- Contenido Principal -->
        <main class="main-content">
            <header class="topbar">
                <h2>Cronograma 5 HS (Carga de Excel)</h2>
                <div class="topbar-actions">
                    <span class="badge badge-p1" style="font-size: 11px;">141 DÍAS CLASE</span>
                </div>
            </header>

            <div class="page-content">
                <?php if (isset($error)): ?>
                    <div class="alert alert-error">
                        <span>⚠️</span> <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php else: ?>

                    <!-- Widgets de Estadísticas Rápidas -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">📅</div>
                            <div class="stat-details">
                                <span class="stat-value">141</span>
                                <span class="stat-label">Días de Clase</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">💼</div>
                            <div class="stat-details">
                                <span class="stat-value">15</span>
                                <span class="stat-label">Días de Colchón</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">⏱️</div>
                            <div class="stat-details">
                                <span class="stat-value">5 HS</span>
                                <span class="stat-label">Carga Horaria Semanal</span>
                            </div>
                        </div>
                    </div>

                    <!-- Leyenda del Calendario -->
                    <div class="legend-card">
                        <span class="legend-title">Leyenda de Días:</span>
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

                    <!-- Pestañas para los 3 Momentos -->
                    <div class="tabs-header">
                        <?php $first = true; foreach (array_keys($moments) as $mName): ?>
                            <button class="tab-btn <?php echo $first ? 'active' : ''; ?>" onclick="switchMoment('<?php echo hash('sha256', $mName); ?>', this)">
                                <?php echo htmlspecialchars($mName); ?>
                            </button>
                        <?php $first = false; endforeach; ?>
                    </div>

                    <!-- Contenido de cada Momento -->
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
