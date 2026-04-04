let isRestoringScroll = false; 

// --- FUNCIÓN ANTI-DUPLICADOS PARA ESCÁNER ---
function habilitarScanner(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // El escáner presiona "Enter" rapidísimo al terminar de leer. 
    // Al detectarlo, seleccionamos el texto para que el próximo escaneo lo sobrescriba.
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.select(); 
        }
    });
    
    // Por si el usuario da clic manual con el mouse, también se selecciona todo
    input.addEventListener('focus', function() {
        this.select();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarAlumnos();
    habilitarScanner('txtFiltrarAlumnos'); // Activamos el escáner en alumnos

    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;

    if (rol !== 'Admin' && rol !== 'Secretaria') {
        const formRegistro = document.getElementById('formNuevoAlumno');
        if (formRegistro) {
            const tarjetaRegistro = formRegistro.closest('.card-accion');
            if (tarjetaRegistro) {
                tarjetaRegistro.style.display = 'none';
            } else {
                formRegistro.style.display = 'none'; 
            }
        }
        
        const btnSincro = document.getElementById('btnSincronizarFotos');
        if(btnSincro) btnSincro.style.display = 'none';

        const btnImpMasiva = document.getElementById('btnImprimirCredenciales');
        if(btnImpMasiva) btnImpMasiva.style.display = 'none';
    }

    if (rol !== 'Admin') {
        const btnPromocion = document.getElementById('btnPromocion');
        if (btnPromocion) btnPromocion.style.display = 'none';
    }

    window.addEventListener('scroll', () => {
        if (!isRestoringScroll) {
            const inputBuscador = document.getElementById('txtFiltrarAlumnos');
            const term = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
            sessionStorage.setItem('scroll_alumnos_ventana_' + term, window.scrollY);
        }
    });

    const contenedorTabla = document.querySelector('.tabla-container');
    if (contenedorTabla) {
        contenedorTabla.addEventListener('scroll', () => {
            if (!isRestoringScroll) {
                const inputBuscador = document.getElementById('txtFiltrarAlumnos');
                const term = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
                sessionStorage.setItem('scroll_alumnos_interno_' + term, contenedorTabla.scrollTop);
            }
        });
    }
});

