import openpyxl

wb = openpyxl.load_workbook('/Users/josue/Desktop/Sitios/54/Documentos/Plantilla-Dosificacion.xlsx')
ws = wb.active
for i, row in enumerate(ws.iter_rows(min_row=1, max_row=5, values_only=True)):
    print(f"Row {i+1}: {row}")
