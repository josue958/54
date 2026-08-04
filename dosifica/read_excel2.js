const Excel = require('exceljs');
async function read() {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile('assets/template.xlsx');
    const worksheet = workbook.getWorksheet(1);
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
