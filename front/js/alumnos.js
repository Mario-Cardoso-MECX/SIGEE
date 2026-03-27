let isRestoringScroll = false; // Candado para el scroll

document.addEventListener('DOMContentLoaded', () => {
    cargarAlumnos();

    //  Evaluamos los permisos para el Formulario de Registro
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;

    // Si NO es Admin y NO es Secretaria, le escondemos el formulario
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
    }

    // NUEVO: El botón de promoción SOLO lo debe ver el Admin (Directora)
    if (rol !== 'Admin') {
        const btnPromocion = document.getElementById('btnPromocion');
        if (btnPromocion) btnPromocion.style.display = 'none';
    }

    // --- MEMORIA DE SCROLL DOBLE PARA ALUMNOS ---
    // 1. Guardar scroll de la ventana principal
    window.addEventListener('scroll', () => {
        if (!isRestoringScroll) {
            const inputBuscador = document.getElementById('txtFiltrarAlumnos');
            const term = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
            sessionStorage.setItem('scroll_alumnos_ventana_' + term, window.scrollY);
        }
    });

    // 2. Guardar scroll interno de la tabla
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

// CARGAR LISTA (Usa el endpoint: /api/Usuarios/alumnos)
async function cargarAlumnos() {
    const tabla = document.getElementById('tablaAlumnosBody');
    
    // 1. Obtenemos el rol para la seguridad visual
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

        // Variable para carga ultra rápida
        let htmlFilas = '';

        alumnos.forEach(a => {
            // 2. LA MAGIA: Unimos Nombre y Apellidos
            const nombre = a.nombre || "";
            const apellidos = a.apellidos || "";
            const nombreCompleto = `${nombre} ${apellidos}`.trim();

            // 3. Control de acceso para los botones
            const acciones = puedeEditar 
                ? `<button onclick="prepararEdicionAlumno(${a.id}, '${nombre.replace(/'/g, "\\'")}', '${apellidos.replace(/'/g, "\\'")}', '${a.grupo}')" class="btn-azul"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
                   <button onclick="eliminarAlumno(${a.id})" class="btn-rojo"><i class="fa-solid fa-trash"></i> Eliminar</button>` 
                : `<span style="color:gray; font-size:0.85rem;">Solo lectura</span>`;

            htmlFilas += `
                <tr>
                    <td><strong>${a.matricula}</strong></td>
                    <td>${nombreCompleto}</td>
                    <td>${a.grupo}</td>
                    <td style="text-align:center;">${acciones}</td>
                </tr>
            `;
        });

        // Inyectamos todo de golpe
        tabla.innerHTML = htmlFilas;

        // --- RECUPERAR SCROLL AL RECARGAR LA PÁGINA ---
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

// FUNCIÓN MAESTRA PARA RECUPERAR AMBOS SCROLLS
function restaurarAmbosScrolls(term) {
    isRestoringScroll = true; // Ponemos el candado
    
    const scrollVentana = sessionStorage.getItem('scroll_alumnos_ventana_' + term);
    const scrollInterno = sessionStorage.getItem('scroll_alumnos_interno_' + term);
    const contenedorTabla = document.querySelector('.tabla-container');
    
    requestAnimationFrame(() => {
        // 1. Restaurar scroll grandote
        window.scrollTo({ top: scrollVentana ? parseInt(scrollVentana) : 0, behavior: 'instant' });
        
        // 2. Restaurar scroll pequeño (si existe)
        if (contenedorTabla) {
            contenedorTabla.scrollTop = scrollInterno ? parseInt(scrollInterno) : 0;
        }
        
        // Quitamos el candado
        setTimeout(() => { isRestoringScroll = false; }, 150); 
    });
}

// REGISTRAR (Usa el endpoint: /api/Usuarios/crear)
async function registrarAlumno() {
    const id = document.getElementById('txtIdAlumno').value; // Leemos el ID oculto
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

    const url = id 
        ? `${API_URL}/Usuarios/editar-alumno/${id}` 
        : `${API_URL}/Usuarios/crear`;
        
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre: nombre,
                apellidos: apellidos,
                grupo: `${grado} ${grupoLetra}`
            })
        });

        if (response.ok) {
            const data = await response.json();
            resultado.innerHTML = `<span style="color:green;">✅ ${data.mensaje}</span>`;
            
            // Limpiamos y regresamos el diseño a "Modo Registro"
            document.getElementById('formNuevoAlumno').reset();
            document.getElementById('txtIdAlumno').value = "";
            document.querySelector('.card-header h2').innerHTML = `<i class="fas fa-user-plus"></i> Registrar Nuevo Alumno`;
            document.querySelector('#formNuevoAlumno button[type="submit"]').innerHTML = `<i class="fas fa-id-card"></i> Registrar y Generar Matrícula`;
            
            cargarAlumnos(); 
        } else {
            const errorMsg = await response.text();
            resultado.innerHTML = `<span style="color:red;">❌ Error: ${errorMsg}</span>`;
        }
    } catch (error) {
        resultado.innerHTML = `<span style="color:red;">⚠️ Error de conexión.</span>`;
    }
}

