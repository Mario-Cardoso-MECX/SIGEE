// Variable global para bloquear el guardado accidental del scroll
let isRestoringScroll = false;

document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();

    // Evaluamos los permisos para el Formulario de Nuevo Material
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;

    // Si NO es Admin y NO es de Inventario, le escondemos el formulario
    if (rol !== 'Admin' && rol !== 'Inventario') {
        const formMaterial = document.getElementById('formMaterial');
        
        if (formMaterial) {
            const tarjetaFormulario = formMaterial.closest('.card-accion');
            if (tarjetaFormulario) {
                tarjetaFormulario.style.display = 'none';
            }
        }
    }

    // --- MEMORIA DE SCROLL DOBLE (Página completa y Tabla interna) ---
    // 1. Guardar el scroll grandote (ventana)
    window.addEventListener('scroll', () => {
        if (!isRestoringScroll) {
            const inputBuscador = document.getElementById('txtBuscarInv');
            const term = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
            sessionStorage.setItem('scroll_ventana_' + term, window.scrollY);
        }
    });

    // 2. Guardar el scroll pequeño (tabla)
    const contenedorTabla = document.querySelector('.tabla-container');
    if (contenedorTabla) {
        contenedorTabla.addEventListener('scroll', () => {
            if (!isRestoringScroll) {
                const inputBuscador = document.getElementById('txtBuscarInv');
                const term = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
                sessionStorage.setItem('scroll_interno_' + term, contenedorTabla.scrollTop);
            }
        });
    }
});

async function cargarInventario() {
    const tabla = document.getElementById('tablaInventarioBody');
    
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
    const rol = sesion.rol;
    const puedeEditar = rol === 'Admin' || rol === 'Inventario';

    try {
        const response = await fetch(`${API_URL}/Materiales`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
        });
        const materiales = await response.json();
        tabla.innerHTML = '';

        let htmlFilas = '';

        materiales.forEach(m => {
            const stock = m.stockDisponible;
            let estiloStock = ''; let aviso = '';
            
            if (m.categoria !== "Salón") {
                if (stock === 0) { estiloStock = "color:#dc2626; font-weight:bold; background:#fee2e2; padding:2px 5px; border-radius:4px;"; aviso = " ¡AGOTADO!"; } 
                else if (stock <= 3) { estiloStock = "color:#d97706; font-weight:bold;"; aviso = " (Poco)"; }
                else if (stock >= 4) { estiloStock = "color:#059669; font-weight:bold;"; aviso = " Suficiente"; }
            }

            const acciones = puedeEditar 
                ? `<div class="acciones-flex">
                       <button onclick="prepararEdicion(${m.id}, '${m.titulo.replace(/'/g, "\\'")}', '${m.categoria}', ${m.stockDisponible})" class="btn-editar-naranja" title="Editar"><i class="fas fa-edit"></i></button>
                       <button onclick="eliminarMaterial(${m.id})" class="btn-borrar-rojo" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                   </div>`
                : `<span style="color:gray; font-size:0.85rem;">Solo lectura</span>`;
        
            htmlFilas += `
                <tr>
                    <td>${m.id}</td>
                    <td><strong>${m.titulo}</strong></td>
                    <td>${m.categoria}</td>
                    <td><span style="${estiloStock}">${stock}${aviso}</span></td>
                    <td style="text-align:center;">${acciones}</td>
                </tr>
            `;
        });
        
        tabla.innerHTML = htmlFilas;

        // --- RECUPERAR FILTROS AL RECARGAR LA PÁGINA (F5) ---
        const inputBuscar = document.getElementById('txtBuscarInv');
        const termActual = inputBuscar ? inputBuscar.value.toLowerCase().trim() : '';

        if (termActual !== '') {
            const evento = new Event('input');
            inputBuscar.dispatchEvent(evento);
            
            document.querySelectorAll('.filter-chips .chip').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${inputBuscar.value}'`)) {
                    btn.classList.add('active');
                }
            });
        } else {
            // Si no hay filtro, restauramos ambos scrolls para la vista general
            restaurarAmbosScrolls('');
        }

    } catch (error) { 
        console.error(error); 
        tabla.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error al cargar datos.</td></tr>';
    }
}

// FUNCIÓN MAESTRA PARA RECUPERAR AMBOS SCROLLS
function restaurarAmbosScrolls(term) {
    isRestoringScroll = true; // Ponemos el candado
    
    const scrollVentana = sessionStorage.getItem('scroll_ventana_' + term);
    const scrollInterno = sessionStorage.getItem('scroll_interno_' + term);
    const contenedorTabla = document.querySelector('.tabla-container');
    
    requestAnimationFrame(() => {
        // 1. Restaurar scroll grandote
        window.scrollTo({ top: scrollVentana ? parseInt(scrollVentana) : 0, behavior: 'instant' });
        
        // 2. Restaurar scroll pequeño (si existe)
        if (contenedorTabla) {
            contenedorTabla.scrollTop = scrollInterno ? parseInt(scrollInterno) : 0;
        }
        
        // Quitamos el candado
        setTimeout(() => { isRestoringScroll = false; }, 150); 
    });
}

