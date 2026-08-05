'use strict';

/**
 * js/excel.js — Exportación a Excel usando ExcelJS y la plantilla binaria
 */
const ExcelExport = (() => {

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
            const ws = workbook.worksheets[0];

            // 3. Escribir Encabezados
            const disciplinaStr = ` ${planeacion.disciplina.toUpperCase()}    ${planeacion.grado}º. GRADO         ${cycle.name.toUpperCase()}`;
            ws.getCell('A2').value = disciplinaStr;

            // 4. Limpiar datos de ejemplo del template
            // Remove existing merges from row 4 onwards
            const mergesToRemove = [];
            for (const merge in ws._merges) {
                const [start, end] = merge.split(':');
                const startRow = parseInt(start.replace(/\D/g, ''));
                if (startRow >= 6) {
                    mergesToRemove.push(merge);
                }
            }
            mergesToRemove.forEach(m => ws.unMergeCells(m));

            // Clear content and styles for rows 4 to 100
            for (let r = 4; r <= 100; r++) {
                const row = ws.getRow(r);
                for (let c = 1; c <= 10; c++) {
                    const cell = row.getCell(c);
                    cell.value = null;
                    cell.border = {};
                    cell.fill = { type: 'pattern', pattern: 'none' };
                }
            }

            // 5. Llenar los datos de los PDAs iterando las filas a partir de la 4
            let currentContenido = pdas.length > 0 ? pdas[0].contenido : null;
            let startMergeRow = 4;

            pdas.forEach((pda, i) => {
                const rIdx = 4 + i;
                const row = ws.getRow(rIdx);

                row.getCell(1).value = pda.contenido || '';
                row.getCell(2).value = pda.pda_number;
                row.getCell(3).value = pda.topic || '';
                row.getCell(4).value = pda.temas || '';
                row.getCell(5).value = pda.sessions_count;
                row.getCell(6).value = pda.verbo_rector || '';
                row.getCell(7).value = pda.complejidad || '';
                row.getCell(8).value = pda.rango_sugerido || '';
                row.getCell(9).value = pda.start_date || '';
                row.getCell(10).value = pda.end_date || '';

                // Style the row
                for (let colIdx = 1; colIdx <= 10; colIdx++) {
                    const cell = row.getCell(colIdx);
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: (colIdx === 2 || colIdx === 5 || colIdx === 7) ? 'center' : 'left',
                        wrapText: true
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.font = { name: 'Arial', size: 10 };
                }

                // Lógica para combinar celdas de "Contenido"
                if (i === pdas.length - 1 || pdas[i + 1].contenido !== currentContenido) {
                    if (rIdx > startMergeRow) {
                        ws.mergeCells(`A${startMergeRow}:A${rIdx}`);
                    }
                    if (i < pdas.length - 1) {
                        startMergeRow = rIdx + 1;
                        currentContenido = pdas[i + 1].contenido;
                    }
                }
            });

            // 6. Generar buffer y descargar archivo
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const sanitizedSubj = planeacion.disciplina.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            // Genera el nombre del archivo con el formato: Dosificacion-materia-grado.xlsx (sin acentos ni espacios)
            const fileName = `Dosificacion-${sanitizedSubj}-${planeacion.grado}.xlsx`;

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

    function descargarPlantilla() {
        try {
            const link = document.createElement('a');
            link.href = 'assets/template.xlsx';
            link.download = "Plantilla-Planeacion-NEM.xlsx";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Plantilla descargada.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Error al descargar la plantilla.', 'error');
        }
    }

    async function importarExcel(planeacionId, file) {
        try {
            showToast('Leyendo archivo Excel...', 'info');
            const arrayBuffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const ws = workbook.worksheets[0];

            if (!ws) throw new Error("El archivo no contiene hojas de cálculo.");

            let pdaCount = 0;
            // Primero borramos los PDAs actuales para reemplazarlos
            await window.dbRun("DELETE FROM planeacion_pdas WHERE planeacion_id = ?", [planeacionId]);

            // Leer a partir de la fila 4
            for (let r = 4; r <= 100; r++) {
                const row = ws.getRow(r);
                const pdaNum = row.getCell(2).value;
                if (!pdaNum) continue; // Si no hay número de PDA, asumimos que está vacía

                const contenido = (row.getCell(1).value || '').toString().trim();
                const topic = (row.getCell(3).value || '').toString().trim();
                const temas = (row.getCell(4).value || '').toString().trim();
                const sessionsCount = parseInt(row.getCell(5).value) || 0;
                const verbo = (row.getCell(6).value || '').toString().trim();
                const complejidad = (row.getCell(7).value || '').toString().trim();
                const rango = (row.getCell(8).value || '').toString().trim();
                const formatDateValue = (cellValue) => {
                    if (!cellValue) return '';
                    if (cellValue instanceof Date) {
                        return `${cellValue.getFullYear()}-${String(cellValue.getMonth()+1).padStart(2, '0')}-${String(cellValue.getDate()).padStart(2, '0')}`;
                    }
                    const str = cellValue.toString().trim();
                    if (str.includes('T')) return str.split('T')[0];
                    return str;
                };

                const start = formatDateValue(row.getCell(9).value);
                const end = formatDateValue(row.getCell(10).value);

                await window.dbRun(
                    `INSERT INTO planeacion_pdas(planeacion_id, pda_number, topic, verbo_rector, sessions_count, contenido, temas, complejidad, rango_sugerido, start_date, end_date) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
                    [planeacionId, pdaNum, topic, verbo, sessionsCount, contenido, temas, complejidad, rango, start, end]
                );
                pdaCount++;
            }

            // Actualizar el conteo en la tabla principal
            await window.dbRun("UPDATE planeaciones SET total_pdas = ? WHERE id = ?", [pdaCount, planeacionId]);
            showToast(`Importación completada: ${pdaCount} PDAs cargados.`, 'success');
            
            // Recargar la lista
            if (typeof window.renderPlaneacionesList === 'function') {
                window.renderPlaneacionesList();
            }

        } catch (e) {
            console.error("Error al importar Excel:", e);
            showToast('Error al importar Excel: ' + e.message, 'error');
        }
    }

    return { exportarCronograma, descargarPlantilla, importarExcel };
})();