async function cargarAlumnos() {
    const tabla = document.getElementById('tablaAlumnosBody');
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;
    const puedeEditar = rol === 'Admin' || rol === 'Secretaria';

    try {
        const response = await fetch(`${API_URL}/Usuarios/alumnos`);
        if (!response.ok) throw new Error("Error al obtener alumnos");

        const alumnos = await response.json();
        tabla.innerHTML = '';

        if (alumnos.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay alumnos.</td></tr>';
            return;
        }

        let htmlFilas = '';

        alumnos.forEach(a => {
            const nombre = a.nombre || "";
            const apellidos = a.apellidos || "";
            const nombreCompleto = `${nombre} ${apellidos}`.trim();

            const btnHistorial = `<button onclick="verHistorialAlumno(${a.id}, '${nombreCompleto.replace(/'/g, "\\'")}')" class="btn-historial" title="Ver Historial"><i class="fa-solid fa-eye"></i></button>`;
            const btnFoto = `<button onclick="abrirSubirFoto('${a.matricula}')" style="background-color: #3498db !important; padding: 8px 12px !important; border-radius: 6px !important; border: none; color: white; cursor: pointer;" title="Subir Foto"><i class="fas fa-camera"></i></button>`;
            const btnCredencial = `<button onclick="mostrarCredencial('${nombreCompleto.replace(/'/g, "\\'")}', '${a.matricula}', '${a.grupo}', '${a.fotoUrl || ""}')" style="background-color: #27ae60 !important; padding: 8px 12px !important; border-radius: 6px !important; border: none; color: white; cursor: pointer;" title="Generar Credencial"><i class="fas fa-id-badge"></i></button>`;
            
            let acciones = "";
            
            if (puedeEditar) {
                acciones = `
                    <div class="acciones-flex">
                        ${btnHistorial}
                        ${btnFoto}
                        ${btnCredencial}
                        <button onclick="prepararEdicionAlumno(${a.id}, '${nombre.replace(/'/g, "\\'")}', '${apellidos.replace(/'/g, "\\'")}', '${a.grupo}')" class="btn-editar-naranja" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="eliminarAlumno(${a.id})" class="btn-borrar-rojo" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            } else {
                acciones = `
                    <div class="acciones-flex">
                        ${btnHistorial}
                        <span style="color:gray; font-size:0.85rem; margin-left: 5px;">Solo lectura</span>
                    </div>
                `;
            }

            htmlFilas += `
                <tr data-matricula="${a.matricula}" data-nombre="${nombreCompleto.replace(/"/g, '&quot;')}" data-grupo="${a.grupo || ''}" data-foto="${a.fotoUrl || ''}">
                    <td><strong>${a.matricula}</strong></td>
                    <td>${nombreCompleto}</td>
                    <td>${a.grupo}</td>
                    <td style="text-align:center;">${acciones}</td>
                </tr>
            `;
        });

        tabla.innerHTML = htmlFilas;

        aplicarFiltrosAlumnos();
        const inputBuscar = document.getElementById('txtFiltrarAlumnos');
        const termActual = inputBuscar ? inputBuscar.value.toLowerCase().trim() : '';

        if (termActual !== '') {
            const evento = new Event('input');
            inputBuscar.dispatchEvent(evento);
        } else {
            restaurarAmbosScrolls('');
        }

    } catch (error) {
        console.error(error);
        tabla.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error de servidor. Revisa la base de datos.</td></tr>';
    }
}

function restaurarAmbosScrolls(term) {
    isRestoringScroll = true; 
    const scrollVentana = sessionStorage.getItem('scroll_alumnos_ventana_' + term);
    const scrollInterno = sessionStorage.getItem('scroll_alumnos_interno_' + term);
    const contenedorTabla = document.querySelector('.tabla-container');
    
    requestAnimationFrame(() => {
        window.scrollTo({ top: scrollVentana ? parseInt(scrollVentana) : 0, behavior: 'instant' });
        if (contenedorTabla) contenedorTabla.scrollTop = scrollInterno ? parseInt(scrollInterno) : 0;
        setTimeout(() => { isRestoringScroll = false; }, 150); 
    });
}

async function registrarAlumno() {
    const id = document.getElementById('txtIdAlumno').value;
    const nombre = document.getElementById('nombreAlumno').value.trim().toUpperCase();
    const apellidos = document.getElementById('apellidoAlumno').value.trim().toUpperCase();
    const grado = document.getElementById('gradoAlumno').value;
    const grupoLetra = document.getElementById('grupoLetra').value;

    const cantidadApellidos = apellidos.split(/\s+/).length;
    if (cantidadApellidos < 2) {
        Swal.fire('Atención', 'Debes ingresar ambos apellidos (paterno y materno).', 'warning');
        return; 
    }
    
    const resultado = document.getElementById('resultadoRegistro');
    const url = id ? `${API_URL}/Usuarios/editar-alumno/${id}` : `${API_URL}/Usuarios/crear`;
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombre, apellidos: apellidos, grupo: `${grado} ${grupoLetra}` })
        });

        if (response.ok) {
            const data = await response.json();
            resultado.innerHTML = `<span style="color:green;">✅ ${data.mensaje}</span>`;
            
            // Reutilizamos la nueva función de limpiar para resetear todo el formulario
            limpiarFormularioAlumno();
            
            cargarAlumnos(); 
        } else {
            const errorMsg = await response.text();
            resultado.innerHTML = `<span style="color:red;">❌ Error: ${errorMsg}</span>`;
        }
    } catch (error) {
        resultado.innerHTML = `<span style="color:red;">⚠️ Error de conexión.</span>`;
    }
}

// --- NUEVA FUNCION DE LIMPIAR ---
function limpiarFormularioAlumno() {
    document.getElementById('formNuevoAlumno').reset();
    document.getElementById('txtIdAlumno').value = "";
    document.querySelector('.card-header h2').innerHTML = `<i class="fas fa-user-plus"></i> Registrar Nuevo Alumno`;
    document.querySelector('#formNuevoAlumno button[type="submit"]').innerHTML = `<i class="fas fa-id-card"></i> Registrar y Generar Matrícula`;
    document.getElementById('resultadoRegistro').innerHTML = ""; // Limpia también mensajes de error/éxito si los hubiera
}

async function eliminarAlumno(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto! El alumno será dado de baja.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c', cancelButtonColor: '#94a3b8',  
        confirmButtonText: '<i class="fa-solid fa-trash" style="color: white;"></i> Sí, eliminar',
        cancelButtonText: '<i class="fa-solid fa-xmark" style="color: white;"></i> Cancelar'
    });

    if (confirmacion.isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/Usuarios/${id}`, { method: 'DELETE' });
            if (response.ok) {
                Swal.fire({ title: '¡Eliminado!', text: 'El alumno ha sido borrado correctamente.', icon: 'success', confirmButtonColor: '#27ae60' });
                cargarAlumnos();
            } else {
                const errorText = await response.text();
                Swal.fire({ title: 'No se pudo eliminar', text: errorText, icon: 'error', confirmButtonColor: '#3498db' });
            }
        } catch (error) { Swal.fire('Error de conexión', 'No se pudo contactar con el servidor.', 'error'); }
    }
}