// FUNCIÓN PARA GUARDAR (CREAR O EDITAR)
async function guardarMaterial() {
    const id = document.getElementById('txtIdMaterial').value;
    const titulo = document.getElementById('txtTitulo').value.trim();
    const categoria = document.getElementById('selCategoria').value;
    const stock = document.getElementById('txtStock').value;

    if (!titulo || titulo.length < 3) {
        Swal.fire('Atención', 'El título del material debe tener al menos 3 letras.', 'warning');
        return;
    }
    if (!stock || stock <= 0) {
        Swal.fire('Atención', 'El stock debe ser mayor a 0.', 'warning');
        return;
    }
    
    if (!titulo || !stock) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    let stockFinal = parseInt(stock);

    if (categoria === "Salón") {
        stockFinal = 1;
    }

    const material = {
        id: id ? parseInt(id) : 0,
        titulo: titulo,
        categoria: categoria,
        stockDisponible: stockFinal 
    };

    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/Materiales/${id}` : `${API_URL}/Materiales`;
    
    const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sesion.token}` // <-- NUEVO: TOKEN
            },
            body: JSON.stringify(material)
        });

        if (response.ok) {
            Swal.fire({
                title: '¡Éxito!',
                text: id ? "Material actualizado con éxito" : "Material creado con éxito",
                icon: 'success',
                confirmButtonColor: '#27ae60',
                timer: 2000, 
                showConfirmButton: false
            });
            limpiarFormulario();
            cargarInventario(); 
        } else {
            const error = await response.text();
            alert("❌ Error al guardar: " + error);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error de conexión con el servidor.");
    }
}

// FUNCIÓN PARA ELIMINAR
async function eliminarMaterial(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "El material será eliminado del inventario de forma permanente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c', 
        cancelButtonColor: '#94a3b8',  
        confirmButtonText: '<i class="fa-solid fa-trash"></i> Sí, eliminar',
        cancelButtonText: '<i class="fa-solid fa-xmark"></i> Cancelar'
    });

    if (confirmacion.isConfirmed) {
        const sesion = JSON.parse(localStorage.getItem('usuarioSesion')) || {};
        try {
            const response = await fetch(`${API_URL}/Materiales/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${sesion.token}` } // <-- NUEVO: TOKEN
            });

            if (response.ok) {
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El material ha sido borrado correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#27ae60'
                });
                cargarInventario(); 
            } else {
                const errorMsg = await response.text();
                Swal.fire({
                    title: 'No se pudo eliminar',
                    text: errorMsg,
                    icon: 'error',
                    confirmButtonColor: '#3498db'
                });
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            Swal.fire('Error de conexión', 'No se pudo contactar con el servidor.', 'error');
        }
    }
}

// FILTRAR POR CATEGORÍA
function filtrarPorCategoria(categoria) {
    document.querySelectorAll('.filter-chips .chip').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${categoria}'`)) {
            btn.classList.add('active');
        }
    });

    const inputBusqueda = document.getElementById('txtBuscarInv');
    inputBusqueda.value = categoria;
    
    const evento = new Event('input');
    inputBusqueda.dispatchEvent(evento);
}

function prepararEdicion(id, titulo, categoria, stock) {
    document.getElementById('txtIdMaterial').value = id;
    document.getElementById('txtTitulo').value = titulo;
    document.getElementById('selCategoria').value = categoria;
    document.getElementById('txtStock').value = stock;
    document.getElementById('tituloForm').innerHTML = `<i class="fas fa-edit"></i> Editando: ${titulo}`;
    document.getElementById('btnGuardar').innerHTML = `<i class="fas fa-check-circle"></i> Actualizar Cambios`;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formMaterial').reset();
    document.getElementById('txtIdMaterial').value = "";
    // CORRECCIÓN: Usamos innerHTML para respetar los iconos de FontAwesome
    document.getElementById('tituloForm').innerHTML = `<i class="fas fa-edit"></i> Gestionar Material / Libro`;
    document.getElementById('btnGuardar').innerHTML = `<i class="fas fa-check-circle"></i> Guardar Material`;
}

// --- BUSCADOR INTELIGENTE Y RESTAURACIÓN DOBLE ---
let tiempoEsperaBuscador;
const inputBuscador = document.getElementById('txtBuscarInv');

if (inputBuscador) {
    inputBuscador.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        clearTimeout(tiempoEsperaBuscador);
        
        tiempoEsperaBuscador = setTimeout(() => {
            const rows = document.querySelectorAll('#tablaInventarioBody tr');
            
            rows.forEach(r => {
                if (term === '') {
                    r.style.display = ''; 
                } else {
                    r.style.display = r.textContent.toLowerCase().includes(term) ? '' : 'none';
                }
            });

            // Llamamos a la función maestra para recuperar ambos scrolls
            restaurarAmbosScrolls(term);

        }, 500); 
    });
}

// --- CONTROL INTELIGENTE DE STOCK POR CATEGORÍA ---
const selectCategoria = document.getElementById('selCategoria');
const inputStock = document.getElementById('txtStock');

if (selectCategoria && inputStock) {
    selectCategoria.addEventListener('change', (e) => {
        if (e.target.value === "Salón") {
            inputStock.value = 1;
            inputStock.setAttribute('readonly', true);
            inputStock.style.backgroundColor = "#f1f5f9"; 
            inputStock.style.cursor = "not-allowed";
        } else {
            inputStock.removeAttribute('readonly');
            inputStock.style.backgroundColor = "#fff";
            inputStock.style.cursor = "text";
            
            if (inputStock.value == "1" && inputStock.hasAttribute('readonly')) {
                inputStock.value = ""; 
            }
        }
    });
}