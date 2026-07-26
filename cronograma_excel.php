<?php
/**
 * cronograma_excel.php
 * Vista interactiva de la dosificación de 5 horas a partir de los datos del Excel.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

// Leer datos del JSON
$jsonPath = __DIR__ . '/database/calendar_parsed.json';
$calendarData = [];
if (file_exists($jsonPath)) {
    $calendarData = json_decode(file_get_contents($jsonPath), true);
} else {
    $error = "No se encontró el archivo de datos del cronograma. Por favor, asegúrate de que el archivo 'database/calendar_parsed.json' exista.";
}

// Organizar datos por momentos
$moments = [];
if (!empty($calendarData)) {
    foreach ($calendarData as $monthData) {
        $mName = $monthData['moment'];
        if (!isset($moments[$mName])) {
            $moments[$mName] = [];
        }
        $moments[$mName][] = $monthData;
    }
}

// Función auxiliar para determinar la clase css/estilo de un día según su actividad
function getDayStatusStyles($pdaText) {
    if (empty($pdaText)) {
        return [
            'class' => 'day-normal',
            'label' => 'Clase Normal',
            'style' => 'border-left: 4px solid var(--border-light);'
        ];
    }
    
    $pdaUpper = mb_strtoupper($pdaText);
    
    if (str_contains($pdaUpper, 'CTE') || str_contains($pdaUpper, 'CONSEJO TÉCNICO')) {
        return [
            'class' => 'day-cte',
            'label' => 'Consejo Técnico',
            'style' => 'border-left: 4px solid var(--color-dorado); background: rgba(201, 166, 70, 0.05);'
        ];
    }
    
    if (str_contains($pdaUpper, 'SUSPENSIÓN') || str_contains($pdaUpper, 'SUS PEN') || str_contains($pdaUpper, 'RECESO') || str_contains($pdaUpper, 'VACACIONAL') || str_contains($pdaUpper, 'VACACIONES')) {
        return [
            'class' => 'day-suspension',
            'label' => 'Inhábil / Vacaciones',
            'style' => 'border-left: 4px solid var(--color-danger); background: rgba(239, 68, 68, 0.05);'
        ];
    }
    
    if (str_contains($pdaUpper, 'CALIFICACIONES') || str_contains($pdaUpper, 'BOLETAS') || str_contains($pdaUpper, 'REGISTRO')) {
        return [
            'class' => 'day-grades',
            'label' => 'Evaluación / Calificaciones',
            'style' => 'border-left: 4px solid var(--color-success); background: rgba(34, 197, 94, 0.05);'
        ];
    }
    
    if (str_contains($pdaUpper, 'DIAGNÓSTICO') || str_contains($pdaUpper, 'DIAG NÓS') || str_contains($pdaUpper, 'MEJOREDU')) {
        return [
            'class' => 'day-diagnostic',
            'label' => 'Diagnóstico',
            'style' => 'border-left: 4px solid var(--color-azul-tecnologico); background: rgba(30, 144, 255, 0.05);'
        ];
    }

    if (str_contains($pdaUpper, 'TALLER INTENSIVO') || str_contains($pdaUpper, 'TALLER  INTENSI')) {
        return [
            'class' => 'day-workshop',
            'label' => 'Taller Docente',
            'style' => 'border-left: 4px solid var(--color-info); background: rgba(59, 130, 246, 0.05);'
        ];
    }

    // Default event style
    return [
        'class' => 'day-event',
        'label' => 'Actividad Especial',
        'style' => 'border-left: 4px solid var(--color-warning); background: rgba(245, 158, 11, 0.05);'
    ];
}

// Convertir las letras de días de semana de Excel a nombres completos en español
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
    <title>JOKARHE CORE — Cronograma 5 HS (Excel)</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        /* Estilos adicionales para los tabs y el calendario dinámico */
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

        .months-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
        }

        .month-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 480px;
        }

        .month-header {
            background: var(--bg-elevated);
            padding: 14px 18px;
            font-family: var(--font-display);
            font-weight: 800;
            border-bottom: 1px solid var(--border);
            color: var(--color-azul-tecnologico);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .month-body {
            overflow-y: auto;
            flex: 1;
        }

        .day-row {
            display: flex;
            align-items: center;
            padding: 10px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            font-size: 13px;
            transition: background var(--transition);
        }

        .day-row:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        .day-num-box {
            width: 32px;
            font-weight: 800;
            font-size: 14px;
            color: var(--text-primary);
        }

        .day-weekday-box {
            width: 110px;
            color: var(--text-secondary);
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
        }

        .day-desc-box {
            flex: 1;
            color: var(--text-muted);
        }

        .day-desc-box.has-event {
            color: var(--text-primary);
            font-weight: 500;
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
            width: 12px;
            height: 12px;
            border-radius: 3px;
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
                            <div class="legend-color" style="background: var(--color-danger);"></div>
                            <span>Inhábil / Vacaciones</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: var(--color-dorado);"></div>
                            <span>Consejo Técnico (CTE)</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: var(--color-success);"></div>
                            <span>Registro / Entrega Calificaciones</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: var(--color-azul-tecnologico);"></div>
                            <span>Diagnóstico Académico</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: var(--color-info);"></div>
                            <span>Taller Docente</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: var(--border-light);"></div>
                            <span>Día de Clase Normal</span>
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
                            <div class="months-grid">
                                <?php foreach ($monthsList as $monthData): ?>
                                    <div class="month-card">
                                        <div class="month-header">
                                            <span><?php echo htmlspecialchars($monthData['month']); ?></span>
                                            <span class="badge badge-neutral" style="font-size: 10px;"><?php echo count($monthData['days']); ?> días</span>
                                        </div>
                                        <div class="month-body">
                                            <?php foreach ($monthData['days'] as $day): 
                                                $styles = getDayStatusStyles($day['pda']);
                                                $isSpecial = !empty($day['pda']);
                                            ?>
                                                <div class="day-row" style="<?php echo $styles['style']; ?>">
                                                    <div class="day-num-box"><?php echo (int)$day['day']; ?></div>
                                                    <div class="day-weekday-box"><?php echo htmlspecialchars(getWeekdayLabel($day['weekday'])); ?></div>
                                                    <div class="day-desc-box <?php echo $isSpecial ? 'has-event' : ''; ?>">
                                                        <?php echo $isSpecial ? htmlspecialchars($day['pda']) : 'Clase Normal'; ?>
                                                    </div>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php $first = false; endforeach; ?>

                <?php endif; ?>
            </div>
        </main>
    </div>

    <script>
        function switchMoment(momentId, btn) {
            // Desactivar todos los contenidos y botones
            document.querySelectorAll('.moment-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            
            // Activar el seleccionado
            document.getElementById(momentId).classList.add('active');
            btn.classList.add('active');
        }
    </script>
</body>
</html>
