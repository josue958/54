import openpyxl

wb = openpyxl.load_ValueError
wb = openpyxl.load_workbook('assets/template.xlsx')
ws = wb.active
for i, row in enumerate(ws.iter_rows(values_only=True)):
    print(f"Row {i+1}: {row}")