// ELIMINAR (Usa el endpoint: /api/Usuarios/{id})
async function eliminarAlumno(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto! El alumno será dado de baja.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c', 
        cancelButtonColor: '#94a3b8',  
        confirmButtonText: '<i class="fa-solid fa-trash" style="color: white;"></i> Sí, eliminar',
        cancelButtonText: '<i class="fa-solid fa-xmark" style="color: white;"></i> Cancelar'
    });

    if (confirmacion.isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/Usuarios/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El alumno ha sido borrado correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#27ae60' 
                });
                cargarAlumnos(); // Refrescamos la tabla
            } else {
                const errorText = await response.text();
                // Alerta de Error (ej. si debe un libro)
                Swal.fire({
                    title: 'No se pudo eliminar',
                    text: errorText,
                    icon: 'error',
                    confirmButtonColor: '#3498db'
                });
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            Swal.fire('Error de conexión', 'No se pudo contactar con el servidor.', 'error');
        }
    }
}

// Actualizar alumno
function prepararEdicionAlumno(id, nombre, apellidos, grupoCompleto) {
    document.getElementById('txtIdAlumno').value = id;
    document.getElementById('nombreAlumno').value = nombre;
    document.getElementById('apellidoAlumno').value = apellidos;
    
    // Truco: Dividimos "6° A" por el espacio para llenar los select
    if(grupoCompleto) {
        const partes = grupoCompleto.split(" ");
        if(partes.length === 2) {
            document.getElementById('gradoAlumno').value = partes[0];
            document.getElementById('grupoLetra').value = partes[1];
        }
    }

    // Cambiamos los textos para indicar edición
    document.querySelector('.card-header h2').innerHTML = `<i class="fas fa-user-edit"></i> Editando: ${nombre}`;
    document.querySelector('#formNuevoAlumno button[type="submit"]').innerHTML = `<i class="fas fa-save"></i> Guardar Cambios`;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- BUSCADOR INTELIGENTE CON DEBOUNCE PARA ALUMNOS ---
let tiempoEsperaBuscadorAlumnos;
const inputBuscadorAlumnos = document.getElementById('txtFiltrarAlumnos');

if (inputBuscadorAlumnos) {
    inputBuscadorAlumnos.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        clearTimeout(tiempoEsperaBuscadorAlumnos);
        
        tiempoEsperaBuscadorAlumnos = setTimeout(() => {
            const rows = document.querySelectorAll('#tablaAlumnosBody tr');
            
            rows.forEach(r => {
                if (term === '') {
                    r.style.display = ''; 
                } else {
                    // Usamos textContent para máxima velocidad
                    r.style.display = r.textContent.toLowerCase().includes(term) ? '' : 'none';
                }
            });

            // Llamamos a restaurar scrolls
            restaurarAmbosScrolls(term);
        }, 500); // 500ms de retraso inteligente
    });
} // <--- AQUÍ ESTABA LA LLAVE FALTANTE QUE SE BORRÓ JUNTO CON EL SCROLL

// --- PROMOCIÓN MASIVA DE FIN DE CURSO ---
async function promoverCicloEscolar() {
    // Alerta de confirmación idéntica a la de Eliminar Alumno
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro de cerrar el ciclo?',
        text: "¡Atención! Todos los alumnos subirán un grado automáticamente (Ej. de 1° a 2°) y los alumnos de 6° pasarán a ser Egresados.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2c3e50', // Azul marino (combina con el botón)
        cancelButtonColor: '#94a3b8',  // Gris
        confirmButtonText: '<i class="fas fa-user-graduate" style="color: white;"></i> Sí, promover a todos',
        cancelButtonText: '<i class="fa-solid fa-xmark" style="color: white;"></i> Cancelar'
    });

    if (confirmacion.isConfirmed) {
        // Mostramos una alerta de "Cargando" mientras el servidor hace el trabajo
        Swal.fire({
            title: 'Procesando...',
            text: 'Actualizando grupos de todos los alumnos, por favor espera.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading() }
        });

        try {
            const response = await fetch(`${API_URL}/Usuarios/promocion-masiva`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                Swal.fire({
                    title: '¡Ciclo Actualizado!',
                    text: data.mensaje,
                    icon: 'success',
                    confirmButtonColor: '#27ae60'
                });
                cargarAlumnos(); // Refresca la tabla automáticamente para ver los cambios
            } else {
                Swal.fire('Error', 'Hubo un problema al promover a los alumnos.', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error de conexión', 'No se pudo contactar con el servidor.', 'error');
        }
    }
}