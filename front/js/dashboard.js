document.addEventListener("DOMContentLoaded", async () => { 
    // 2. Llamada a la API
    try {
        const response = await fetch(`${API_URL}/dashboard/resumen`);
        if (response.ok) {
            const data = await response.json();
            
            const elemAlumnos = document.getElementById('lblTotalAlumnos');
            const elemTitulos = document.getElementById('lblTotalTitulos');
            const elemPrestamos = document.getElementById('lblPrestamos');

            if(elemAlumnos) elemAlumnos.innerText = data.alumnos || data.Alumnos || 0;
            if(elemTitulos) elemTitulos.innerText = data.titulos || data.Titulos || 0;
            if(elemPrestamos) elemPrestamos.innerText = data.prestamos || data.Prestamos || 0;

        }
    } catch (error) {
        console.error("Error al conectar con el Dashboard:", error);
    }
});