document.addEventListener("DOMContentLoaded", () => {
    const sesionStr = localStorage.getItem('usuarioSesion');
    
    if (sesionStr) {
        const sesion = JSON.parse(sesionStr);
        const spanSaludo = document.getElementById('nombreUsuarioSaludo');
        
        if (spanSaludo) {
            spanSaludo.innerText = sesion.nombre.split(' ')[0]; // Muestra solo el primer nombre
        }

        // --- CONVERTIR EL BADGE EN UN BOTÓN DE PERFIL ---
        // Buscamos directamente la clase principal
        const badge = document.querySelector('.user-badge');
        
        if (badge) {
            badge.style.cursor = 'pointer';
            badge.title = "Haz clic para ver y editar tu perfil";
            
            // Le asignamos el evento click de forma explícita
            badge.addEventListener('click', abrirPerfil);
            
            badge.style.transition = "0.3s";
            badge.onmouseover = () => badge.style.opacity = "0.8";
            badge.onmouseout = () => badge.style.opacity = "1";

            // Consultar si tiene foto para cambiar el icono default
            fetch(`${API_URL}/Usuarios/${sesion.id}`, {
                headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
            })
                .then(res => res.json())
                .then(user => {
                    if (user.fotoUrl && user.fotoUrl !== 'null' && user.fotoUrl !== '') {
                        const baseUrl = API_URL.endsWith('/api') ? API_URL.replace('/api', '') : API_URL.substring(0, API_URL.indexOf('/api'));
                        
                        const iconoViejo = badge.querySelector('.icon-usuario') || badge.querySelector('.fa-user-circle');
                        if(iconoViejo) iconoViejo.remove();
                        
                        const img = document.createElement('img');
                        // Agregamos un timestamp para burlar el caché del navegador
                        img.src = baseUrl + user.fotoUrl + "?t=" + new Date().getTime(); 
                        img.style.width = '35px';
                        img.style.height = '35px';
                        img.style.borderRadius = '50%';
                        img.style.objectFit = 'cover';
                        img.style.marginRight = '8px';
                        img.style.border = '2px solid white';
                        img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        
                        badge.insertBefore(img, badge.firstChild);
                    }
                }).catch(e => console.log("Error cargando foto:", e));
        } else {
             console.error("No se encontró el elemento '.user-badge' en el HTML.");
        }
    }
});

async function abrirPerfil() {
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion'));
    
    // Obtenemos los datos frescos del servidor
    let userDb = null;
    try {
        const res = await fetch(`${API_URL}/Usuarios/${sesion.id}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
        });
        userDb = await res.json();
    } catch(e) { 
        Swal.fire('Error', 'No se pudieron cargar los datos del perfil.', 'error');
        return; 
    }

    let fotoActual = 'https://ui-avatars.com/api/?name=' + userDb.nombre.replace(/ /g, '+') + '&background=cbd5e1&color=475569';
    if (userDb.fotoUrl && userDb.fotoUrl !== 'null' && userDb.fotoUrl !== '') {
        const baseUrl = API_URL.endsWith('/api') ? API_URL.replace('/api', '') : API_URL.substring(0, API_URL.indexOf('/api'));
        fotoActual = baseUrl + userDb.fotoUrl + "?t=" + new Date().getTime();
    }

    const { value: formValues } = await Swal.fire({
        title: 'Mi Perfil',
        html: `
            <div style="text-align:center; margin-bottom: 20px;">
                <div style="position:relative; display:inline-block; cursor:pointer; transition:0.3s;" onclick="document.getElementById('fileFotoPersonal').click()" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <img id="imgPreviewPersonal" src="${fotoActual}" style="width:130px; height:130px; border-radius:50%; object-fit:cover; border: 4px solid #3498db; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    <div style="position:absolute; bottom:0; right:5px; background:#2c3e50; color:white; border-radius:50%; width:35px; height:35px; display:flex; align-items:center; justify-content:center; border:3px solid white;">
                        <i class="fas fa-camera"></i>
                    </div>
                </div>
                <input type="file" id="fileFotoPersonal" style="display:none;" accept="image/png, image/jpeg" onchange="cambiarPreviewPersonal(this)">
                <h3 style="margin-top:15px; font-weight:bold; color:#2c3e50; margin-bottom:5px;">${userDb.nombre} ${userDb.apellidos}</h3>
                <span style="background:#e2e8f0; color:#475569; padding:5px 12px; border-radius:20px; font-size:0.85rem; font-weight:bold; display:inline-block; margin-top:5px;">
                    <i class="fas fa-user-shield"></i> ${userDb.rol} | @${userDb.username}
                </span>
            </div>
            
            <hr style="border:0; border-top:1px dashed #cbd5e1; margin:25px 0;">
            
            <h4 style="color:#2c3e50; font-size:1.1rem; text-align:left; margin-bottom:15px;"><i class="fas fa-lock"></i> Cambiar Contraseña</h4>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <input type="password" id="txtPassActual" class="swal2-input" placeholder="Ingresa tu contraseña actual" style="margin:0; width:100%; box-sizing:border-box;">
                <input type="password" id="txtPassNueva" class="swal2-input" placeholder="Inventa una nueva contraseña" style="margin:0; width:100%; box-sizing:border-box;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#27ae60',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: '<i class="fas fa-save"></i> Guardar Cambios',
        cancelButtonText: 'Cancelar',
        customClass: {
            container: 'responsive-swal-container',
            popup: 'responsive-swal-popup'
        },
        preConfirm: () => {
            const file = document.getElementById('fileFotoPersonal').files[0];
            const passActual = document.getElementById('txtPassActual').value;
            const passNueva = document.getElementById('txtPassNueva').value;

            // Validación: Si llenó uno, debe llenar el otro
            if ((passActual && !passNueva) || (!passActual && passNueva)) {
                Swal.showValidationMessage('Para cambiar la contraseña, debes llenar ambos campos.');
                return false;
            }

            return { file, passActual, passNueva, username: userDb.username };
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Actualizando perfil...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        
        try {
            // 1. Guardar Foto si seleccionó alguna
            if (formValues.file) {
                const formData = new FormData();
                formData.append('foto', formValues.file);
                const resFoto = await fetch(`${API_URL}/Usuarios/subir-foto-personal/${formValues.username}`, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
                });
                if (!resFoto.ok) throw new Error("Error al subir la imagen. Verifica el formato.");
            }

            // 2. Cambiar Password si los campos tienen texto
            if (formValues.passActual && formValues.passNueva) {
                const resPass = await fetch(`${API_URL}/Usuarios/cambiar-password`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sesion.token}` // <-- NUEVO: TOKEN
                    },
                    body: JSON.stringify({
                        username: formValues.username,
                        passwordActual: formValues.passActual,
                        passwordNueva: formValues.passNueva
                    })
                });
                
                if (!resPass.ok) {
                    const err = await resPass.json();
                    throw new Error(err.mensaje || "La contraseña actual es incorrecta.");
                }
            }

            Swal.fire({
                title: '¡Perfil Actualizado!',
                text: 'Tus datos se guardaron correctamente.',
                icon: 'success',
                confirmButtonColor: '#27ae60'
            }).then(() => {
                location.reload(); // Recargar para mostrar la nueva foto y asegurar la sesión
            });

        } catch (error) {
            Swal.fire('Atención', error.message, 'warning');
        }
    }
}

// Función global para mostrar el preview de la foto antes de guardar
window.cambiarPreviewPersonal = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imgPreviewPersonal').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}