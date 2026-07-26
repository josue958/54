<?php
/**
 * helpers.php
 * Algoritmos para cálculo de ciclo escolar, sesiones de materia y distribución de PDAs.
 */

/**
 * Genera la lista de fechas de días hábiles de clase en el ciclo escolar.
 * Omitiendo sábados, domingos y días festivos.
 *
 * @param string $startDate Fecha de inicio (YYYY-MM-DD)
 * @param int $totalDays Días totales del ciclo (ej. 190)
 * @param array $holidays Listado de días festivos (YYYY-MM-DD)
 * @return array Listado de strings de fechas YYYY-MM-DD
 */
function getSchoolDays($startDate, $totalDays, $holidays = []) {
    $days = [];
    $current = new DateTime($startDate);
    $count = 0;
    
    // Normalizar holidays a un array plano de fechas
    $holidayDates = [];
    if (is_array($holidays)) {
        foreach ($holidays as $k => $v) {
            if (is_numeric($k)) {
                $holidayDates[] = $v;
            } else {
                $holidayDates[] = $k;
            }
        }
    }
    
    // Evitar bucles infinitos por parámetros inválidos
    $maxIterations = $totalDays * 4;
    $iterations = 0;

    while ($count < $totalDays && $iterations < $maxIterations) {
        $iterations++;
        $w = (int)$current->format('w'); // 0 = Domingo, 6 = Sábado
        $dateStr = $current->format('Y-m-d');
        
        if ($w !== 0 && $w !== 6 && !in_array($dateStr, $holidayDates)) {
            $days[] = $dateStr;
            $count++;
        }
        $current->modify('+1 day');
    }
    
    return $days;
}

/**
 * Mapea las sesiones de una asignatura basándose en los días hábiles del ciclo escolar
 * y el horario semanal de la materia.
 *
 * @param array $schoolDays Fechas de días hábiles
 * @param array $schedule Horario semanal, ej: [1 => 1, 2 => 1, 3 => 0...] (1=Lun, 5=Vie)
 * @param int $p1Days Días del Periodo 1
 * @param int $p2Days Días del Periodo 2
 * @return array Sesiones de la materia
 */
function getSubjectSessions($schoolDays, $schedule, $p1Days, $p2Days) {
    $sessions = [];
    $p1EndIndex = $p1Days - 1;
    $p2EndIndex = $p1Days + $p2Days - 1;

    $sessionNumber = 1;
    foreach ($schoolDays as $index => $dateStr) {
        $date = new DateTime($dateStr);
        $dayOfWeek = (int)$date->format('N'); // 1 = Lunes, ..., 7 = Domingo

        if (isset($schedule[$dayOfWeek]) && $schedule[$dayOfWeek] > 0) {
            $hours = (int)$schedule[$dayOfWeek];
            
            // Determinar periodo escolar
            $period = 1;
            if ($index > $p2EndIndex) {
                $period = 3;
            } elseif ($index > $p1EndIndex) {
                $period = 2;
            }

            for ($h = 1; $h <= $hours; $h++) {
                $sessions[] = [
                    'session_number' => $sessionNumber++,
                    'date' => $dateStr,
                    'day_of_week' => $dayOfWeek,
                    'period' => $period
                ];
            }
        }
    }
    return $sessions;
}

/**
 * Distribuye los PDAs equitativamente entre las sesiones calculadas para la materia.
 *
 * @param array $sessions Listado de sesiones mapeadas
 * @param int $totalPDAs Número total de PDAs de la materia
 * @param int $subjectId ID de la materia
 * @param PDO $pdo Conexión PDO para traer títulos personalizados
 * @return array PDAs con su conteo de sesiones, fechas y periodos
 */
