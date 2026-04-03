document.addEventListener('DOMContentLoaded', () => {
    construirInterfaz();
});

function construirInterfaz() {
    const wrapper = document.querySelector('.dashboard-wrapper');
    if (!wrapper) return;

    // 1. INYECTAR OVERLAY OSCURO (Para celulares)
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    wrapper.insertBefore(overlay, wrapper.firstChild);

    // 2. INYECTAR SIDEBAR
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'mainSidebar'; // ID necesario para el móvil
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
            
            <a href="aulas.html" id="nav-aulas"><i class="fas fa-laptop-house"></i> Aula de Medios</a>
            
            <a href="personal.html" id="nav-personal"><i class="fas fa-user-shield"></i> Personal</a>
        </nav>
        <div class="sidebar-footer">
            <button onclick="cerrarSesion()" class="btn-logout">
                <i class="fas fa-sign-out-alt"></i> Salir
            </button>
        </div>
    `;
    wrapper.insertBefore(sidebar, wrapper.children[1]); // Lo inserta después del overlay

    // 3. INYECTAR BOTÓN HAMBURGUESA Y LOGICA DE CELULAR
    setTimeout(() => {
        const headerTitle = document.querySelector('.header-title h1');
        if (headerTitle && !document.getElementById('btnMenuToggle')) {
            // Creamos el botón
            const btnMenu = document.createElement('button');
            btnMenu.className = 'btn-menu-mobile';
            btnMenu.id = 'btnMenuToggle';
            btnMenu.innerHTML = '<i class="fas fa-bars"></i>';
            
            // Lo insertamos justo antes del título H1
            headerTitle.parentNode.insertBefore(btnMenu, headerTitle);

            // Logica de clics
            btnMenu.addEventListener('click', () => {
                sidebar.classList.add('open');
                overlay.classList.add('active');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
    }, 100);

    // 4. Marcar Pestaña Activa
    const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";
    const navMap = {
        "dashboard.html": "nav-inicio",
        "alumnos.html": "nav-alumnos",
        "materiales.html": "nav-materiales",
        "prestamos.html": "nav-prestamos",
        "aulas.html": "nav-aulas",
        "personal.html": "nav-personal"
    };

    const activeId = navMap[currentPage];
    if (activeId) {
        const activeLink = sidebar.querySelector(`#${activeId}`);
        if (activeLink) activeLink.classList.add('active');
    }
}

// Lógica de cerrar sesión (Sin cambios)
function cerrarSesion() {
    localStorage.removeItem('usuarioSesion');
    window.location.href = "login.html";
}


// --- LÓGICA REUTILIZABLE PARA EXPORTAR TABLAS A EXCEL ---
function exportarExcel(idTabla, nombreArchivo) {
    // 1. Obtenemos la tabla por su ID
    const tabla = document.getElementById(idTabla);
    if (!tabla) {
        console.error("No se encontró la tabla para exportar.");
        return;
    }

    // 2. Clonamos la tabla para limpiarla antes de exportar
    // (Para no alterar la vista del usuario)
    const tablaClonada = tabla.cloneNode(true);

    // Encontrar todas las filas
    const filas = tablaClonada.querySelectorAll("tr");
    
    filas.forEach(fila => {
        // En tu tabla, asumiendo que la columna "Acciones" es la última
        // la eliminamos para que no salga en el Excel
        if (fila.lastElementChild) {
            fila.removeChild(fila.lastElementChild);
        }
    });

    // 3. Convertimos la tabla clonada a un formato de Excel usando SheetJS
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

    // Pantalla de Personal: Solo Admin
    const btnExcelPersonal = document.getElementById('btnExportarPersonal');
    if (btnExcelPersonal && rol !== 'Admin') {
        btnExcelPersonal.style.display = 'none';
    }

    // Pantalla de Inventario/Materiales: Todos pueden exportar (No ocultamos nada)
});