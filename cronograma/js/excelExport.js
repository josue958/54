'use strict';

/**
 * js/excelExport.js — Exportación a Excel usando ExcelJS
 */
const ExcelExport = (() => {

    const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // Función principal exportada
    async function exportarCronograma(cycleId, subjectId) {
        try {
            showToast('Generando Excel, por favor espera...', 'info');

            const cycle = getCycle(cycleId);
            const subject = getSubject(subjectId);
            if(!cycle || !subject) throw new Error("Ciclo o materia no encontrados");

            // Cargar plantilla
            const response = await fetch('assets/template.xlsx');
            if(!response.ok) throw new Error("No se pudo cargar la plantilla Excel.");
            const arrayBuffer = await response.arrayBuffer();

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const ws = workbook.getWorksheet(1);

            // 1. Escribir Encabezados
            // Fila 2: CICLO ESCOLAR
            ws.getCell('I2').value = `CICLO ESCOLAR: ${cycle.name}`;
            ws.getCell('AD2').value = `CICLO ESCOLAR: ${cycle.name}`;

            // Fila 3 y 4: Materia y Horas
            ws.getCell('D4').value = `DISCIPLINA: ${subject.name}`;
            ws.getCell('AD4').value = `DISCIPLINA: ${subject.name}`;

            // 2. Limpiar filas de la 6 a la 60
            for(let r = 6; r <= 60; r++) {
                const row = ws.getRow(r);
                row.values = [];
            }

            // Eliminar todos los merges existentes desde la fila 6 hacia abajo
            const mergesToRemove = [];
            for (const merge in ws._merges) {
                const [start, end] = merge.split(':');
                const startRow = parseInt(start.replace(/\\D/g, ''));
                if (startRow >= 6) {
                    mergesToRemove.push(merge);
                }
            }
            mergesToRemove.forEach(m => ws.unMergeCells(m));

            // 3. Obtener Datos
            const cycleMonths = getCycleMonths(cycle.start_date);
            const { distribution } = getPdaDistribution(subjectId);
            const holidaysMap = getAllHolidaysMap(cycleId);

            // Mapa de día -> PDA
            const dateMap = {};
            distribution.forEach(pda => {
                pda.sessions.forEach(s => { dateMap[s.date] = pda.pda_number; });
            });

            // Colores por PDA
            const pdaColorsHex = [
                'FFB3BA', 'FFDFBA', 'FFFFBA', 'BAFFC9', 'BAE1FF',
                'E8BAFF', 'FFBAE8', 'C9C9FF', 'FFD1D1', 'E2F0CB'
            ];
            const getPdaColor = (pdaNum) => {
                const num = parseInt(pdaNum) || 1;
                return pdaColorsHex[(num - 1) % pdaColorsHex.length];
            };

            const HOLIDAY_COLOR = 'FFFFC6C6'; // Rojo claro
            
            // 4. Dibujar Meses en 2 Columnas
            const midPoint = Math.ceil(cycleMonths.length / 2);
            
            cycleMonths.forEach(({year, month}, index) => {
                const isLeft = index < midPoint;
                const localIndex = isLeft ? index : index - midPoint;
                const startRow = 6 + (localIndex * 5);
                const startCol = isLeft ? 1 : 26; // Columna A=1, Columna Z=26

                const workdays = getMonthWorkdays(year, month);
                if(!workdays.length) return;

                // FILA 1: 'MES'
                ws.getCell(startRow, startCol).value = 'MES';
                ws.getCell(startRow, startCol).font = { bold: true };
                
                // FILA 2: Nombre del mes
                ws.getCell(startRow + 1, startCol).value = MONTHS_ES[month].toUpperCase();
                ws.getCell(startRow + 1, startCol).font = { bold: true };
                
                // FILA 3: 'PDA'
                ws.getCell(startRow + 2, startCol).value = 'PDA';
                ws.getCell(startRow + 2, startCol).font = { bold: true };

                // FILA 4: 'SEGUIMIENTO DOCENTE'
                ws.getCell(startRow + 3, startCol).value = 'SEGUIMIENTO DOCENTE';
                ws.getCell(startRow + 3, startCol).font = { bold: true };

                let currentPda = null;
                let currentHoliday = null;
                let pdaStartCol = -1;
                let holidayStartCol = -1;

                const commitBlock = (type, label, sCol, eCol, rowIdx) => {
                    if(sCol === -1) return;
                    if(sCol !== eCol) ws.mergeCells(rowIdx, sCol, rowIdx, eCol);
                    const cell = ws.getCell(rowIdx, sCol);
                    cell.value = type === 'holiday' ? label : (type === 'pda' ? `PDA ${label}` : label);
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.font = { bold: true, size: 8 };
                    
                    if(type === 'holiday') {
                        for(let c=sCol; c<=eCol; c++) {
                            ws.getCell(rowIdx-1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HOLIDAY_COLOR } };
                            ws.getCell(rowIdx, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HOLIDAY_COLOR } };
                        }
                    } else if (type === 'pda') {
                        const colHex = getPdaColor(label);
                        for(let c=sCol; c<=eCol; c++) {
                            ws.getCell(rowIdx, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colHex } };
                        }
                    }
                };

                workdays.forEach((dayInfo, dIndex) => {
                    const col = startCol + 1 + dIndex;
                    const dateStr = dayInfo.date;
                    
                    const cellLetter = ws.getCell(startRow, col);
                    cellLetter.value = dayInfo.letter;
                    cellLetter.alignment = { horizontal: 'center' };
                    cellLetter.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
                    
                    const cellNum = ws.getCell(startRow + 1, col);
                    cellNum.value = dayInfo.num;
                    cellNum.alignment = { horizontal: 'center' };
                    cellNum.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

                    const pdaNum = dateMap[dateStr];
                    const holidayName = holidaysMap[dateStr];

                    if(holidayName) {
                        if(currentPda) { commitBlock('pda', currentPda, pdaStartCol, col-1, startRow+2); currentPda = null; pdaStartCol = -1; }
                        if(currentHoliday !== holidayName) {
                            if(currentHoliday) commitBlock('holiday', currentHoliday, holidayStartCol, col-1, startRow+2);
                            currentHoliday = holidayName;
                            holidayStartCol = col;
                        }
                    } else if (pdaNum) {
                        if(currentHoliday) { commitBlock('holiday', currentHoliday, holidayStartCol, col-1, startRow+2); currentHoliday = null; holidayStartCol = -1; }
                        if(currentPda !== pdaNum) {
                            if(currentPda) commitBlock('pda', currentPda, pdaStartCol, col-1, startRow+2);
                            currentPda = pdaNum;
                            pdaStartCol = col;
                        }
                    } else {
                        if(currentHoliday) { commitBlock('holiday', currentHoliday, holidayStartCol, col-1, startRow+2); currentHoliday = null; holidayStartCol = -1; }
                        if(currentPda) { commitBlock('pda', currentPda, pdaStartCol, col-1, startRow+2); currentPda = null; pdaStartCol = -1; }
                    }
                });

                const lastCol = startCol + workdays.length;
                if(currentHoliday) commitBlock('holiday', currentHoliday, holidayStartCol, lastCol, startRow+2);
                if(currentPda) commitBlock('pda', currentPda, pdaStartCol, lastCol, startRow+2);
            });

            // 5. Descargar Archivo
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const sanitizedSubj = subject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `cronograma-${sanitizedSubj}-${subject.weekly_hours}hs.xlsx`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Excel generado correctamente.', 'success');

        } catch(e) {
            console.error("Error al exportar Excel:", e);
            showToast('Error al generar Excel: ' + e.message, 'error');
        }
    }

    return { exportarCronograma };
})();