function calculatePdaDistribution($sessions, $totalPDAs, $subjectId, $pdo) {
    $totalSessions = count($sessions);
    if ($totalSessions === 0 || $totalPDAs === 0) {
        return [];
    }

    // Obtener nombres/temas y número de sesiones guardados en la BD
    $stmt = $pdo->prepare("SELECT pda_number, topic, sessions_count FROM pdas WHERE subject_id = ? ORDER BY pda_number ASC");
    $stmt->execute([$subjectId]);
    $savedPdas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Mapear datos cargados
    $pdaTopics = [];
    $pdaSessions = [];
    foreach ($savedPdas as $row) {
        $pdaTopics[$row['pda_number']] = $row['topic'];
        $pdaSessions[$row['pda_number']] = $row['sessions_count'];
    }

    // Verificar si existen cantidades personalizadas
    $hasCustomSessions = false;
    foreach ($pdaSessions as $num => $cnt) {
        if ($cnt !== null) {
            $hasCustomSessions = true;
            break;
        }
    }

    // Determinar la cantidad de sesiones para cada PDA
    $pdaCounts = [];
    $baseSessions = (int)floor($totalSessions / $totalPDAs);
    $remainder = $totalSessions % $totalPDAs;

    for ($i = 1; $i <= $totalPDAs; $i++) {
        if (isset($pdaSessions[$i]) && $pdaSessions[$i] !== null) {
            $pdaCounts[$i] = (int)$pdaSessions[$i];
        } else {
            // Por defecto toma su parte equitativa si no tiene valor personalizado guardado
            $pdaCounts[$i] = $baseSessions + ($i <= $remainder ? 1 : 0);
        }
    }

    $pdaDistribution = [];
    $sessionIndex = 0;

    for ($i = 1; $i <= $totalPDAs; $i++) {
        $pdaSessionsCount = $pdaCounts[$i];
        $topic = isset($pdaTopics[$i]) ? $pdaTopics[$i] : "Proceso de Desarrollo de Aprendizaje (PDA) $i";

        if ($pdaSessionsCount > 0 && $sessionIndex < $totalSessions) {
            $startSession = $sessions[$sessionIndex];
            $endSession = $sessions[min($sessionIndex + $pdaSessionsCount - 1, $totalSessions - 1)];
            
            // Recopilar todas las sesiones de este PDA
            $pdaSessionsDetail = array_slice($sessions, $sessionIndex, $pdaSessionsCount);

            $pdaDistribution[] = [
                'pda_number' => $i,
                'topic' => $topic,
                'sessions_count' => $pdaSessionsCount,
                'start_date' => $startSession['date'],
                'end_date' => $endSession['date'],
                'start_period' => $startSession['period'],
                'end_period' => $endSession['period'],
                'sessions' => $pdaSessionsDetail
            ];

            $sessionIndex += $pdaSessionsCount;
        } else {
            $pdaDistribution[] = [
                'pda_number' => $i,
                'topic' => $topic,
                'sessions_count' => 0,
                'start_date' => null,
                'end_date' => null,
                'start_period' => null,
                'end_period' => null,
                'sessions' => []
            ];
        }
    }

    return $pdaDistribution;
}

/**
 * Formatea una fecha al español.
 * Ej: "2026-08-24" -> "Lunes, 24 Ago 2026"
 *
 * @param string $dateStr Fecha en formato YYYY-MM-DD
 * @param bool $short Si es true, acorta el nombre del mes
 * @return string Fecha formateada
 */
function formatDateSpanish($dateStr, $short = false) {
    if (empty($dateStr)) return 'N/A';
    
    $date = new DateTime($dateStr);
    
    $days = [
        'Sunday' => 'Domingo',
        'Monday' => 'Lunes',
        'Tuesday' => 'Martes',
        'Wednesday' => 'Miércoles',
        'Thursday' => 'Jueves',
        'Friday' => 'Viernes',
        'Saturday' => 'Sábado'
    ];
    
    $months = [
        'January' => 'Enero', 'February' => 'Febrero', 'March' => 'Marzo',
        'April' => 'Abril', 'May' => 'Mayo', 'June' => 'Junio',
        'July' => 'Julio', 'August' => 'Agosto', 'September' => 'Septiembre',
        'October' => 'Octubre', 'November' => 'Noviembre', 'December' => 'Diciembre'
    ];

    $monthsShort = [
        'January' => 'Ene', 'February' => 'Feb', 'March' => 'Mar',
        'April' => 'Abr', 'May' => 'May', 'June' => 'Jun',
        'July' => 'Jul', 'August' => 'Ago', 'September' => 'Sep',
        'October' => 'Oct', 'November' => 'Nov', 'December' => 'Dic'
    ];

    $dayName = $days[$date->format('l')];
    $monthName = $short ? $monthsShort[$date->format('F')] : $months[$date->format('F')];
    $dayNum = $date->format('j');
    $year = $date->format('Y');

    if ($short) {
        return "$dayName $dayNum/$monthName/$year";
    }
    return "$dayName, $dayNum de $monthName de $year";
}

/**
 * Retorna el nombre del día de la semana en español a partir del número.
 *
 * @param int $dayNum 1 (Lunes) a 7 (Domingo)
 * @return string Nombre del día
 */
function getDayNameSpanish($dayNum) {
    $days = [
        1 => 'Lunes',
        2 => 'Martes',
        3 => 'Miércoles',
        4 => 'Jueves',
        5 => 'Viernes',
        6 => 'Sábado',
        7 => 'Domingo'
    ];
    return isset($days[$dayNum]) ? $days[$dayNum] : '';
}

/**
 * Obtiene la lista de fechas ocupadas por actividades en el cronograma de Excel.
 *
 * @param int $startYear Año de inicio del ciclo escolar
 * @return array Lista de fechas YYYY-MM-DD ocupadas
 */
