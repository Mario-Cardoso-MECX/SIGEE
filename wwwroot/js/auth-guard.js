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
            tiempoInactividad = setTimeout(cerrarSesionPorInactividad, 300000); // 300,000 ms = 5 minutos
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
            // CORRECCIÓN AQUÍ: Ahora buscamos "sesion.tokenUnicoDb" que es el que manda C#
            if (typeof API_URL !== 'undefined' && sesion.username && sesion.tokenUnicoDb) {
                // Hacemos el ping a C# enviando el tokenUnicoDb real
                fetch(`${API_URL}/Auth/verificar-sesion?username=${sesion.username}&token=${sesion.tokenUnicoDb}`)
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