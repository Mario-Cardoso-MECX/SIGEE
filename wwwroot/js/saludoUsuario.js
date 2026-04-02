document.addEventListener("DOMContentLoaded", async() => {
    const usuarioSesion = localStorage.getItem('usuarioSesion');
    if (usuarioSesion) {
        const usuarioObj = JSON.parse(usuarioSesion);
        const saludoElem = document.getElementById('nombreUsuarioSaludo');
        if(saludoElem) saludoElem.innerText = usuarioObj.nombre; 
    }
});