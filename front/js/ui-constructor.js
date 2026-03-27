document.addEventListener('DOMContentLoaded', () => {
    construirInterfaz();
});

function construirInterfaz() {
    const wrapper = document.querySelector('.dashboard-wrapper');
    if (!wrapper) return;

    // 1. Inyectar Sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <i class="fas fa-school"></i>
            <span>Gestor Primaria Benito Juarez</span>
        </div>
        <nav class="menu">
            <a href="dashboard.html" id="nav-inicio"><i class="fas fa-chart-line"></i> Inicio</a>
            <a href="alumnos.html" id="nav-alumnos"><i class="fas fa-user-graduate"></i> Alumnos</a>
            <a href="materiales.html" id="nav-materiales"><i class="fas fa-book"></i> Inventario</a>
            <a href="prestamos.html" id="nav-prestamos"><i class="fas fa-hand-holding"></i> Préstamos</a>
            <a href="personal.html" id="nav-personal"><i class="fas fa-user-shield"></i> Personal</a>
        </nav>
        <div class="sidebar-footer">
            <button onclick="cerrarSesion()" class="btn-logout">
                <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
        </div>
    `;

    // Insertar el sidebar al inicio del wrapper
    wrapper.prepend(sidebar);

    // 2. Marcar la página activa
    const path = window.location.pathname;
    const pagina = path.split("/").pop();
    
    if (pagina.includes('dashboard')) document.getElementById('nav-inicio').classList.add('active');
    if (pagina.includes('alumnos')) document.getElementById('nav-alumnos').classList.add('active');
    if (pagina.includes('materiales')) document.getElementById('nav-materiales').classList.add('active');
    if (pagina.includes('prestamos')) document.getElementById('nav-prestamos').classList.add('active');
    if (pagina.includes('personal')) document.getElementById('nav-personal').classList.add('active');
}

// --- FUNCIÓN GLOBAL PARA EXPORTAR TABLAS A EXCEL ---
// --- FUNCIÓN GLOBAL PARA EXPORTAR TABLAS A EXCEL ---
function exportarTablaExcel(idTabla, nombreArchivo) {
    const tablaOriginal = document.getElementById(idTabla);
    if (!tablaOriginal) {
        Swal.fire('Error', 'No se encontró la tabla para exportar.', 'error');
        return;
    }

    // 1. Clonamos la tabla en memoria para no afectar lo que ve el usuario
    const tablaClonada = tablaOriginal.cloneNode(true);

    // 2. Eliminamos la última columna ("Acciones") para que el Excel salga limpio
    const filas = tablaClonada.querySelectorAll('tr');
    filas.forEach(fila => {
        if (fila.children.length > 0) {
            fila.removeChild(fila.lastElementChild);
        }
    });

    // 3. Convertimos la tabla a un libro de Excel usando SheetJS
    // raw: true evita que Excel convierta "2026-001" en fechas raras
    const wb = XLSX.utils.table_to_book(tablaClonada, { sheet: "Reporte", raw: true });
    
    // 4. Agregamos la fecha actual al nombre del archivo
    const fecha = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
    XLSX.writeFile(wb, `${nombreArchivo}_${fecha}.xlsx`);

    // 5. NUEVO: Alerta de éxito elegante (tipo Toast emergente)
    Swal.fire({
        title: '¡Descarga completada!',
        text: 'El archivo Excel se ha guardado en tu computadora.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

// --- PROTECCIÓN DE BOTONES DE EXCEL POR ROLES ---
document.addEventListener('DOMContentLoaded', () => {
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;

    // Pantalla de Alumnos: Solo Admin y Secretaria
    const btnExcelAlumnos = document.getElementById('btnExportarExcel');
    if (btnExcelAlumnos && rol !== 'Admin' && rol !== 'Secretaria') {
        btnExcelAlumnos.style.display = 'none';
    }

    // Pantalla de Materiales/Inventario: Solo Admin e Inventario
    const btnExcelMateriales = document.getElementById('btnExportarExcelMat');
    if (btnExcelMateriales && rol !== 'Admin' && rol !== 'Inventario') {
        btnExcelMateriales.style.display = 'none';
    }
});