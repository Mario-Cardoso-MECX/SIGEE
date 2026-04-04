// --- DETECTAR REDIRECCIÓN POR INACTIVIDAD O SESIÓN DUPLICADA ---
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('expirado') === 'true') {
        Swal.fire('Sesión Cerrada', 'Tu sesión expiró por inactividad.', 'info');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    else if (urlParams.get('duplicado') === 'true') {
        Swal.fire('Sesión Terminada', 'Tu cuenta fue abierta en otro dispositivo. Por seguridad, te hemos desconectado aquí.', 'warning');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// DOM Elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const btnLogin = document.getElementById('btnLogin');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalText = btnLogin.innerText;
    btnLogin.disabled = true;
    btnLogin.innerText = "Verificando...";
    errorMessage.classList.add('hidden');

    const usuario = usernameInput.value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    try {
        const response = await fetch(`${API_URL}/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username: usuario, password: password})
        });

        if (response.ok) {
            const data = await response.json();
            
            // Guardar sesión
            localStorage.setItem('usuarioSesion', JSON.stringify(data));
            
            // Éxito visual (Temporal)
            btnLogin.style.backgroundColor = "#10b981";
            btnLogin.innerText = "¡Inicio de sesión exitoso!";
            
            setTimeout(() => {
                localStorage.setItem('usuarioSesion', JSON.stringify(data));
                window.location.href = 'dashboard.html';
            }, 500);

        } else {
            const err = await response.json();
            showError(err.mensaje || "Error de inicio de sesión");
        }

    } catch (error) {
        console.error(error);
        showError("Error de conexión con el servidor.");
    } finally {
        // Restaurar botón si falló
        if (btnLogin.innerText !== "¡Inicio de sesión exitoso!") {
            btnLogin.disabled = false;
            btnLogin.innerText = originalText;
        }
    }
});

function showError(msg) {
    errorMessage.classList.remove('hidden');
    errorText.textContent = msg;
}