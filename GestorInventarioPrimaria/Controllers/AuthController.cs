using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens; // <-- NUEVO: JWT
using System.IdentityModel.Tokens.Jwt; // <-- NUEVO: JWT
using System.Security.Claims; // <-- NUEVO: JWT
using System.Text; // <-- NUEVO: JWT
using System;
using System.Threading.Tasks;

namespace GestorInventarioPrimaria.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/Auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.Rol != "Alumno");

            if (usuario == null)
            {
                return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });
            }

            // --- NUEVO: VERIFICACIÓN HIBRIDA (SOPORTA HASH Y TEXTO PLANO) ---
            bool passwordCorrecta = false;
            if (usuario.PasswordHash.StartsWith("$2")) // BCrypt
            {
                passwordCorrecta = BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash);
            }
            else // Texto plano original
            {
                passwordCorrecta = (usuario.PasswordHash == request.Password);
            }

            if (!passwordCorrecta)
            {
                return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });
            }
            // ----------------------------------------------------------------

            // --- NUEVO: GENERAR EL TOKEN JWT DE SEGURIDAD ---
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes("SIGEE_Super_Secret_Key_Para_Primaria_2026_ExtremadamenteLarga");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[]
                {
                    new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                    new Claim(ClaimTypes.Name, usuario.Username),
                    new Claim(ClaimTypes.Role, usuario.Rol)
                }),
                Expires = DateTime.UtcNow.AddHours(8), 
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var tokenJwt = tokenHandler.CreateToken(tokenDescriptor);
            var jwtString = tokenHandler.WriteToken(tokenJwt);
            // -------------------------------------------------

            // --- MAGIA: Generamos un Token Único para destruir sesiones viejas ---
            usuario.TokenSesion = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            // AQUÍ ESTABA EL DETALLE: Agregamos el ID y los Apellidos
            return Ok(new
            {
                id = usuario.Id,
                nombre = usuario.Nombre,
                apellidos = usuario.Apellidos,
                username = usuario.Username,
                rol = usuario.Rol,
                token = jwtString, // <-- NUEVO: MANDAMOS EL JWT PARA PROTEGER LA API
                tokenUnicoDb = usuario.TokenSesion // Mantenemos tu magia original
            });
        }

        // --- NUEVO: ENDPOINT PARA VIGILAR SI LA SESIÓN SIGUE SIENDO VÁLIDA ---
        [HttpGet("verificar-sesion")]
        public async Task<IActionResult> VerificarSesion([FromQuery] string username, [FromQuery] string token)
        {
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Username == username);
            
            if (usuario == null || usuario.TokenSesion != token)
            {
                return Unauthorized(new { mensaje = "Sesión iniciada en otro dispositivo." });
            }

            return Ok();
        }
    }

    // DTOs para las peticiones
    public class LoginRequest { 
        public required string Username { get; set; } 
        public required string Password { get; set; } 
    }
}