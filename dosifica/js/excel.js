'use strict';

/**
 * js/excel.js — Exportación a Excel usando ExcelJS y la plantilla binaria
 */
const ExcelExport = (() => {

    const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // Función principal para exportar la dosificación y cronograma
    async function exportarCronograma(cycleId, planeacionId) {
        try {
            showToast('Generando archivo Excel, por favor espera...', 'info');

            // 1. Obtener ciclo y planeación de la base de datos
            const cycles = dbQuery("SELECT * FROM school_cycles WHERE id = ?", [cycleId]);
            const plans = dbQuery("SELECT * FROM planeaciones WHERE id = ?", [planeacionId]);
            
            if (!cycles.length || !plans.length) {
                throw new Error("Ciclo escolar o planeación no encontrados.");
            }
            
            const cycle = cycles[0];
            const planeacion = plans[0];
            const pdas = dbQuery("SELECT * FROM planeacion_pdas WHERE planeacion_id = ? ORDER BY pda_number ASC", [planeacionId]);

            // 2. Cargar plantilla Excel binaria
            const response = await fetch('assets/template.xlsx');
            if (!response.ok) {
                throw new Error("No se pudo cargar la plantilla Excel de la carpeta assets.");
            }
            const arrayBuffer = await response.arrayBuffer();

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const ws = workbook.getWorksheet(1);

            // 3. Escribir Encabezados
            // Fila 2: Ciclo Escolar
            ws.getCell('I2').value = `CICLO ESCOLAR: ${cycle.name.toUpperCase()}`;
            ws.getCell('AD2').value = `CICLO ESCOLAR: ${cycle.name.toUpperCase()}`;

            // Fila 4: Disciplina y Grado
            const disciplinaStr = `DISCIPLINA: ${planeacion.disciplina.toUpperCase()} - ${planeacion.grado}º GRADO`;
            ws.getCell('D4').value = disciplinaStr;
            ws.getCell('AD4').value = disciplinaStr;

            // 4. Limpiar filas de calendario (fila 6 a 60)
            for (let r = 6; r <= 60; r++) {
                const row = ws.getRow(r);
                row.values = [];
            }

            // Eliminar merges existentes desde la fila 6 en adelante
            const mergesToRemove = [];
            for (const merge in ws._merges) {
                const [start, end] = merge.split(':');
                const startRow = parseInt(start.replace(/\D/g, ''));
                if (startRow >= 6) {
                    mergesToRemove.push(merge);
                }
            }
            mergesToRemove.forEach(m => ws.unMergeCells(m));

            // 5. Calcular distribución y mapeo de fechas
            const holidays = JSON.parse(cycle.holidays || '{}');
            const schoolDays = calculateSchoolDays(cycle.start_date, cycle.total_days, holidays);
            
            const schedule = JSON.parse(planeacion.schedule || '{}');
            const sessions = mapSessions(schoolDays, schedule, cycle.period1_days, cycle.period2_days);

            // Generar el mapa de fecha -> PDA Número
            const datePdaMap = {};
            let sessionIdx = 0;
            pdas.forEach(pda => {
                const count = pda.sessions_count;
                for (let c = 0; c < count; c++) {
                    if (sessionIdx < sessions.length) {
                        const sess = sessions[sessionIdx];
                        datePdaMap[sess.date] = pda.pda_number;
                        sessionIdx++;
                    }
                }
            });

            // 6. Configurar colores y estilos
            const pdaColorsHex = [
                'FFB3BA', 'FFDFBA', 'FFFFBA', 'BAFFC9', 'BAE1FF',
                'E8BAFF', 'FFBAE8', 'C9C9FF', 'FFD1D1', 'E2F0CB'
            ];
            const getPdaColor = (pdaNum) => {
                const num = parseInt(pdaNum) || 1;
                return pdaColorsHex[(num - 1) % pdaColorsHex.length];
            };
            const HOLIDAY_COLOR = 'FFFFC6C6'; // Rojo suave para festivos

            // 7. Agrupar meses del ciclo y dibujarlos en 2 columnas (A-Y y Z-AW)
            const cycleMonths = getCycleMonths(cycle.start_date, cycle.end_date);
            const midPoint = Math.ceil(cycleMonths.length / 2);

            cycleMonths.forEach(({year, month}, index) => {
                const isLeft = index < midPoint;
                const localIndex = isLeft ? index : index - midPoint;
                const startRow = 6 + (localIndex * 5);
                const startCol = isLeft ? 1 : 26; // Columna A=1, Z=26

                const workdays = getMonthWorkdays(year, month, holidays);
                if (!workdays.length) return;

                // Fila 1: Etiqueta 'MES'
                ws.getCell(startRow, startCol).value = 'MES';
                ws.getCell(startRow, startCol).font = { bold: true, size: 9 };
                ws.getCell(startRow, startCol).alignment = { horizontal: 'center', vertical: 'middle' };

                // Fila 2: Nombre de Mes
                ws.getCell(startRow + 1, startCol).value = MONTHS_ES[month].toUpperCase();
                ws.getCell(startRow + 1, startCol).font = { bold: true, size: 9 };
                ws.getCell(startRow + 1, startCol).alignment = { horizontal: 'center', vertical: 'middle' };

                // Fila 3: Etiqueta 'PDA'
                ws.getCell(startRow + 2, startCol).value = 'PDA';
                ws.getCell(startRow + 2, startCol).font = { bold: true, size: 9 };
                ws.getCell(startRow + 2, startCol).alignment = { horizontal: 'center', vertical: 'middle' };

                // Fila 4: Etiqueta 'SEGUIMIENTO DOCENTE'
                ws.getCell(startRow + 3, startCol).value = 'SEGUIMIENTO';
                ws.getCell(startRow + 3, startCol).font = { bold: true, size: 8 };
                ws.getCell(startRow + 3, startCol).alignment = { horizontal: 'center', vertical: 'middle' };

                let currentPda = null;
                let currentHoliday = null;
                let pdaStartCol = -1;
                let holidayStartCol = -1;

                const commitBlock = (type, label, sCol, eCol, rowIdx) => {
                    if (sCol === -1) return;
                    if (sCol !== eCol) ws.mergeCells(rowIdx, sCol, rowIdx, eCol);
                    const cell = ws.getCell(rowIdx, sCol);
                    cell.value = type === 'holiday' ? label : (type === 'pda' ? `PDA ${label}` : label);
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.font = { bold: true, size: 8 };

                    if (type === 'holiday') {
                        for (let c = sCol; c <= eCol; c++) {
                            ws.getCell(rowIdx - 1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HOLIDAY_COLOR } };
                            ws.getCell(rowIdx, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HOLIDAY_COLOR } };
                        }
                    } else if (type === 'pda') {
                        const colHex = getPdaColor(label);
                        for (let c = sCol; c <= eCol; c++) {
                            ws.getCell(rowIdx, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colHex } };
                        }
                    }
                };

                workdays.forEach((dayInfo, dIndex) => {
                    const col = startCol + 1 + dIndex;
                    const dateStr = dayInfo.date;

                    // Letra del día (L, M, M, J, V)
                    const cellLetter = ws.getCell(startRow, col);
                    cellLetter.value = dayInfo.letter;
                    cellLetter.alignment = { horizontal: 'center', vertical: 'middle' };
                    cellLetter.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

                    // Número de día
                    const cellNum = ws.getCell(startRow + 1, col);
                    cellNum.value = dayInfo.num;
                    cellNum.alignment = { horizontal: 'center', vertical: 'middle' };
                    cellNum.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

                    // Verificar PDA o Festivo
                    const pdaNum = datePdaMap[dateStr];
                    const holidayLabel = holidays[dateStr];

                    if (holidayLabel) {
                        if (currentPda) { commitBlock('pda', currentPda, pdaStartCol, col - 1, startRow + 2); currentPda = null; pdaStartCol = -1; }
                        if (currentHoliday !== holidayLabel) {
                            if (currentHoliday) commitBlock('holiday', currentHoliday, holidayStartCol, col - 1, startRow + 2);
                            currentHoliday = holidayLabel;
                            holidayStartCol = col;
                        }
                    } else if (pdaNum) {
                        if (currentHoliday) { commitBlock('holiday', currentHoliday, holidayStartCol, col - 1, startRow + 2); currentHoliday = null; holidayStartCol = -1; }
                        if (currentPda !== pdaNum) {
                            if (currentPda) commitBlock('pda', currentPda, pdaStartCol, col - 1, startRow + 2);
                            currentPda = pdaNum;
                            pdaStartCol = col;
                        }
                    } else {
                        if (currentHoliday) { commitBlock('holiday', currentHoliday, holidayStartCol, col - 1, startRow + 2); currentHoliday = null; holidayStartCol = -1; }
                        if (currentPda) { commitBlock('pda', currentPda, pdaStartCol, col - 1, startRow + 2); currentPda = null; pdaStartCol = -1; }
                    }
                });

                const lastCol = startCol + workdays.length;
                if (currentHoliday) commitBlock('holiday', currentHoliday, holidayStartCol, lastCol, startRow + 2);
                if (currentPda) commitBlock('pda', currentPda, pdaStartCol, lastCol, startRow + 2);
            });

            // 8. Generar buffer y descargar archivo
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const sanitizedSubj = planeacion.disciplina.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `dosificacion-${sanitizedSubj}-${planeacion.grado}g-${planeacion.weekly_hours}hs.xlsx`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Archivo Excel descargado con éxito.', 'success');

        } catch (e) {
            console.error("Error al exportar a Excel:", e);
            showToast('Error al exportar a Excel: ' + e.message, 'error');
        }
    }

    // Funciones auxiliares para calcular días hábiles
    function calculateSchoolDays(startDate, totalDays, holidays) {
        const days = [];
        let current = new Date(startDate + 'T00:00:00');
        let count = 0;
        let limit = 0;

        while (count < totalDays && limit < 1000) {
            limit++;
            const w = current.getDay(); // 0 = Domingo, 6 = Sábado
            const dateStr = current.toISOString().split('T')[0];

            if (w !== 0 && w !== 6 && !holidays[dateStr]) {
                days.push(dateStr);
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return days;
    }

    function mapSessions(schoolDays, schedule, p1Days, p2Days) {
        const sessions = [];
        const p1Limit = p1Days;
        const p2Limit = p1Days + p2Days;

        schoolDays.forEach((dateStr, idx) => {
            const date = new Date(dateStr + 'T00:00:00');
            const dayOfWeek = date.getDay(); // 0=Dom, 1=Lun...
            
            const hours = schedule[dayOfWeek] || 0;
            if (hours > 0) {
                let period = 1;
                if (idx >= p2Limit) period = 3;
                else if (idx >= p1Limit) period = 2;

                for (let h = 0; h < hours; h++) {
                    sessions.push({ date: dateStr, period });
                }
            }
        });
        return sessions;
    }

    function getCycleMonths(startDate, endDate) {
        const months = [];
        let current = new Date(startDate + 'T00:00:00');
        let last = new Date(endDate ? (endDate + 'T00:00:00') : (startDate + 'T00:00:00'));
        if (!endDate) {
            last.setMonth(last.getMonth() + 11); // Fallback: 11 meses adicionales
        }

        const endKey = last.getFullYear() * 12 + last.getMonth();
        let currentKey = current.getFullYear() * 12 + current.getMonth();

        while (currentKey <= endKey) {
            months.push({
                year: current.getFullYear(),
                month: current.getMonth()
            });
            current.setMonth(current.getMonth() + 1);
            currentKey = current.getFullYear() * 12 + current.getMonth();
        }
        return months;
    }

    function getMonthWorkdays(year, month, holidays) {
        const workdays = [];
        const date = new Date(year, month, 1);
        const daysLabel = ["D", "L", "M", "M", "J", "V", "S"];

        while (date.getMonth() === month) {
            const w = date.getDay();
            const dateStr = date.toISOString().split('T')[0];

            if (w !== 0 && w !== 6) {
                workdays.push({
                    date: dateStr,
                    letter: daysLabel[w],
                    num: date.getDate()
                });
            }
            date.setDate(date.getDate() + 1);
        }
        return workdays;
    }

    return { exportarCronograma };
})();
