using GestorInventarioPrimaria.DTOs; // <--- LA BRÚJULA
using GestorInventarioPrimaria.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GestorInventarioPrimaria.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var (statusCode, data) = await _authService.LoginAsync(request);
            if (statusCode == 401) return Unauthorized(data);
            return Ok(data);
        }

        [HttpGet("verificar-sesion")]
        public async Task<IActionResult> VerificarSesion([FromQuery] string username, [FromQuery] string token)
        {
            var (statusCode, data) = await _authService.VerificarSesionAsync(username, token);
            if (statusCode == 401) return Unauthorized(data);
            return Ok();
        }
    }
}