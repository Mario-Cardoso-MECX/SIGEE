// Variables globales
let matriculaActual = "";
let paginaActualHistorial = 1;
let filtroActual = 'Todos'; // Memoria del filtro activo
let isRestoringScroll = false; // Candado para el scroll

// --- NUEVO: FUNCIÓN ANTI-DUPLICADOS PARA ESCÁNER ---
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
// ----------------------------------------------------

/**
 * 1. CARGAR DATOS DEL ALUMNO
 */
async function cargarAlumno(matriculaOpcional = null) {
    const inputBusqueda = document.getElementById('txtBusquedaAlumno');
    const infoDiv = document.getElementById('infoAlumno');
    const lblMatricula = document.getElementById('lblMatriculaActiva');
    const tabla = document.getElementById('tablaPendientes');

    if (matriculaOpcional) {
        matriculaActual = matriculaOpcional;
    } else {
        matriculaActual = inputBusqueda.value.trim();
    }

    if (!matriculaActual) return;

    infoDiv.style.display = 'block';
    lblMatricula.innerText = "Buscando...";
    tabla.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';

    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};

    try {
        const response = await fetch(`${API_URL}/Prestamos/pendientes/${matriculaActual}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
        });

        if (response.status === 404) {
            Swal.fire({ title: 'No encontrado', text: 'Alumno no encontrado o matrícula incorrecta.', icon: 'warning', confirmButtonColor: '#f39c12' });
            lblMatricula.innerText = "No encontrado";
            bloquearPanel(true);
            return;
        }

        if (!response.ok) throw new Error("Error en el servidor");

        const listaPrestamos = await response.json();

        lblMatricula.innerText = matriculaActual;
        infoDiv.style.backgroundColor = "#e0f2fe"; 
        bloquearPanel(false);
        renderizarTabla(listaPrestamos);

        const inputMat = document.getElementById('txtBusquedaMaterial');
        if(inputMat) inputMat.focus();

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Error de conexión con la API', 'error');
    }
}

async function realizarPrestamo() {
    const materialIdInput = document.getElementById('txtMaterialId');
    const materialId = materialIdInput.value;
    const msgDiv = document.getElementById('msgPrestamo');
    const inputNombreMat = document.getElementById('txtBusquedaMaterial');

    if (!materialId) {
        return Swal.fire('Atención', 'Por favor, selecciona un material de la lista', 'info');
    }

    // --- REQ-10 Validación de Credencial (Solo para Deportes) ---
    const categoriaSeleccionada = materialIdInput.dataset.categoria;
    if (categoriaSeleccionada === "Material Deportivo") {
        const confirmCredencial = await Swal.fire({
            title: '¡Garantía Requerida!',
            text: '¿El alumno ya entregó su credencial física?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#27ae60',
            cancelButtonColor: '#e74c3c',
            confirmButtonText: '<i class="fas fa-id-card"></i> Sí, ya la tengo',
            cancelButtonText: 'Aún no'
        });

        if (!confirmCredencial.isConfirmed) {
            return; // Se cancela el préstamo si dicen que "Aún no"
        }
    }
    // ----------------------------------------------------------------------

    msgDiv.innerText = "Procesando...";
    msgDiv.style.color = "blue";

    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};

    try {
        const response = await fetch(`${API_URL}/Prestamos/registrar`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sesion.token}` // <-- NUEVO: TOKEN
            },
            body: JSON.stringify({
                matriculaAlumno: matriculaActual,
                materialId: parseInt(materialId),
                horasDuracion: parseInt(document.getElementById('selHoras').value)
            })
        });

        const textResponse = await response.text();
        let data = {};
        
        try {
            data = JSON.parse(textResponse); 
        } catch (e) {
            data = { mensaje: textResponse }; 
        }

        if (response.ok) {
            document.getElementById('txtMaterialId').value = "";
            document.getElementById('txtMaterialId').dataset.categoria = ""; // Limpiar data
            if(inputNombreMat) inputNombreMat.value = "";
            msgDiv.innerText = ""; 
            
            Swal.fire({
                title: '¡Préstamo Registrado!',
                text: `Se prestó: ${data.material || 'Material'}`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

            cargarAlumno(matriculaActual); 
        } else {
            Swal.fire('No se pudo prestar', data.mensaje || "Error al registrar el préstamo", 'error');
            msgDiv.innerText = "";
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Error de red o conexión', 'error');
    }

    cargarHistorial();
}

/**
 * 3. DEVOLVER MATERIAL (PUT)
 * MAGIA: Ahora recibe la categoría para saber si pedir credencial o no.
 */
async function devolverMaterial(idReserva, categoria) {
    // Texto por defecto (Biblioteca o Salón)
    let textoAlerta = "El stock volverá a estar disponible.";
    let tituloAlerta = '¿Confirmar devolución?';

    // Si es Deportes, cambiamos el texto y lo ponemos urgente
    if (categoria === "Material Deportivo") {
        tituloAlerta = '¡Atención: Devolución de Deportes!';
        textoAlerta = "El stock volverá a estar disponible. <br><br> <b><span style='color: #e74c3c; font-size: 1.1rem;'>¡NO OLVIDES DEVOLVER SU CREDENCIAL FÍSICA!</span></b>";
    }

    const confirmacion = await Swal.fire({
        title: tituloAlerta,
        html: textoAlerta, // Cambiado de 'text' a 'html' para soportar colores y negritas
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#27ae60', 
        cancelButtonColor: '#94a3b8',
        confirmButtonText: '<i class="fas fa-check-circle"></i> Sí, devolver',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
        try {
            const response = await fetch(`${API_URL}/Prestamos/devolver/${idReserva}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
            });

            if (response.ok) {
                Swal.fire({
                    title: '¡Devuelto!',
                    text: 'Material devuelto correctamente.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                cargarAlumno(matriculaActual);
            } else {
                Swal.fire('Error', 'No se pudo procesar la devolución', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error de conexión', 'No se pudo contactar al servidor', 'error');
        }
        cargarHistorial();
    }
}

function renderizarTabla(lista) {
    const tabla = document.getElementById('tablaPendientes');
    tabla.innerHTML = '';

    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;
    
    const puedeGestionar = rol === 'Admin' || rol === 'Inventario';

    if (lista.length === 0) {
        tabla.innerHTML = '<tr><td colspan="3" style="text-align:center; color:green;">¡Limpio! No debe nada 🎉</td></tr>';
        return;
    }

    lista.forEach(item => {
        const hoy = new Date();
        const fechaLimite = new Date(item.fechaFinRaw); 
        const esAtrasado = hoy > fechaLimite;
        const horaFormateada = fechaLimite.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // MAGIA: Pasamos la categoría 'item.categoria' a la función devolverMaterial.
        // Reemplazamos las comillas simples por dobles escapadas en la categoría para evitar errores de sintaxis si el nombre tiene acentos.
        const catSegura = (item.categoria || "").replace(/'/g, "\\'"); 
        
        const btnDevolver = puedeGestionar 
            ? `<button onclick="devolverMaterial(${item.idReserva}, '${catSegura}')" class="btn-rojo">Devolver</button>`
            : `<span style="color:gray; font-size:0.85rem;">Solo lectura</span>`;

        const fila = `
            <tr style="${esAtrasado ? 'background-color: #fef2f2;' : ''}">
                <td>
                    <strong>${item.material}</strong><br>
                    <small style="color: #7f8c8d;">${item.categoria}</small>
                </td>
                <td style="color: ${esAtrasado ? '#dc2626' : 'inherit'}; font-weight: ${esAtrasado ? 'bold' : 'normal'}">
                    ${item.fechaFin} - <strong>${horaFormateada}</strong> 
                    ${esAtrasado ? '<br>⚠️ ATRASADO' : ''}
                </td>
                <td>${btnDevolver}</td>
            </tr>
        `;
        tabla.innerHTML += fila;
    });
}

function bloquearPanel(bloqueado) {
    const panel = document.getElementById('panelOperaciones');
    if (!panel) return;
    panel.style.opacity = bloqueado ? "0.5" : "1";
    panel.style.pointerEvents = bloqueado ? "none" : "all";
}

// --- BUSCADOR DE MATERIALES ---
const inputBusquedaMat = document.getElementById('txtBusquedaMaterial');
const listaSugMat = document.getElementById('listaSugerencias');
const inputIdOculto = document.getElementById('txtMaterialId');

if (inputBusquedaMat) {
    inputBusquedaMat.addEventListener('input', async (e) => {
        const texto = e.target.value;

        if (texto.length < 2) {
            listaSugMat.style.display = 'none';
            return;
        }

        const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};

        try {
            // Ahora mandamos el texto crudo, el Backend se encargará de filtrarlo
            const response = await fetch(`${API_URL}/Materiales/buscar?termino=${texto}`, {
                headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
            });
            const materiales = await response.json();

            if (materiales.length > 0) {
                listaSugMat.innerHTML = '';
                materiales.forEach(m => {
                    const item = document.createElement('div');
                    item.className = "sugerencia-item";
                    item.style.padding = '10px';
                    item.style.cursor = 'pointer';
                    item.style.borderBottom = '1px solid #eee';
                    item.innerHTML = `<strong>${m.titulo}</strong> <br> <small>${m.categoria} - Disp: ${m.stockDisponible}</small>`;
                    
                    item.onclick = () => {
                        inputBusquedaMat.value = m.titulo;
                        inputIdOculto.value = m.id;
                        inputIdOculto.dataset.categoria = m.categoria; // Guardar categoría para REQ-10
                        listaSugMat.style.display = 'none';

                        const divHoras = document.getElementById('divDuracionHoras');
                        const selHoras = document.getElementById('selHoras');

                        if(m.categoria === "Material Deportivo") {
                            divHoras.style.display = 'block';
                            selHoras.innerHTML = `
                                <option value="1" selected>1 Hora (Receso / Clase E.F.)</option>
                                <option value="2">2 Horas (Evento o Torneo)</option>
                            `;
                        } else if (m.categoria === "Salón") {
                            divHoras.style.display = 'block';
                            selHoras.innerHTML = `
                                <option value="1">1 Hora (Clase corta)</option>
                                <option value="2" selected>2 Horas (Bloque Doble)</option>
                                <option value="4">4 Horas (Medio Turno)</option>
                                <option value="6">6 Horas (Turno Completo)</option>
                            `;
                        } else {
                            divHoras.style.display = 'none'; 
                        }
                    };
                    listaSugMat.appendChild(item);
                });
                listaSugMat.style.display = 'block';
            } else {
                listaSugMat.style.display = 'none';
            }
        } catch (error) { console.error("Error buscando material:", error); }
    });
}

// --- BUSCADOR DE USUARIOS ---
const inputBusquedaAlum = document.getElementById('txtBusquedaAlumno');
const listaSugAlum = document.getElementById('listaSugerenciasAlumno');

if (inputBusquedaAlum) {
    inputBusquedaAlum.addEventListener('input', async (e) => {
        const texto = e.target.value;

        if (texto.length < 3) {
            listaSugAlum.style.display = 'none';
            return;
        }

        const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};

        try {
            const response = await fetch(`${API_URL}/Usuarios/buscar?termino=${texto}`, {
                headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
            });
            const usuarios = await response.json();

            if (usuarios.length > 0) {
                listaSugAlum.innerHTML = '';
                usuarios.forEach(u => {
                    const nombreStr = u.nombre || "";
                    const apellidosStr = u.apellidos || "";
                    const nombreCompleto = `${nombreStr} ${apellidosStr}`.trim();

                    const etiquetaRol = u.rol === 'Docente' || u.rol === 'Admin' 
                        ? `<span style="color:#e74c3c; font-weight:bold;">[${u.rol}]</span>` 
                        : `<span style="color:#3498db; font-weight:bold;">[Alumno - Grupo: ${u.grupo || 'N/A'}]</span>`;

                    const item = document.createElement('div');
                    item.className = "sugerencia-item";
                    item.style.padding = '10px';
                    item.style.cursor = 'pointer';
                    item.style.borderBottom = '1px solid #eee';
                    
                    item.innerHTML = `<strong>${nombreCompleto}</strong> <br> <small>Mat: ${u.matricula} ${etiquetaRol}</small>`;
                    
                    item.onclick = () => {
                        inputBusquedaAlum.value = nombreCompleto;
                        matriculaActual = u.matricula;

                        document.getElementById('lblNombreAlumnoActivo').innerHTML = `${nombreCompleto} <strong style="color:#2c3e50;">(${u.rol})</strong>`;
                        document.getElementById('lblMatriculaActiva').innerText = u.matricula;
                        
                        cargarAlumno(u.matricula); 
                        listaSugAlum.style.display = 'none';
                    };
                    listaSugAlum.appendChild(item);
                });
                listaSugAlum.style.display = 'block';
            } else {
                listaSugAlum.style.display = 'none';
            }
        } catch (error) { console.error("Error buscando usuario:", error); }
    });
}

document.addEventListener('click', (e) => {
    if (listaSugMat && e.target !== inputBusquedaMat) listaSugMat.style.display = 'none';
    if (listaSugAlum && e.target !== inputBusquedaAlum) listaSugAlum.style.display = 'none';
});

// EVENTOS INICIALES
document.addEventListener('DOMContentLoaded', () => {

    habilitarScanner('txtBusquedaAlumno');
    habilitarScanner('txtBusquedaMaterial');

    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;

    if (rol !== 'Admin' && rol !== 'Inventario') {
        const cards = document.querySelectorAll('.card-accion');
        if(cards[0]) cards[0].style.display = 'none'; 
        if(cards[1]) cards[1].style.display = 'none'; 
    }
    
    window.addEventListener('scroll', () => {
        if (!isRestoringScroll) {
            sessionStorage.setItem('scroll_prestamos_ventana_' + filtroActual, window.scrollY);
        }
    });

    const contenedoresTabla = document.querySelectorAll('.tabla-container');
    contenedoresTabla.forEach((contenedor, index) => {
        contenedor.addEventListener('scroll', () => {
            if (!isRestoringScroll) {
                sessionStorage.setItem('scroll_prestamos_interno_' + index + '_' + filtroActual, contenedor.scrollTop);
            }
        });
    });
    
    cargarHistorial();
});

function restaurarAmbosScrolls(filtro) {
    isRestoringScroll = true; 
    
    const scrollVentana = sessionStorage.getItem('scroll_prestamos_ventana_' + filtro);
    
    requestAnimationFrame(() => {
        window.scrollTo({ top: scrollVentana ? parseInt(scrollVentana) : 0, behavior: 'instant' });
        
        const contenedoresTabla = document.querySelectorAll('.tabla-container');
        contenedoresTabla.forEach((contenedor, index) => {
            const scrollInterno = sessionStorage.getItem('scroll_prestamos_interno_' + index + '_' + filtro);
            contenedor.scrollTop = scrollInterno ? parseInt(scrollInterno) : 0;
        });
        
        setTimeout(() => { isRestoringScroll = false; }, 150); 
    });
}

async function cargarHistorial() {
    paginaActualHistorial = 1;
    const tabla = document.getElementById('tablaHistorial');
    tabla.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando...</td></tr>';

    await traerDatosHistorial(false);
}

async function traerDatosHistorial(esCargaExtra = false) {
    const tabla = document.getElementById('tablaHistorial');
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    
    try {
        const response = await fetch(`${API_URL}/Prestamos/historial?pagina=${paginaActualHistorial}&cantidad=10`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
        });
        const datos = await response.json();

        if (!esCargaExtra) tabla.innerHTML = ''; 

        if (datos.length === 0 && esCargaExtra) {
            Swal.fire({
                title: 'Fin del historial',
                text: 'Ya no hay más registros para mostrar.',
                icon: 'info',
                confirmButtonColor: '#f39c12'
            });
            return;
        }

        datos.forEach(h => {
            const hoy = new Date();
            
            const fVenceRaw = h.fechaVencimiento || h.FechaVencimiento;
            const fInicioRaw = h.fechaInicioRaw || h.FechaInicioRaw;
            const fechaVencimiento = fVenceRaw ? new Date(fVenceRaw) : null;
            const fechaInicio = fInicioRaw ? new Date(fInicioRaw) : null;

            const esFechaValida = fechaVencimiento && !isNaN(fechaVencimiento.getTime());
            
            let fInicioStr = "Fecha no disponible";
            let fVenceStr = "Sin fecha";

            if (esFechaValida && fechaInicio) {
                const opciones = { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                };
                fInicioStr = fechaInicio.toLocaleString('es-MX', opciones);
                fVenceStr = fechaVencimiento.toLocaleString('es-MX', opciones);
            }

            let estiloFila = "";
            let badgeEstado = "";

            if (h.estado === "Activo") {
                if (esFechaValida && hoy > fechaVencimiento) {
                    estiloFila = "background-color: #fef2f2; color: #991b1b; border-left: 5px solid #dc2626;";
                    badgeEstado = `<span style="font-weight:bold;">⚠️ ATRASADO (Vence: ${fVenceStr})</span>`;
                } else {
                    estiloFila = "background-color: #fff7ed; color: #9a3412; border-left: 5px solid #f97316;";
                    badgeEstado = `<span style="font-weight:bold;">Pendiente (Entrega: ${fVenceStr})</span>`;
                }
            } else {
                badgeEstado = `<span class="estado-devuelto">Devuelto</span>`;
            }

            const fila = `
                <tr style="${estiloFila}">
                    <td>
                        <strong>${h.alumno}</strong><br>
                        <small style="color:#64748b;">Mat: ${h.matricula || 'N/A'}</small>
                    </td>
                    <td>${h.material}</td>
                    <td>${fInicioStr}</td>
                    <td>
                        ${badgeEstado}
                        ${h.estado === "Activo" ? 
                            `<button onclick="renovarPrestamo(${h.idReserva})" title="Renovar" style="border:none; background:none; cursor:pointer; margin-left:10px; font-size:1.2rem;">🕒</button>` 
                            : ''}
                    </td>
                </tr>
            `;
            tabla.innerHTML += fila;
        });

        actualizarBotonCargarMas(datos.length);
        aplicarFiltroActual();

    } catch (error) {
        console.error("Error historial:", error);
    }
}

async function renovarPrestamo(id) {
    const confirmacion = await Swal.fire({
        title: '¿Extender plazo?',
        text: "Se otorgarán 7 días adicionales para entregar este material.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3498db', 
        cancelButtonColor: '#94a3b8',
        confirmButtonText: '<i class="fas fa-clock"></i> Sí, extender plazo',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
        try {
            const response = await fetch(`${API_URL}/Prestamos/renovar/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
            });

            if (response.ok) {
                Swal.fire({
                    title: '¡Plazo Extendido!',
                    text: 'Se han dado 7 días más con éxito.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                cargarHistorial();
            } else {
                Swal.fire('Error', 'No se pudo renovar el préstamo.', 'error');
            }
        } catch (error) {
            console.error("Error:", error);
            Swal.fire('Error', 'Problema de conexión con el servidor.', 'error');
        }
    }
}

function filtrarHistorial(tipo, botonHtml = null) {
    filtroActual = tipo; 
    
    if (botonHtml) {
        document.querySelectorAll('.filter-bar-orange .chip').forEach(btn => btn.classList.remove('active'));
        botonHtml.classList.add('active');
    }

    const filas = document.querySelectorAll('#tablaHistorial tr');

    filas.forEach(fila => {
        if (fila.id === 'filaCargarMas' || fila.innerText.includes('Cargando')) return;

        const esAtrasado = fila.innerHTML.includes('⚠️ ATRASADO');
        const esPendiente = fila.innerHTML.includes('Pendiente'); 

        if (tipo === 'Todos') {
            fila.style.display = '';
        } else if (tipo === 'Pendientes') {
            fila.style.display = esPendiente ? '' : 'none';
        } else if (tipo === 'Vencidos') {
            fila.style.display = esAtrasado ? '' : 'none';
        }
    });

    restaurarAmbosScrolls(tipo);
}

function aplicarFiltroActual() {
    const botonActivo = document.querySelector('.filter-bar-orange .chip.active');
    filtrarHistorial(filtroActual, botonActivo);
}

function actualizarBotonCargarMas(cantidadRecibida) {
    const botonViejo = document.getElementById('filaCargarMas');
    if (botonViejo) botonViejo.remove();

    if (cantidadRecibida === 10) {
        const tabla = document.getElementById('tablaHistorial');
        const botonHTML = `
            <tr id="filaCargarMas">
                <td colspan="4" style="text-align: center; padding: 15px;">
                    <button onclick="cargarSiguientePagina()" class="btn-azul" style="font-size: 0.8rem;">
                        <i class="fa-solid fa-arrow-down"></i> Cargar más registros
                    </button>
                </td>
            </tr>
        `;
        tabla.innerHTML += botonHTML;
    }
}

function cargarSiguientePagina() {
    paginaActualHistorial++;
    traerDatosHistorial(true);
}