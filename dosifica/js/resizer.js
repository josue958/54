document.addEventListener('DOMContentLoaded', function () {
    // Delay initialization slightly to ensure table is rendered
    setTimeout(initTableResizer, 500);
});

function initTableResizer() {
    const table = document.getElementById('planner-table');
    if (!table) return;

    const cols = table.querySelectorAll('thead th');
    
    cols.forEach((col, index) => {
        // Create a resizer element
        const resizer = document.createElement('div');
        resizer.classList.add('table-resizer');

        col.style.position = 'relative'; 
        col.appendChild(resizer);

        createResizableColumn(col, resizer, index, table);
    });
}

function createResizableColumn(col, resizer, index, table) {
    let x = 0;
    let w = 0;
    
    const colgroup = table.querySelector('colgroup');
    let colElement = null;
    if (colgroup) {
        colElement = colgroup.querySelectorAll('col')[index];
    }

    const mouseDownHandler = function (e) {
        x = e.clientX;
        const styles = window.getComputedStyle(col);
        w = parseInt(styles.width, 10);
        
        if (colgroup) {
            const allThs = table.querySelectorAll('thead th');
            const allCols = colgroup.querySelectorAll('col');
            allCols.forEach((c, i) => {
                const thStyle = window.getComputedStyle(allThs[i]);
                c.style.width = thStyle.width;
            });
        }

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        resizer.classList.add('resizing');
    };

    const mouseMoveHandler = function (e) {
        const dx = e.clientX - x;
        const newWidth = Math.max(50, w + dx);
        if (colElement) {
            colElement.style.width = `${newWidth}px`;
        } else {
            col.style.width = `${newWidth}px`;
        }
    };

    const mouseUpHandler = function () {
        resizer.classList.remove('resizing');
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        
        // Notify the app that changes were made so the Save button pulses
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved('planner-btn-save');
        }
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
}
