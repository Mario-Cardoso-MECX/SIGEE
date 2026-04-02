document.addEventListener('DOMContentLoaded', () => {
    // Cargamos la tabla de personal
    cargarPersonal();

    // Evaluamos los permisos
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;

    // Solo la Directora (Admin) puede agregar personal nuevo
    if (rol !== 'Admin') {
        const btnRegistrar = document.querySelector('.btn-registrar');
        if (btnRegistrar) {
            btnRegistrar.remove(); // Destruye el botón del HTML
        }
    }
});

async function cargarPersonal() {
    try {
        const response = await fetch(`${API_URL}/Usuarios/personal`);
        const personal = await response.json();
        
        const tabla = document.getElementById('tablaPersonal');
        tabla.innerHTML = "";

        const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
        const esAdmin = sesion.rol === 'Admin';

        if (personal.length === 0) {
            tabla.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay personal registrado.</td></tr>';
            return;
        }

        personal.forEach(p => {
            const nombre = p.nombre || "";
            const apellidos = p.apellidos || "";
            const nombreCompleto = `${nombre} ${apellidos}`.trim();

           const acciones = esAdmin 
                ? `<div class="acciones-flex">
                       <button onclick="prepararEditar(${p.id})" class="btn-editar-naranja" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                       <button onclick="eliminarAdmin(${p.id}, '${nombreCompleto || p.username}')" class="btn-borrar-rojo" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                   </div>`
                : `<span style="color:gray; font-size:0.85rem;">Solo lectura</span>`;

            tabla.innerHTML += `
                <tr>
                    <td><strong>#${p.matricula}</strong></td>
                    <td>${nombreCompleto || p.username}</td>
                    <td><span class="usuario-tag">@${p.username}</span></td>
                    <td><span class="rol-tag">${p.rol}</span></td>
                    <td style="text-align:center;">${acciones}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error al cargar personal:", error);
        document.getElementById('tablaPersonal').innerHTML = `
            <tr><td colspan="5" style="text-align:center; color:red;">Error al conectar con el servidor</td></tr>
        `;
    }
}

function abrirModalNuevo() {
    document.getElementById('regId').value = ""; 
    document.getElementById('formRegistroPersonal').reset(); 
    document.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-user-shield" style="color: #0d6efd;"></i> Nuevo Integrante';
    document.querySelector('.btn-guardar-azul').innerHTML = '<i class="fas fa-save"></i> Registrar Usuario';
    document.getElementById('modalNuevoPersonal').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalNuevoPersonal').style.display = 'none';
    document.getElementById('formRegistroPersonal').reset();
    document.getElementById('regId').value = ''; // ¡Vital! Borramos el ID oculto
    
    // Restauramos el diseño a "Modo Nuevo Usuario" por defecto
    document.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-user-shield" style="color: #0d6efd;"></i> Nuevo Integrante';
    document.querySelector('.btn-guardar-azul').innerHTML = '<i class="fas fa-save"></i> Registrar Usuario';
}

async function eliminarAdmin(id, nombre) {
    // 🚀 Modal de confirmación premium
    const confirmacion = await Swal.fire({
        title: '¿Eliminar Usuario?',
        text: `¿Estás seguro de eliminar a "${nombre}"? Perderá el acceso al sistema inmediatamente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c', // Rojo
        cancelButtonColor: '#94a3b8',  // Gris
        confirmButtonText: '<i class="fa-solid fa-trash"></i> Sí, eliminar',
        cancelButtonText: '<i class="fa-solid fa-xmark"></i> Cancelar'
    });

    if (confirmacion.isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/Usuarios/eliminar-personal/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'Usuario eliminado correctamente del sistema.',
                    icon: 'success',
                    confirmButtonColor: '#27ae60'
                });
                cargarPersonal(); 
            } else {
                const error = await response.json();
                Swal.fire('Error', error.mensaje || "No se pudo eliminar", 'error');
            }
        } catch (error) {
            console.error("Error al conectar:", error);
            Swal.fire('Error de conexión', 'No se pudo conectar con el servidor.', 'error');
        }
    }
}

async function prepararEditar(id) {
    try {
        const response = await fetch(`${API_URL}/Usuarios/${id}`);
        const u = await response.json();

        // Llenamos el formulario con lo que viene de la base de datos
        document.getElementById('regId').value = u.id;
        document.getElementById('regNombre').value = u.nombre;
        document.getElementById('regApellidos').value = u.apellidos;
        document.getElementById('regUser').value = u.username;
        document.getElementById('regRol').value = u.rol;
        document.getElementById('regPass').value = ""; // Contraseña vacía por seguridad

        document.querySelector('.modal-header h3').innerText = "Editar Personal";
        document.getElementById('modalNuevoPersonal').style.display = 'flex';
    } catch (error) {
        Swal.fire('Error', 'No se pudieron obtener los datos del usuario.', 'error');
    }
}

async function guardarPersonal() {
    // 1. Recopilamos los datos del formulario
    const id = document.getElementById('regId').value;
    const nombre = document.getElementById('regNombre').value.trim();
    const apellidos = document.getElementById('regApellidos').value.trim();
    const username = document.getElementById('regUser').value.trim();
    const rol = document.getElementById('regRol').value;
    const password = document.getElementById('regPass').value.trim();

    const cantidadApellidos = apellidos.split(/\s+/).length;
    if (cantidadApellidos < 2) {
        Swal.fire('Atención', 'El personal debe registrarse con sus dos apellidos.', 'warning');
        return; 
    }

    // 2. Construimos el objeto JSON
    const datos = {
        nombre: nombre,
        apellidos: apellidos,
        username: username,
        rol: rol
    };

    if (password) {
        datos.passwordHash = password; 
    }

    try {
        let response;
        
        if (id) {
            // 🟡 MODO EDICIÓN (PUT)
            datos.id = parseInt(id);
            response = await fetch(`${API_URL}/Usuarios/editar-personal/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
        } else {
            // 🟢 MODO NUEVO (POST)
            datos.matricula = "DOC-" + Math.floor(Math.random() * 10000); 
            
            response = await fetch(`${API_URL}/Usuarios/crear-personal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
        }

        if (response.ok) {
            const res = await response.json();
            
            // 🚀 SweetAlert de éxito automático
            Swal.fire({
                title: '¡Éxito!',
                text: res.mensaje,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
            document.getElementById('modalNuevoPersonal').style.display = 'none';
            cargarPersonal(); 
        } else {
            const err = await response.json();
            Swal.fire('Error al guardar', err.mensaje || "Revisa los datos ingresados.", 'error');
        }
    } catch (error) {
        console.error("Error al guardar:", error);
        Swal.fire('Error de conexión', 'No se pudo contactar con el servidor.', 'error');
    }
}