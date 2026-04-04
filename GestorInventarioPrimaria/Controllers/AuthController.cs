using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

            if (usuario == null || usuario.PasswordHash != request.Password)
            {
                return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });
            }

            // --- MAGIA: Generamos un Token Único para destruir sesiones viejas ---
            usuario.TokenSesion = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            return Ok(new
            {
                nombre = usuario.Nombre,
                username = usuario.Username,
                rol = usuario.Rol,
                token = usuario.TokenSesion // Lo mandamos al frontend
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