using GestorInventarioPrimaria.DTOs;
using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace GestorInventarioPrimaria.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;

        public AuthService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(int StatusCode, object Data)> LoginAsync(LoginRequest request)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.Rol != "Alumno");

            if (usuario == null || string.IsNullOrEmpty(usuario.PasswordHash) || !usuario.PasswordHash.StartsWith("$2"))
            {
                return (401, new { mensaje = "Usuario o contraseña incorrectos." });
            }

            bool passwordCorrecta = BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash);

            if (!passwordCorrecta)
            {
                return (401, new { mensaje = "Usuario o contraseña incorrectos." });
            }

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

            usuario.TokenSesion = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            return (200, new
            {
                id = usuario.Id,
                nombre = usuario.Nombre,
                apellidos = usuario.Apellidos,
                username = usuario.Username,
                rol = usuario.Rol,
                token = jwtString,
                tokenUnicoDb = usuario.TokenSesion 
            });
        }

        public async Task<(int StatusCode, object Data)> VerificarSesionAsync(string username, string token)
        {
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Username == username);
            
            if (usuario == null || usuario.TokenSesion != token)
            {
                return (401, new { mensaje = "Sesión iniciada en otro dispositivo." });
            }

            return (200, new { mensaje = "OK" });
        }
    }
}