function getExcelOccupiedDates($startYear) {
    $jsonPath = __DIR__ . '/database/calendar_parsed_grid.json';
    if (!file_exists($jsonPath)) {
        return [];
    }
    
    $grid = json_decode(file_get_contents($jsonPath), true);
    if (empty($grid)) {
        return [];
    }
    
    $occupiedDates = [];
    $yearMonths = ['AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    $monthNumbers = [
        'AGOSTO' => '08', 'SEPTIEMBRE' => '09', 'OCTUBRE' => '10', 'NOVIEMBRE' => '11', 'DICIEMBRE' => '12',
        'ENERO' => '01', 'FEBRERO' => '02', 'MARZO' => '03', 'ABRIL' => '04', 'MAYO' => '05', 'JUNIO' => '06', 'JULIO' => '07'
    ];
    
    foreach ($grid as $mGrid) {
        foreach ($mGrid['months'] as $monthData) {
            $monthName = mb_strtoupper(trim($monthData['month']));
            $monthNum = $monthNumbers[$monthName] ?? '';
            if (empty($monthNum)) continue;
            
            $isFirstPart = in_array($monthName, $yearMonths);
            $calculatedYear = $isFirstPart ? $startYear : ($startYear + 1);
            
            $rows = $monthData['rows'];
            if (count($rows) >= 4) {
                $dayRow = $rows[1];
                $pdaRow = $rows[2];
                
                // Mapear columna a número de día
                $colToDayNum = [];
                $currentCol = 0;
                foreach ($dayRow as $i => $cell) {
                    $colspan = $cell['colspan'] ?? 1;
                    if ($i > 0) {
                        $text = trim($cell['text'] ?? '');
                        if (is_numeric($text)) {
                            $dayNum = (int)$text;
                            for ($c = 0; $c < $colspan; $c++) {
                                $colToDayNum[$currentCol + $c] = $dayNum;
                            }
                        }
                    }
                    $currentCol += $colspan;
                }
                
                // Buscar días ocupados en la fila del PDA
                $currentPdaCol = 0;
                foreach ($pdaRow as $j => $cell) {
                    $colspan = $cell['colspan'] ?? 1;
                    if ($j > 0) {
                        $text = trim($cell['text'] ?? '');
                        if (!empty($text)) {
                            for ($c = 0; $c < $colspan; $c++) {
                                $colIdx = $currentPdaCol + $c;
                                if (isset($colToDayNum[$colIdx])) {
                                    $dayNum = $colToDayNum[$colIdx];
                                    $dayStr = $dayNum < 10 ? '0' + $dayNum : $dayNum;
                                    $occupiedDates[] = $calculatedYear . '-' . $monthNum . '-' . $dayStr;
                                }
                            }
                        }
                    }
                    $currentPdaCol += $colspan;
                }
            }
        }
    }
    
    return array_unique($occupiedDates);
}

/**
 * Obtiene la lista plana de fechas (YYYY-MM-DD) de los períodos inhábiles personalizados.
 *
 * @param int $cycleId ID del ciclo escolar
 * @param PDO $pdo Conexión a la base de datos
 * @return array Array de fechas
 */
function getCustomHolidaysDates($cycleId, $pdo) {
    try {
        $stmt = $pdo->prepare("SELECT start_date, end_date FROM custom_holidays WHERE cycle_id = ?");
        $stmt->execute([$cycleId]);
        $ranges = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
    
    $dates = [];
    foreach ($ranges as $range) {
        $start = new DateTime($range['start_date']);
        $end = new DateTime($range['end_date']);
        
        $interval = new DateInterval('P1D');
        $period = new DatePeriod($start, $interval, $end->modify('+1 day'));
        
        foreach ($period as $date) {
            $dates[] = $date->format('Y-m-d');
        }
    }
    return array_unique($dates);
}

/**
 * Obtiene el mapa asociativo (fecha => etiqueta) de los períodos inhábiles personalizados.
 *
 * @param int $cycleId ID del ciclo escolar
 * @param PDO $pdo Conexión a la base de datos
 * @return array Mapa de fechas y etiquetas
 */
function getCustomHolidaysMap($cycleId, $pdo) {
    try {
        $stmt = $pdo->prepare("SELECT start_date, end_date, label FROM custom_holidays WHERE cycle_id = ?");
        $stmt->execute([$cycleId]);
        $ranges = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
    
    $map = [];
    foreach ($ranges as $range) {
        $start = new DateTime($range['start_date']);
        $end = new DateTime($range['end_date']);
        
        $interval = new DateInterval('P1D');
        $period = new DatePeriod($start, $interval, $end->modify('+1 day'));
        
        foreach ($period as $date) {
            $map[$date->format('Y-m-d')] = $range['label'];
        }
    }
    return $map;
}
