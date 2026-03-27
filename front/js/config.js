// front/js/config.js

let API_URL = "";

// 1. Detecta si estás en Internet (SmarterASP)
if (window.location.hostname.includes("josuemc-001-site1.rtempurl.com")) {
    API_URL = "http://josuemc-001-site1.rtempurl.com/api";
} 
// 2. Detecta si estás en Visual Studio o Live Server (Desarrollo local)
else if (window.location.port === "7082" || window.location.port === "5500") {
    API_URL = "https://localhost:7082/api";
} 
// 3. Si no es VS ni Internet, asume que es el IIS de la primaria (Puerto 8080 u otro)
else {
    API_URL = window.location.origin + "/api"; 
}