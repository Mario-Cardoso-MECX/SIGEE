(function () {
    const sesion = localStorage.getItem('usuarioSesion');

    // Si NO hay sesión y NO estamos en login.html, expulsar
    if (!sesion && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }
})();

function cerrarSesion() {
    localStorage.removeItem('usuarioSesion');
    window.location.href = 'login.html';
}