function prepararEdicionAlumno(id, nombre, apellidos, grupoCompleto) {
    document.getElementById('txtIdAlumno').value = id;
    document.getElementById('nombreAlumno').value = nombre;
    document.getElementById('apellidoAlumno').value = apellidos;
    if(grupoCompleto) {
        const partes = grupoCompleto.split(" ");
        if(partes.length === 2) {
            document.getElementById('gradoAlumno').value = partes[0];
            document.getElementById('grupoLetra').value = partes[1];
        } else if (grupoCompleto === "Egresado") {
            document.getElementById('gradoAlumno').value = "";
            document.getElementById('grupoLetra').value = "";
        }
    }
    document.querySelector('.card-header h2').innerHTML = `<i class="fas fa-user-edit"></i> Editando: ${nombre}`;
    document.querySelector('#formNuevoAlumno button[type="submit"]').innerHTML = `<i class="fas fa-save"></i> Guardar Cambios`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function preguntarExportacionExcel() {
    const termGrado = document.getElementById('selFiltroGrado').value;
    const termLetra = document.getElementById('selFiltroLetra').value;
    const termText = document.getElementById('txtFiltrarAlumnos').value;

    if (!termGrado && !termLetra && !termText) {
        exportarTablaExcel('tablaAlumnos', 'Reporte_Escuela_Completa', false);
        return;
    }

    const result = await Swal.fire({
        title: 'Opciones de Exportación', text: 'Tienes filtros de búsqueda activos. ¿Qué lista deseas descargar en Excel?', icon: 'question',
        showCancelButton: true, showDenyButton: true, confirmButtonColor: '#27ae60', denyButtonColor: '#2c3e50', cancelButtonColor: '#95a5a6',
        confirmButtonText: '<i class="fas fa-filter"></i> Lista Filtrada', denyButtonText: '<i class="fas fa-users"></i> Toda la Escuela', cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        let sufijo = "";
        if(termGrado) sufijo += termGrado;
        if(termLetra) sufijo += termLetra;
        let nombre = sufijo ? `Reporte_Alumnos_${sufijo}` : 'Reporte_Alumnos_Filtrados';
        exportarTablaExcel('tablaAlumnos', nombre, true); 
    } else if (result.isDenied) {
        exportarTablaExcel('tablaAlumnos', 'Reporte_Escuela_Completa', false); 
    }
}

let tiempoEsperaBuscadorAlumnos;
const inputBuscadorAlumnos = document.getElementById('txtFiltrarAlumnos');
const selectFiltroGrado = document.getElementById('selFiltroGrado');
const selectFiltroLetra = document.getElementById('selFiltroLetra');
const btnBorrarEgresados = document.getElementById('btnBorrarEgresados');

function aplicarFiltrosAlumnos() {
    const termText = inputBuscadorAlumnos ? inputBuscadorAlumnos.value.toLowerCase().trim() : '';
    const termGrado = selectFiltroGrado ? selectFiltroGrado.value : '';
    const termLetra = selectFiltroLetra ? selectFiltroLetra.value : '';
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};

    if (termGrado === "Egresado") {
        if(selectFiltroLetra) selectFiltroLetra.style.display = 'none';
        if (sesion.rol === 'Admin' || sesion.rol === 'Secretaria') {
            if(btnBorrarEgresados) btnBorrarEgresados.style.display = 'inline-block';
        }
    } else {
        if(selectFiltroLetra) selectFiltroLetra.style.display = 'inline-block';
        if(btnBorrarEgresados) btnBorrarEgresados.style.display = 'none';
    }

    const rows = document.querySelectorAll('#tablaAlumnosBody tr');
    
    rows.forEach(r => {
        if (!r.children[2]) return;
        const tdGrupo = r.children[2].textContent;
        const textoFila = r.textContent.toLowerCase();

        const coincideTexto = termText === '' || textoFila.includes(termText);
        const coincideGrado = termGrado === '' || tdGrupo.includes(termGrado);
        const coincideLetra = termLetra === '' || termGrado === "Egresado" || tdGrupo.includes(termLetra);

        r.style.display = (coincideTexto && coincideGrado && coincideLetra) ? '' : 'none';
    });

    if(termText === '' && termGrado === '' && termLetra === ''){
        restaurarAmbosScrolls(termText);
    }
}

if (inputBuscadorAlumnos) {
    inputBuscadorAlumnos.addEventListener('input', () => {
        clearTimeout(tiempoEsperaBuscadorAlumnos);
        tiempoEsperaBuscadorAlumnos = setTimeout(aplicarFiltrosAlumnos, 500); 
    });
}
if (selectFiltroGrado) { selectFiltroGrado.addEventListener('change', aplicarFiltrosAlumnos); }
if (selectFiltroLetra) { selectFiltroLetra.addEventListener('change', aplicarFiltrosAlumnos); }

async function promoverCicloEscolar() {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro de cerrar el ciclo?',
        text: "¡Atención! Todos los alumnos subirán un grado automáticamente (Ej. de 1° a 2°) y los alumnos de 6° pasarán a ser Egresados.",
        icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#2c3e50', cancelButtonColor: '#94a3b8',  
        confirmButtonText: '<i class="fas fa-user-graduate" style="color: white;"></i> Sí, promover a todos', cancelButtonText: '<i class="fa-solid fa-xmark" style="color: white;"></i> Cancelar'
    });

    if (confirmacion.isConfirmed) {
        Swal.fire({ title: 'Procesando...', text: 'Actualizando grupos de todos los alumnos, por favor espera.', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        try {
            const response = await fetch(`${API_URL}/Usuarios/promocion-masiva`, { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                Swal.fire({ title: '¡Ciclo Actualizado!', text: data.mensaje, icon: 'success', confirmButtonColor: '#27ae60' });
                cargarAlumnos(); 
            } else { Swal.fire('Error', 'Hubo un problema al promover a los alumnos.', 'error'); }
        } catch (error) { Swal.fire('Error de conexión', 'No se pudo contactar con el servidor.', 'error'); }
    }
}

async function eliminarEgresadosMasivo() {
    const confirmacion = await Swal.fire({
        title: '¿Limpiar Egresados?',
        text: "Se borrarán todos los egresados del sistema. Aquellos que aún tengan libros pendientes de devolver se mantendrán en la base de datos hasta que liquiden.",
        icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: '<i class="fa-solid fa-broom"></i> Sí, limpiar egresados', cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        Swal.fire({ title: 'Limpiando base de datos...', didOpen: () => { Swal.showLoading() } });
        try {
            const response = await fetch(`${API_URL}/Usuarios/eliminar-egresados`, { method: 'DELETE' });
            const data = await response.json();
            
            if (response.ok) {
                const icono = data.mensaje.includes('⚠️') ? 'warning' : 'success';
                Swal.fire({ title: 'Proceso completado', text: data.mensaje, icon: icono });
                cargarAlumnos(); 
            } else { Swal.fire('Atención', data.mensaje || 'Hubo un problema.', 'error'); }
        } catch (error) { Swal.fire('Error', 'No se pudo contactar con el servidor.', 'error'); }
    }
}

async function verHistorialAlumno(id, nombre) {
    Swal.fire({ title: `Cargando historial de ${nombre}...`, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    try {
        const response = await fetch(`${API_URL}/Prestamos/historial-alumno/${id}`);
        if (!response.ok) throw new Error("Error al obtener historial");
        const datos = await response.json();

        if (datos.length === 0) {
            Swal.fire({ title: 'Sin registros', text: `${nombre} aún no ha pedido ningún material en el ciclo.`, icon: 'info', confirmButtonColor: '#3498db' });
            return;
        }

        let filasTabla = '';
        datos.forEach(d => {
            let colorEstado = d.estado === 'Activo' ? '#f39c12' : '#27ae60'; 
            filasTabla += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; text-align: left;"><strong>${d.material}</strong><br><small style="color:gray;">${d.categoria}</small></td>
                    <td style="padding: 10px;">${d.fechaPrestamo}</td>
                    <td style="padding: 10px; color: ${colorEstado}; font-weight: bold;">${d.estado}</td>
                </tr>
            `;
        });

        const tablaHTML = `
            <div style="max-height: 350px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; table-layout: auto !important;">
                    <thead style="background-color: #2c3e50; color: white; position: sticky; top: 0; z-index: 5;">
                        <tr>
                            <th style="padding: 12px 10px; text-align: left; width: 60%;">Material Solicitado</th>
                            <th style="padding: 12px 10px; text-align: center;">Fecha</th>
                            <th style="padding: 12px 10px; text-align: center;">Estatus</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>
            </div>
        `;

        Swal.fire({ title: `<i class="fas fa-book-reader" style="color: #3498db;"></i> Historial de Lectura`, html: `<p style="margin-bottom: 15px; font-weight: bold; color:#2c3e50;">Alumno: ${nombre}</p>${tablaHTML}`, width: '600px', showCloseButton: true, showConfirmButton: false });
    } catch (error) { Swal.fire('Error', 'No se pudo cargar el historial del alumno.', 'error'); }
}

// --- FUNCIONES PARA FOTO Y CREDENCIAL ---
function abrirSubirFoto(matricula) {
    document.getElementById('matriculaTemporalFoto').value = matricula;
    document.getElementById('inputFotoAlumno').click();
}

async function procesarSubidaFoto(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const matricula = document.getElementById('matriculaTemporalFoto').value;
    const formData = new FormData();
    formData.append('foto', file);

    Swal.fire({ title: 'Subiendo foto...', didOpen: () => { Swal.showLoading() } });

    try {
        const response = await fetch(`${API_URL}/Usuarios/subir-foto/${matricula}`, { method: 'POST', body: formData });
        const data = await response.json();

        if (response.ok) {
            Swal.fire({ title: '¡Éxito!', text: 'Foto subida correctamente.', icon: 'success', timer: 1500, showConfirmButton: false });
            cargarAlumnos(); 
        } else { Swal.fire('Error', data.mensaje || 'Hubo un problema al subir la foto.', 'error'); }
    } catch (error) { Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error'); } 
    finally { input.value = ""; }
}

function mostrarCredencial(nombre, matricula, grupo, fotoUrl) {
    document.getElementById('credNombre').innerText = nombre;
    document.getElementById('credMatricula').innerText = matricula;
    document.getElementById('credGrupo').innerText = grupo || "N/A";
    const imgFoto = document.getElementById('credFoto');
    
    if (fotoUrl && fotoUrl !== 'null' && fotoUrl !== '') {
        const baseUrl = API_URL.endsWith('/api') ? API_URL.replace('/api', '') : API_URL.substring(0, API_URL.indexOf('/api'));
        imgFoto.src = baseUrl + fotoUrl;
    } else {
        imgFoto.src = 'https://ui-avatars.com/api/?name=' + nombre.replace(/ /g, '+') + '&background=cbd5e1&color=475569&size=150';
    }

    JsBarcode("#credBarcode", matricula, {
        format: "CODE128",
        width: 1.5,
        height: 35,
        displayValue: false, 
        lineColor: "#334155",
        background: "transparent",
        margin: 0
    });

    document.getElementById('modalCredencial').style.display = 'flex';
}

function cerrarModalCredencial() {
    document.getElementById('modalCredencial').style.display = 'none';
}

// IMPRESIÓN INDIVIDUAL CON TAMAÑO ESTRICTO (54mm x 85.6mm)
function imprimirCredencial() {
    const contenido = document.getElementById('credencialContenedor').innerHTML;
    const ventanaPrint = window.open('', '', 'width=800,height=600');
    ventanaPrint.document.write(`
        <html>
            <head>
                <title>Imprimir Credencial</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
                    
                    /* TAMAÑO ESTÁNDAR CR80 (54mm x 85.6mm) */
                    .credencial-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); text-align: center; width: 54mm; height: 85.6mm; box-sizing: border-box; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; margin: 0 auto; }
                    
                    .cabecera { background: #2c3e50; color: white; padding: 6px; margin: -10px -10px 10px -10px; font-weight: bold; font-size: 0.65rem; letter-spacing: 1px; width: calc(100% + 20px); }
                    .foto { width: 25mm; height: 25mm; min-height: 25mm; object-fit: cover; border-radius: 50%; border: 3px solid #3498db; margin-bottom: 5px; background: white; }
                    .nombre-container { height: 2.2rem; display: flex; align-items: center; justify-content: center; width: 100%; overflow: hidden; margin-bottom: 2px; }
                    .nombre { margin: 0; color: #1e293b; font-size: 0.75rem; text-transform: uppercase; line-height: 1.1; }
                    .info { margin: 2px 0; color: #475569; font-weight: bold; font-size: 0.65rem; }
                    .barcode-container { margin-top: auto; padding-top: 5px; border-top: 1px dashed #cbd5e1; width: 100%; }
                    svg { max-width: 100%; height: 12mm; }
                </style>
            </head>
            <body>
                <div class="credencial-box">${contenido}</div>
                <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body>
        </html>
    `);
    ventanaPrint.document.close();
}

async function sincronizarFotosMasivas() {
    const confirmacion = await Swal.fire({
        title: '¿Sincronizar Fotos Masivamente?',
        text: 'El sistema escaneará la carpeta "fotos_alumnos" y vinculará cada imagen con el alumno que tenga esa matrícula.',
        icon: 'info',
        showCancelButton: true, confirmButtonColor: '#3498db', cancelButtonColor: '#94a3b8',
        confirmButtonText: '<i class="fas fa-sync-alt"></i> Iniciar Sincronización', cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        Swal.fire({ title: 'Sincronizando...', text: 'Buscando fotos y vinculando matrículas, no cierres esta ventana.', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        try {
            const response = await fetch(`${API_URL}/Usuarios/sincronizar-fotos`, { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                Swal.fire({ title: '¡Sincronización Completa!', html: `<b>${data.vinculadas}</b> fotos vinculadas con éxito.<br><b>${data.ignoradas}</b> fotos ignoradas (no hay alumnos con esa matrícula).`, icon: 'success', confirmButtonColor: '#27ae60' });
                cargarAlumnos(); 
            } else { Swal.fire('Atención', data.mensaje || 'Hubo un problema al sincronizar.', 'warning'); }
        } catch (error) { Swal.fire('Error', 'No se pudo conectar con el servidor para sincronizar las fotos.', 'error'); }
    }
}

// IMPRESIÓN POR BLOQUES CON TAMAÑO ESTRICTO (54mm x 85.6mm)
function imprimirCredencialesFiltradas() {
    const filas = document.querySelectorAll('#tablaAlumnosBody tr');
    let credencialesHTML = '';
    let count = 0;

    filas.forEach(fila => {
        if (fila.style.display !== 'none' && fila.hasAttribute('data-matricula')) {
            const nombre = fila.getAttribute('data-nombre');
            const matricula = fila.getAttribute('data-matricula');
            const grupo = fila.getAttribute('data-grupo');
            const fotoUrl = fila.getAttribute('data-foto');

            let imgSrc = 'https://ui-avatars.com/api/?name=' + nombre.replace(/ /g, '+') + '&background=cbd5e1&color=475569&size=150';
            if (fotoUrl && fotoUrl !== 'null' && fotoUrl !== '') {
                const baseUrl = API_URL.endsWith('/api') ? API_URL.replace('/api', '') : API_URL.substring(0, API_URL.indexOf('/api'));
                imgSrc = baseUrl + fotoUrl;
            }

            credencialesHTML += `
                <div class="credencial-box">
                    <div class="cabecera">PRIMARIA BENITO JUÁREZ</div>
                    <img class="foto" src="${imgSrc}" alt="Foto Alumno">
                    <div class="nombre-container">
                        <h4 class="nombre">${nombre}</h4>
                    </div>
                    <p class="info">MATRÍCULA: <span style="color: #e74c3c;">${matricula}</span></p>
                    <p class="info">GRUPO: <span style="color: #27ae60;">${grupo || "N/A"}</span></p>
                    <div class="barcode-container">
                        <svg class="barcode-svg" data-matricula="${matricula}"></svg>
                    </div>
                </div>
            `;
            count++;
        }
    });

    if (count === 0) {
        Swal.fire('Atención', 'No hay alumnos visibles en la tabla para imprimir. Ajusta los filtros.', 'info');
        return;
    }

    const ventanaPrint = window.open('', '', 'width=800,height=600');
    ventanaPrint.document.write(`
        <html>
            <head>
                <title>Impresión Masiva de Credenciales</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; margin: 0; padding: 20px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
                    
                    /* TAMAÑO ESTÁNDAR CR80 (54mm x 85.6mm) */
                    .credencial-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); text-align: center; width: 54mm; height: 85.6mm; box-sizing: border-box; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; overflow: hidden; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; }
                    
                    .cabecera { background: #2c3e50; color: white; padding: 6px; margin: -10px -10px 10px -10px; font-weight: bold; font-size: 0.65rem; letter-spacing: 1px; width: calc(100% + 20px); }
                    .foto { width: 25mm; height: 25mm; min-height: 25mm; object-fit: cover; border-radius: 50%; border: 3px solid #3498db; margin-bottom: 5px; background: white; }
                    .nombre-container { height: 2.2rem; display: flex; align-items: center; justify-content: center; width: 100%; overflow: hidden; margin-bottom: 2px; }
                    .nombre { margin: 0; color: #1e293b; font-size: 0.75rem; text-transform: uppercase; line-height: 1.1; }
                    .info { margin: 2px 0; color: #475569; font-weight: bold; font-size: 0.65rem; }
                    .barcode-container { margin-top: auto; padding-top: 5px; border-top: 1px dashed #cbd5e1; width: 100%; }
                    svg { max-width: 100%; height: 12mm; }
                    
                    @media print {
                        body { padding: 0; display: block; }
                        .credencial-box { float: left; margin: 10px; box-shadow: none; border: 1px dashed #ccc; }
                    }
                </style>
            </head>
            <body>
                ${credencialesHTML}
                <script>
                    window.onload = function() {
                        document.querySelectorAll('.barcode-svg').forEach(function(svg) {
                            JsBarcode(svg, svg.getAttribute('data-matricula'), {
                                format: "CODE128", width: 1.5, height: 35, displayValue: false, lineColor: "#334155", background: "transparent", margin: 0
                            });
                        });
                        setTimeout(() => { window.print(); window.close(); }, 800);
                    };
                </script>
            </body>
        </html>
    `);
    ventanaPrint.document.close();
}