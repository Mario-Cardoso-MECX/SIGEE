document.addEventListener("DOMContentLoaded", async () => { 
    // 1. Cargar las tarjetas de Resumen Numérico
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

    // 2. Cargar las Gráficas Visuales
    cargarGraficas();
});

async function cargarGraficas() {
    try {
        // Gráfica 1: Top 5 Libros
        const resTop = await fetch(`${API_URL}/Dashboard/top-libros`);
        if(resTop.ok) {
            const dataTop = await resTop.json();
            renderChartTopLibros(dataTop);
        } else {
            // Si el servidor falla o no está actualizado, mostramos un aviso
            const div = document.getElementById('topLibrosChart').parentElement;
            div.innerHTML = "<p style='color:#e74c3c; text-align:center; padding-top: 50px;'><i class='fas fa-exclamation-triangle'></i> <b>Error:</b><br>La API no encontró esta gráfica.<br>Asegúrate de haber reiniciado tu servidor C#.</p>";
        }

        // Gráfica 2: Préstamos por Mes
        const resMes = await fetch(`${API_URL}/Dashboard/prestamos-mes`);
        if(resMes.ok) {
            const dataMes = await resMes.json();
            renderChartPrestamosMes(dataMes);
        } else {
            const div = document.getElementById('prestamosMesChart').parentElement;
            div.innerHTML = "<p style='color:#e74c3c; text-align:center; padding-top: 50px;'><i class='fas fa-exclamation-triangle'></i> <b>Error:</b><br>La API no encontró esta gráfica.<br>Asegúrate de haber reiniciado tu servidor C#.</p>";
        }
    } catch (error) {
        console.error("Error cargando gráficas:", error);
    }
}

// Función para dibujar la dona (pastel) de Libros
function renderChartTopLibros(data) {
    const ctx = document.getElementById('topLibrosChart');
    if(!ctx) return;

    if (data.length === 0) {
        ctx.parentElement.innerHTML = "<p style='text-align:center; color:gray; margin-top:50px;'>Aún no hay libros prestados.</p>";
        return;
    }

    const labels = data.map(d => d.titulo || d.Titulo);
    const values = data.map(d => d.cantidad || d.Cantidad);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Función para dibujar la gráfica de barras de meses
function renderChartPrestamosMes(data) {
    const ctx = document.getElementById('prestamosMesChart');
    if(!ctx) return;

    if (data.length === 0) {
        ctx.parentElement.innerHTML = "<p style='text-align:center; color:gray; margin-top:50px;'>Aún no hay préstamos registrados este año.</p>";
        return;
    }
    
    // Nombres de los meses
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const labels = data.map(d => mesesNombres[(d.mes || d.Mes) - 1]);
    const values = data.map(d => d.cantidad || d.Cantidad);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Préstamos Realizados',
                data: values,
                backgroundColor: '#3498db',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}