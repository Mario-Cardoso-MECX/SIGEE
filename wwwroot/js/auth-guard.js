(function () {
    const sesionStr = localStorage.getItem('usuarioSesion');
    const isLoginPage = window.location.pathname.includes('login.html');

    // Si NO hay sesión y NO estamos en login.html, expulsar
    if (!sesionStr && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    if (sesionStr && !isLoginPage) {
        const sesion = JSON.parse(sesionStr);

        // --- LÓGICA DE INACTIVIDAD (5 MINUTOS) ---
        let tiempoInactividad;
        
        function resetTimer() {
            clearTimeout(tiempoInactividad);
            // Para 5 minutos estaba en 300000
            tiempoInactividad = setTimeout(cerrarSesionPorInactividad, 300000); // 600,000 ms = 10 minutos
            // o si prefieres 15 minutos usa: 900000 
        }

        function cerrarSesionPorInactividad() {
            localStorage.removeItem('usuarioSesion');
            window.location.href = 'login.html?expirado=true';
        }

        // Escuchamos cualquier movimiento para reiniciar el reloj
        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onkeypress = resetTimer;
        document.onclick = resetTimer;
        document.onscroll = resetTimer;
        document.ontouchstart = resetTimer; // Para celulares

        // --- VIGILANTE DE SESIONES ÚNICAS (TOKEN) ---
        function vigilarSesion() {
            // MODIFICADO: Cambiamos sesion.token por sesion.sesionUnica porque el 'token' ahora es el JWT de seguridad
            if (typeof API_URL !== 'undefined' && sesion.username && sesion.sesionUnica) {
                fetch(`${API_URL}/Auth/verificar-sesion?username=${sesion.username}&token=${sesion.sesionUnica}`)
                    .then(response => {
                        if (response.status === 401) {
                            // Alguien más entró con esta cuenta. Lo sacamos.
                            localStorage.removeItem('usuarioSesion');
                            window.location.href = 'login.html?duplicado=true';
                        }
                    })
                    .catch(err => console.error("Error validando sesión", err));
            }
        }

        // Revisa al cargar la página...
        document.addEventListener("DOMContentLoaded", vigilarSesion);
        
        // ¡LA MAGIA! Revisa en silencio cada 5 segundos (5000 ms)
        setInterval(vigilarSesion, 5000);
    }
})();

function cerrarSesion() {
    localStorage.removeItem('usuarioSesion');
    window.location.href = 'login.html';
}