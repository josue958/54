## Goal
Update the Excel export functionality to use the provided template `TABLA DOSIFICACIÓN 1o. MATE 5Hs.xlsx` and populate it with the PDA planning data.

## Proposed Changes
1. **Update Template:**
   - Copy `/Users/josue/Desktop/Sitios/54/TABLA DOSIFICACIÓN 1o. MATE 5Hs.xlsx` into `assets/template.xlsx`.
2. **Modify `js/excel.js`:**
   - Update `exportarCronograma` to populate the new template.
   - Adjust the header dynamic text to match the new template (Row 4 instead of Row 2/4). We'll set cell `A4` to contain the discipline, grade, and cycle information if needed.
   - Remove the existing logic that clears the calendar columns (columns 9 to 60).
   - Write the PDA data starting from row 6, populating columns A through H with the corresponding data (Contenido, No PROGR. PDA, PDA, Temas, No. Sesiones, Verbo, Complejidad, Rango Sugerido).
   - Implement logic to merge the cells in the "CONTENIDO" column (Column A) where the content spans multiple rows.
   - Remove the calendar generation logic (since the new format does not seem to include the calendar on the right).

## Open Questions
- Should the calendar generation on the right side of the sheet be completely removed, or does the new template still require the calendar to be generated starting from column I? (Based on the template it seems the focus is only on the PDA table, but please confirm).
- Should we overwrite the school name and professor fields in row 2? If so, where does this information come from?
