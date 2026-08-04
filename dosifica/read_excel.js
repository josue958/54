const Excel = require('exceljs');
async function read() {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile('../TABLA DOSIFICACIÓN 1o. MATE 5Hs.xlsx');
    const worksheet = workbook.worksheets[0];
    for(let i=1; i<=15; i++) {
        let row = worksheet.getRow(i);
        let rowData = [];
        row.eachCell({ includeEmpty: true }, function(cell, colNumber) {
            rowData.push(cell.value);
        });
        console.log("Row " + i + ": ", JSON.stringify(rowData));
    }
}
read();
