

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

        personal.forEach(p => {
            const nombre = p.nombre || "";
            const apellidos = p.apellidos || "";
            const nombreCompleto = `${nombre} ${apellidos}`.trim();

            const acciones = esAdmin 
                ? `<button onclick="prepararEditar(${p.id})" class="btn-editar" style="background:#f59e0b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                   <button onclick="eliminarAdmin(${p.id}, '${nombreCompleto || p.username}')" class="btn-volver" style="padding: 8px 15px; font-size: 0.85rem;"><i class="fas fa-user-minus"></i></button>`
                : `<span style="color:gray; font-size:0.85rem;">Solo lectura</span>`;

            tabla.innerHTML += `
                <tr>
                    <td><strong>#${p.matricula}</strong></td>
                    <td>${nombreCompleto || p.username}</td>
                    <td><span class="usuario-tag">@${p.username}</span></td>
                    <td><span class="rol-tag">${p.rol}</span></td>
                    <td>${acciones}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error al cargar personal:", error);
        document.getElementById('tablaPersonal').innerHTML = `
            <tr><td colspan="4" style="text-align:center; color:red;">Error al conectar con el servidor</td></tr>
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
    const confirmacion = confirm(`⚠️ ¿Estás seguro de eliminar a "${nombre}"? \nEsta acción le quitará el acceso al sistema de inmediato.`);

    if (confirmacion) {
        try {
            const response = await fetch(`${API_URL}/Usuarios/eliminar-personal/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("🗑️ Usuario eliminado correctamente.");
                cargarPersonal(); 
            } else {
                const error = await response.json();
                alert("❌ Error: " + (error.mensaje || "No se pudo eliminar"));
            }
        } catch (error) {
            console.error("Error al conectar:", error);
            alert("No se pudo conectar con el servidor.");
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
        alert("Error al obtener datos del usuario");
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

    // 2. Construimos el objeto JSON
    const datos = {
        nombre: nombre,
        apellidos: apellidos,
        username: username,
        rol: rol
    };

    // Si escribieron una contraseña, la mandamos. Si no, no se actualiza.
    if (password) {
        datos.passwordHash = password; // Asignamos al campo que espera tu C#
    }

    try {
        let response;
        
        if (id) {
            // 🟡 MODO EDICIÓN (PUT): Actualiza un registro existente
            datos.id = parseInt(id);
            response = await fetch(`${API_URL}/Usuarios/editar-personal/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
        } else {
            // 🟢 MODO NUEVO (POST): Crea un registro desde cero
            // Generamos una matrícula automática para el docente
            datos.matricula = "DOC-" + Math.floor(Math.random() * 10000); 
            
            response = await fetch(`${API_URL}/Usuarios/crear-personal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
        }

        if (response.ok) {
            const res = await response.json();
            alert("✅ " + res.mensaje);
            
            // Cerramos el modal y recargamos la tabla
            document.getElementById('modalNuevoPersonal').style.display = 'none';
            cargarPersonal(); 
        } else {
            const err = await response.json();
            alert("❌ Error: " + (err.mensaje || "Revisa los datos ingresados."));
        }
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error de conexión con el servidor.");
    }
}