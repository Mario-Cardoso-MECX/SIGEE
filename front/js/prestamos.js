// Variables globales
let matriculaActual = "";
let paginaActualHistorial = 1;
let filtroActual = 'Todos'; // Memoria del filtro activo
let isRestoringScroll = false; // Candado para el scroll

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

    try {
        const response = await fetch(`${API_URL}/Prestamos/pendientes/${matriculaActual}`);

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
    const materialId = document.getElementById('txtMaterialId').value;
    const msgDiv = document.getElementById('msgPrestamo');
    const inputNombreMat = document.getElementById('txtBusquedaMaterial');

    if (!materialId) {
        return Swal.fire('Atención', 'Por favor, selecciona un material de la lista', 'info');
    }

    msgDiv.innerText = "Procesando...";
    msgDiv.style.color = "blue";

    try {
        const response = await fetch(`${API_URL}/Prestamos/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
 */
async function devolverMaterial(idReserva) {
    const confirmacion = await Swal.fire({
        title: '¿Confirmar devolución?',
        text: "El material será devuelto y el stock volverá a estar disponible.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#27ae60', 
        cancelButtonColor: '#94a3b8',
        confirmButtonText: '<i class="fas fa-check-circle"></i> Sí, devolver',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/Prestamos/devolver/${idReserva}`, {
                method: 'PUT'
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

        const btnDevolver = puedeGestionar 
            ? `<button onclick="devolverMaterial(${item.idReserva})" class="btn-rojo">Devolver</button>`
            : `<span style="color:gray; font-size:0.85rem;">Solo lectura</span>`;

        const fila = `
            <tr style="${esAtrasado ? 'background-color: #fef2f2;' : ''}">
                <td><strong>${item.material}</strong></td>
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

        try {
            const response = await fetch(`${API_URL}/Materiales/buscar?termino=${texto}`);
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
                        listaSugMat.style.display = 'none';

                        const divHoras = document.getElementById('divDuracionHoras');
                        if(m.categoria === "Salón" || m.categoria === "Material Deportivo") {
                            divHoras.style.display = 'block';
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

        try {
            const response = await fetch(`${API_URL}/Usuarios/buscar?termino=${texto}`);
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

// EVENTOS INICIALES (Incluye listeners de Scroll Doble)
document.addEventListener('DOMContentLoaded', () => {
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;

    if (rol !== 'Admin' && rol !== 'Inventario') {
        const cards = document.querySelectorAll('.card-accion');
        if(cards[0]) cards[0].style.display = 'none'; 
        if(cards[1]) cards[1].style.display = 'none'; 
    }
    
    // --- MEMORIA DE SCROLL DOBLE (Ventana y Tablas) ---
    // 1. Guardar scroll de la ventana principal
    window.addEventListener('scroll', () => {
        if (!isRestoringScroll) {
            sessionStorage.setItem('scroll_prestamos_ventana_' + filtroActual, window.scrollY);
        }
    });

    // 2. Guardar scroll de cada tablita interna (pendientes y el historial general)
    const contenedoresTabla = document.querySelectorAll('.tabla-container');
    contenedoresTabla.forEach((contenedor, index) => {
        contenedor.addEventListener('scroll', () => {
            if (!isRestoringScroll) {
                // index 0 puede ser la de pendientes, index 1 la de historial
                sessionStorage.setItem('scroll_prestamos_interno_' + index + '_' + filtroActual, contenedor.scrollTop);
            }
        });
    });
    
    cargarHistorial();
});

// FUNCIÓN PARA RESTAURAR TODOS LOS SCROLLS
function restaurarAmbosScrolls(filtro) {
    isRestoringScroll = true; // Ponemos el candado
    
    const scrollVentana = sessionStorage.getItem('scroll_prestamos_ventana_' + filtro);
    
    requestAnimationFrame(() => {
        // 1. Restaurar scroll grandote
        window.scrollTo({ top: scrollVentana ? parseInt(scrollVentana) : 0, behavior: 'instant' });
        
        // 2. Restaurar scroll de las tablas pequeñas
        const contenedoresTabla = document.querySelectorAll('.tabla-container');
        contenedoresTabla.forEach((contenedor, index) => {
            const scrollInterno = sessionStorage.getItem('scroll_prestamos_interno_' + index + '_' + filtro);
            contenedor.scrollTop = scrollInterno ? parseInt(scrollInterno) : 0;
        });
        
        // Quitamos el candado después de un pequeñísimo delay
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
    
    try {
        const response = await fetch(`${API_URL}/Prestamos/historial?pagina=${paginaActualHistorial}&cantidad=10`);
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
                    // ROJO: Vencido 
                    estiloFila = "background-color: #fef2f2; color: #991b1b; border-left: 5px solid #dc2626;";
                    badgeEstado = `<span style="font-weight:bold;">⚠️ ATRASADO (Vence: ${fVenceStr})</span>`;
                } else {
                    // NARANJA: Pendiente en tiempo
                    estiloFila = "background-color: #fff7ed; color: #9a3412; border-left: 5px solid #f97316;";
                    badgeEstado = `<span style="font-weight:bold;">Pendiente (Entrega: ${fVenceStr})</span>`;
                }
            } else {
                badgeEstado = `<span class="estado-devuelto">Devuelto</span>`;
            }

            const fila = `
                <tr style="${estiloFila}">
                    <td>${h.alumno}</td>
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
        
        // Reaplicar el filtro y restaurar la memoria del scroll de golpe
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
        try {
            const response = await fetch(`${API_URL}/Prestamos/renovar/${id}`, {
                method: 'PUT'
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

// --- NUEVA LÓGICA DE FILTROS ---
function filtrarHistorial(tipo, botonHtml = null) {
    filtroActual = tipo; // Guardamos en memoria qué filtro está activo
    
    // Cambiar la clase "active" visualmente si se hizo clic en un botón
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

    // Llamamos a restaurar scrolls después de filtrar
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