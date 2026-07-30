'use strict';
/**
 * app.js — Router hash-based + shell de la SPA
 */

// Paleta de colores para materias
const SUBJECT_COLORS = [
    '#1e90ff','#22c55e','#f59e0b','#ef4444','#8b5cf6',
    '#ec4899','#14b8a6','#f97316','#06b6d4','#a855f7',
    '#84cc16','#fb923c','#38bdf8','#fb7185','#a3e635'
];

function subjectColor(index) {
    return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

// ──────────────────────────────────────────
//  Router
// ──────────────────────────────────────────

const routes = {
    ''          : () => renderView('dashboard'),
    'dashboard' : () => renderView('dashboard'),
    'cycles'    : () => renderView('cycles'),
    'subjects'  : () => renderView('subjects'),
    'subjects/:id': (id) => renderView('subjects', {id: parseInt(id)})
};

function navigate(hash) {
    window.location.hash = hash;
}

function handleRoute() {
    const raw   = window.location.hash.replace('#','').replace(/^\//,'');
    const parts = raw.split('/');
    const base  = parts[0] || '';
    const param = parts[1];

    updateNavActive(base || 'dashboard');

    if(param && routes[base+'/:id']) {
        routes[base+'/:id'](param);
    } else if(routes[base] !== undefined) {
        routes[base]();
    } else {
        routes['']();
    }
}

function renderView(name, params={}) {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Cargando...</p></div>';

    // Pequeño delay para dar sensación de transición
    setTimeout(() => {
        try {
            if(name === 'dashboard') {
                main.innerHTML = DashboardView.render(params);
                DashboardView.init(params);
            } else if(name === 'cycles') {
                main.innerHTML = CyclesView.render(params);
                CyclesView.init(params);
            } else if(name === 'subjects') {
                main.innerHTML = SubjectsView.render(params);
                SubjectsView.init(params);
            }
        } catch(e) {
            console.error('[Router] Error rendering view:', e);
            main.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:var(--color-danger);">
                <h3>Error al cargar la vista</h3><p>${e.message}</p>
            </div>`;
        }
    }, 80);
}

function updateNavActive(route) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-item[data-route="${route}"]`);
    if (activeLink) activeLink.classList.add('active');
}

function updateSidebar() {
}

// ──────────────────────────────────────────
//  Toasts / Notificaciones
// ──────────────────────────────────────────

let _toastTimer = null;

function showToast(message, type='success') {
    const container = document.getElementById('toast-container');
    if(!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span>
        <span>${escHtml(message)}</span>
        <button onclick="this.parentElement.remove()" class="toast-close">×</button>
    `;
    container.appendChild(toast);

    setTimeout(() => { toast.classList.add('toast-visible'); }, 10);
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ──────────────────────────────────────────
//  Utilidades
// ──────────────────────────────────────────

function escHtml(str) {
    if(str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
}

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ──────────────────────────────────────────
//  Exportar / Importar UI
// ──────────────────────────────────────────

function handleExport() {
    exportDatabase();
    showToast('Base de datos exportada correctamente.');
}

async function handleImport() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.sqlite,.db';
    input.onchange = async () => {
        if(!input.files[0]) return;
        try {
            await importDatabase(input.files[0]);
            showToast('Base de datos importada. Recargando...');
            setTimeout(() => window.location.reload(), 1200);
        } catch(e) {
            showToast('Error al importar: '+e.message, 'error');
        }
    };
    input.click();
}

async function handleReset() {
    if(!confirm('¿Seguro que deseas restablecer la base de datos a los datos de ejemplo? Se perderán todos los cambios.')) return;
    await resetDatabase();
    showToast('Base de datos restablecida.');
    setTimeout(() => window.location.reload(), 1200);
}

// ──────────────────────────────────────────
//  Arranque
// ──────────────────────────────────────────

async function bootApp() {
    const splash = document.getElementById('splash');
    try {
        await initDB();
        splash?.remove();
        updateSidebar();
        window.addEventListener('hashchange', handleRoute);
        handleRoute();
    } catch(e) {
        if(splash) {
            splash.innerHTML = `<div style="color:#ef4444;text-align:center;padding:40px;">
                <h2>Error al iniciar la base de datos</h2>
                <p>${e.message}</p>
                <p>Asegúrate de tener conexión a internet para cargar sql.js la primera vez.</p>
            </div>`;
        }
        console.error('[Boot] Error:', e);
    }
}

document.addEventListener('DOMContentLoaded', bootApp);
