function formatMarkdownTable(text) {
    if (!text) return '<em>(Sin registro)</em>';
    if (!text.includes('|')) return text.replace(/\n/g, '<br>');
    
    let html = '';
    const lines = text.split('\n');
    let inTable = false;
    let isHeader = false;
    
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('|')) {
            if (!inTable) {
                html += '<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:15px;">';
                inTable = true;
                isHeader = true;
            }
            // Ignorar fila de separadores de markdown |---|---|
            if (line.replace(/\|/g, '').replace(/-/g, '').replace(/:/g, '').replace(/ /g, '').trim() === '') {
                isHeader = false;
                continue;
            }
            
            const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
            html += isHeader ? '<tr class="header-bg">' : '<tr>';
            for (let cell of cells) {
                html += `<td style="padding: 5px; border: 1px solid #000;">${cell}</td>`;
            }
            html += '</tr>';
            if (inTable && isHeader) {
                isHeader = false;
            }
        } else {
            if (inTable) {
                html += '</table>';
                inTable = false;
            }
            if (line !== '') {
                html += line + '<br>';
            }
        }
    }
    if (inTable) html += '</table>';
    return html;
}

function exportPdaToWord(btn) {
    if (!currentPdaDetailRow || !activePlaneacionId) {
        showToast('Debes tener una planeación y PDA activos.', 'error');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = "⏳ Generando documento...";
    }

    // Usamos setTimeout para permitir que el navegador actualice la UI del botón
    setTimeout(() => {
        try {
            const plans = dbQuery("SELECT * FROM planeaciones WHERE id = ?", [activePlaneacionId]);
            if (!plans.length) throw new Error("No hay planeación activa.");
            const plan = plans[0];

            const cycles = dbQuery("SELECT name FROM school_cycles WHERE id = ?", [plan.cycle_id]);
            const cicloName = cycles.length ? cycles[0].name : 'Desconocido';
            const gradoName = plan.grado + "° Grado";

            // Recolectar datos del PDA actual
    const pdaNum = currentPdaDetailRow.querySelector('.col-no').innerText;
    const pdaTopic = currentPdaDetailRow.querySelector('.pda-topic').value;
    const pdaSesiones = currentPdaDetailRow.querySelector('.pda-sessions').value;
    
    // Obtener las fechas
    const startNode = currentPdaDetailRow.querySelector('.pda-start-date');
    const endNode = currentPdaDetailRow.querySelector('.pda-end-date');
    const pdaStartDate = startNode ? startNode.value : '';
    const pdaEndDate = endNode ? endNode.value : '';
    const dateRangeStr = (pdaStartDate && pdaEndDate) ? `${pdaStartDate} a ${pdaEndDate}` : '';

    // Datos del formulario modal
    const escuela = document.getElementById('pda-escuela').value || 'Escuela Secundaria Técnica No. " "';
    const cct = document.getElementById('pda-cct').value || 'C.C.T.';
    const campoFormativo = document.getElementById('pda-campo-formativo').value || '';
    const profesor = document.getElementById('pda-profesor').value || '';
    const sugerencia = document.getElementById('pda-sugerencia-eval').value || '';
    const ejes = document.getElementById('pda-ejes').value || '';
    const proyecto = document.getElementById('pda-nombre-proyecto').value || '';
    const producto = document.getElementById('pda-producto').value || '';
    const problematica = document.getElementById('pda-problematica').value || '';
    const proposito = document.getElementById('pda-proposito').value || '';
    const rawDesarrollo = document.getElementById('pda-desarrollo-sesiones').value || '';
    const desarrollo = rawDesarrollo.replace(/\n/g, '<br>');
    const rubrica = formatMarkdownTable(document.getElementById('pda-rubrica').value);
    const teoria = (document.getElementById('pda-teoria').value || '').replace(/\n/g, '<br>');
    const observaciones = (document.getElementById('pda-observaciones').value || '').replace(/\n/g, '<br>');
    const firmaRealizo = document.getElementById('pda-firma-realizo').value || '';
    const firmaReviso = document.getElementById('pda-firma-reviso').value || '';

    // Estructura HTML para Word (.doc)
    const htmlTemplate = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <title>Planeación PDA</title>
        <style>
            body { font-family: "Arial", sans-serif; font-size: 11pt; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            td, th { border: 1px solid #000; padding: 5px; vertical-align: top; }
            .header-bg { background-color: #f2f2f2; font-weight: bold; text-align: center; }
            .bold { font-weight: bold; }
            .center { text-align: center; }
            .no-border { border: none !important; }
            h2, h3 { margin-bottom: 10px; color: #333; text-align: center; }
            .page-break { page-break-before: always; }
        </style>
    </head>
    <body>

        <!-- P01: Encabezado Institucional -->
        <table>
            <tr>
                <td colspan="4" class="header-bg" style="font-size: 14pt; padding: 15px;">
                    Gobierno del Estado de México<br>
                    Servicios Educativos Integrados al Estado de México<br>
                    ${escuela}<br>
                    ${cct}<br>
                    Ciclo Escolar ${cicloName}
                </td>
            </tr>
            <tr>
                <td class="bold">Nombre del profesor(a)</td>
                <td colspan="3">${profesor}</td>
            </tr>
            <tr>
                <td class="bold">Grado y grupos</td>
                <td>${gradoName}</td>
                <td class="bold">Periodo / Trimestre</td>
                <td>${dateRangeStr}</td>
            </tr>
            <tr>
                <td class="bold">Disciplina</td>
                <td>${plan.disciplina}</td>
                <td class="bold">Campo Formativo</td>
                <td>${campoFormativo}</td>
            </tr>
            <tr>
                <td class="bold">Sugerencia de Evaluación</td>
                <td colspan="3">${sugerencia}</td>
            </tr>
            <tr>
                <td class="bold">Ejes articuladores</td>
                <td colspan="3">${ejes}</td>
            </tr>
            <tr>
                <td class="bold">Nombre del proyecto</td>
                <td colspan="3">${proyecto}</td>
            </tr>
            <tr>
                <td class="bold">Problemática</td>
                <td colspan="3">${problematica}</td>
            </tr>
            <tr>
                <td class="bold">Propósito</td>
                <td colspan="3">${proposito}</td>
            </tr>
            <tr>
                <td class="bold">Producto</td>
                <td colspan="3">${producto}</td>
            </tr>
            <tr>
                <td class="bold">PDA</td>
                <td colspan="3">${pdaTopic}</td>
            </tr>
            <tr>
                <td class="bold">Número de sesiones</td>
                <td colspan="3">${pdaSesiones} Sesiones</td>
            </tr>
        </table>

        <!-- P02: Desarrollo Didáctico -->
        <div class="page-break"></div>
        <h2>PLANEACIÓN DIDÁCTICA (Desarrollo de las sesiones)</h2>
        <table>
            <tr>
                <td style="padding: 15px;">
                    ${desarrollo || '<em>(Sin desarrollo registrado)</em>'}
                </td>
            </tr>
        </table>

        <!-- P03: Rúbrica de Evaluación -->
        <div class="page-break"></div>
        <h2>RÚBRICA DE EVALUACIÓN FORMATIVA</h2>
        <table>
            <tr>
                <td style="padding: 15px;">
                    ${rubrica || '<em>(Sin rúbrica registrada)</em>'}
                </td>
            </tr>
        </table>

        <!-- P04: Observaciones y Firmas -->
        <div class="page-break"></div>
        <br><br>
        <table>
            <tr class="header-bg">
                <td>Observaciones</td>
            </tr>
            <tr>
                <td style="height: 100px;">
                    ${observaciones}
                </td>
            </tr>
        </table>

        <br><br><br><br><br><br>
        <table class="no-border">
            <tr class="no-border center">
                <td class="no-border" width="50%">
                    ___________________________________<br>
                    <span class="bold">REALIZÓ</span><br>
                    ${firmaRealizo || 'Nombre y firma'}
                </td>
                <td class="no-border" width="50%">
                    ___________________________________<br>
                    <span class="bold">REVISÓ / Vo. Bo.</span><br>
                    ${firmaReviso || 'Nombre y firma'}
                </td>
            </tr>
        </table>

        <!-- P05: Seguimiento de Grupos -->
        <div class="page-break"></div>
        <h2>SEGUIMIENTO DE SESIONES Y ACTIVIDADES POR GRUPO</h2>
        <table>
            <tr class="header-bg">
                <td width="30%">Actividad / Sesión</td>
                <td width="15%">Fecha de aplicación</td>
                <td width="11%">Grupo: A</td>
                <td width="11%">Grupo: B</td>
                <td width="11%">Grupo: C</td>
                <td width="11%">Grupo: D</td>
                <td width="11%">Grupo: E</td>
            </tr>
            ${Array.from({length: parseInt(pdaSesiones) || 10}).map((_, i) => {
                const sNum = i + 1;
                let summary = `Sesión ${sNum}`;
                // Buscar "Sesión X" y capturar hasta 100 caracteres significativos posteriores
                const regex = new RegExp(`Sesi[óo]n\\s*${sNum}\\b[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]*([\\s\\S]{1,120})`, 'i');
                const match = rawDesarrollo.match(regex);
                if (match && match[1]) {
                    let content = match[1].replace(/\\n/g, ' ').replace(/\\*/g, '').replace(/#/g, '').trim();
                    content = content.split(/(Sesi[óo]n|Momento)/i)[0].trim(); // Detenerse si empieza la siguiente sesión
                    if (content.length > 80) content = content.substring(0, 77) + '...';
                    if (content.length > 3) summary = `Sesión ${sNum}: ${content}`;
                }
                return `
                <tr>
                    <td style="height: 35px; padding: 5px; font-size: 11px;">${summary}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>`;
            }).join('')}
        </table>

        <!-- P06: Teoría -->
        <div class="page-break"></div>
        <h2>TEORÍA PARA EL DOCENTE</h2>
        <table>
            <tr>
                <td style="padding: 15px;">
                    ${teoria || '<em>(Sin teoría registrada)</em>'}
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const htmlContent = `<!DOCTYPE html>${htmlTemplate}`;
    const blob = htmlDocx.asBlob(htmlContent);
    
    const disciplinaStr = (plan.disciplina || 'Disciplina').replace(/\s+/g, '-');
    const gradoStr = (gradoName).replace(/\s+/g, '-');
    const fileName = `${disciplinaStr}-${gradoStr}-PDA${pdaNum}.docx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    showToast('Documento exportado exitosamente', 'success');
        } catch(err) {
            console.error(err);
            showToast('Error al exportar: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "📄 Exportar .docx";
            }
        }
    }, 800); // 800ms de retraso para mostrar la carga
}
