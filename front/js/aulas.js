document.addEventListener('DOMContentLoaded', () => {
    // Evitar que pidan para días en el pasado
    const hoy = new Date().toISOString().split('T')[0];
    const txtFecha = document.getElementById('txtFechaReserva');
    if(txtFecha) txtFecha.setAttribute('min', hoy);

    cargarReservas();
});

async function cargarReservas() {
    const tabla = document.getElementById('tablaAulasBody');
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;
    
    // MAGIA: Buscar el ID de todas las formas posibles
    const miUsuarioId = sesion.id || sesion.Id || sesion.usuarioId || sesion.UsuarioId;
    const esAdminOSecre = (rol === 'Admin' || rol === 'Secretaria');

    try {
        const response = await fetch(`${API_URL}/Aulas/reservas`);
        const reservas = await response.json();
        
        tabla.innerHTML = '';
        
        if(reservas.length === 0){
            tabla.innerHTML = '<tr><td colspan="5">No hay reservas registradas.</td></tr>';
            return;
        }

        reservas.forEach(r => {
            let badge = '';
            if(r.estatus === 'Pendiente') badge = '<span class="badge pendiente"><i class="fas fa-clock"></i> Pendiente</span>';
            else if(r.estatus === 'Aprobada') badge = '<span class="badge aprobada"><i class="fas fa-check-double"></i> Aprobada</span>';
            else badge = `<span class="badge rechazada" title="${r.motivo || ''}"><i class="fas fa-times"></i> Rechazada</span>`;

            let acciones = '';
            
            if(esAdminOSecre && r.estatus === 'Pendiente') {
                acciones += `<button onclick="aprobarReserva(${r.id})" style="background:#27ae60; color:white; border:none; padding:8px 12px; border-radius:5px; margin-right:5px; cursor:pointer;" title="Aprobar"><i class="fas fa-check"></i></button>`;
                acciones += `<button onclick="rechazarReserva(${r.id})" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:5px; margin-right:5px; cursor:pointer;" title="Rechazar"><i class="fas fa-times"></i></button>`;
            }
            
            if(esAdminOSecre || r.usuarioId === miUsuarioId) {
                acciones += `<button onclick="cancelarReserva(${r.id})" style="background:#7f8c8d; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;" title="Eliminar/Cancelar"><i class="fas fa-trash"></i></button>`;
            }

            const horaInicio = r.horaInicio.substring(0,5);
            const horaFin = r.horaFin.substring(0,5);
            const fechaLocal = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-MX');

            tabla.innerHTML += `
                <tr>
                    <td><strong>${r.nombreProfesor || 'Usuario'}</strong><br><small style="color:gray;">${r.motivo || ''}</small></td>
                    <td>${fechaLocal}</td>
                    <td><i class="fas fa-clock" style="color:#3498db;"></i> ${horaInicio} a ${horaFin}</td>
                    <td>${badge}<br><small style="color:#e74c3c; font-weight:bold;">${r.estatus === 'Rechazada' && r.motivo ? r.motivo : ''}</small></td>
                    <td>${acciones}</td>
                </tr>
            `;
        });
    } catch(e) {
        console.error(e);
        tabla.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar. Revisa la consola.</td></tr>';
    }
}

async function solicitarReserva() {
    const fecha = document.getElementById('txtFechaReserva').value;
    const hInicio = document.getElementById('selHoraInicio').value;
    const hFin = document.getElementById('selHoraFin').value;
    const motivo = document.getElementById('txtMotivo').value;
    
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    
    // MAGIA: Buscar el ID de todas las formas posibles
    const miUsuarioId = sesion.id || sesion.Id || sesion.usuarioId || sesion.UsuarioId;

    // Si de plano no hay ID en la sesión, frenamos todo antes de que truene
    if (!miUsuarioId) {
        Swal.fire('Sesión no detectada', 'No pudimos identificar tu cuenta. Por favor, dale clic a "Cerrar Sesión" en el menú izquierdo y vuelve a entrar.', 'error');
        return;
    }

    if(hInicio >= hFin) {
        Swal.fire('Atención', 'La hora de inicio debe ser menor a la hora de fin.', 'warning');
        return;
    }

    Swal.fire({ title: 'Enviando solicitud...', didOpen: () => { Swal.showLoading() } });

    try {
        const response = await fetch(`${API_URL}/Aulas/solicitar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: miUsuarioId, // MANDAMOS EL ID SEGURO
                fecha: fecha,
                horaInicio: hInicio,
                horaFin: hFin,
                motivo: motivo
            })
        });

        const data = await response.json();

        if(response.ok) {
            Swal.fire('¡Éxito!', data.mensaje, 'success');
            document.getElementById('formReservaAula').reset();
            cargarReservas();
        } else {
            Swal.fire('Atención', data.mensaje, 'warning');
        }
    } catch(e) {
        Swal.fire('Error', 'Error de conexión con el servidor', 'error');
    }
}

async function aprobarReserva(id) {
    try {
        const response = await fetch(`${API_URL}/Aulas/aprobar/${id}`, { method: 'PUT' });
        if(response.ok) {
            Swal.fire({title: 'Aprobada', icon: 'success', timer: 1500, showConfirmButton: false});
            cargarReservas();
        }
    } catch(e) { console.error(e); }
}

async function rechazarReserva(id) {
    const { value: motivoRechazo } = await Swal.fire({
        title: 'Rechazar Solicitud',
        input: 'text',
        inputLabel: '¿Por qué rechazas esta solicitud?',
        inputPlaceholder: 'Ej: El aula se usará para junta...',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Rechazar'
    });

    if (motivoRechazo !== undefined) { 
        try {
            const response = await fetch(`${API_URL}/Aulas/rechazar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo: motivoRechazo || 'Sin motivo especificado' })
            });
            if(response.ok) {
                Swal.fire({title: 'Rechazada', icon: 'info', timer: 1500, showConfirmButton: false});
                cargarReservas();
            }
        } catch(e) { console.error(e); }
    }
}

async function cancelarReserva(id) {
    const confirmacion = await Swal.fire({
        title: '¿Eliminar Reserva?',
        text: "Se borrará del calendario permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c'
    });

    if(confirmacion.isConfirmed) {
        try {
            await fetch(`${API_URL}/Aulas/cancelar/${id}`, { method: 'DELETE' });
            cargarReservas();
        } catch(e) { console.error(e); }
    }
}