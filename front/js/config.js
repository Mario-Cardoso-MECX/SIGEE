// front/js/config.js

// Forma 1: Manual (cambias la variable manualmente antes de subir)
// const API_URL = "https://localhost:7082/api"; 
// const API_URL = "http://josuemc-001-site1.rtempurl.com/api";

// Forma 2: Automática (¡Recomendada!)
// Detecta si estás en localhost; si no, usa la URL de tu servidor
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "https://localhost:7082/api"
    : "http://josuemc-001-site1.rtempurl.com/api"; // <-- Pon aquí la URL de tu servidor en producción