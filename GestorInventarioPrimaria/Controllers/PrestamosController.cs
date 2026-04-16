using GestorInventarioPrimaria.DTOs;
using GestorInventarioPrimaria.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestorInventarioPrimaria.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PrestamosController : ControllerBase
    {
        private readonly IPrestamoService _prestamoService;

        // Inyectamos el Servicio, YA NO inyectamos el AppDbContext aquí
        public PrestamosController(IPrestamoService prestamoService)
        {
            _prestamoService = prestamoService;
        }

        [HttpPost("registrar")]
        public async Task<IActionResult> RegistrarPrestamo([FromBody] PrestamoDto datos)
        {
            var (statusCode, errorMessage, data) = await _prestamoService.RegistrarPrestamoAsync(datos);
            if (statusCode == 400) return BadRequest(errorMessage);
            if (statusCode == 404) return NotFound(errorMessage);
            return Ok(data);
        }

        [HttpGet("pendientes/{matricula}")]
        public async Task<ActionResult<IEnumerable<object>>> GetPendientes(string matricula)
        {
            var (statusCode, errorMessage, data) = await _prestamoService.GetPendientesAsync(matricula);
            if (statusCode == 404) return NotFound(errorMessage);
            return Ok(data);
        }

        [HttpPut("devolver/{idReserva}")]
        public async Task<IActionResult> DevolverMaterial(int idReserva)
        {
            var (statusCode, errorMessage, data) = await _prestamoService.DevolverMaterialAsync(idReserva);
            if (statusCode == 404) return NotFound(errorMessage);
            if (statusCode == 400) return BadRequest(errorMessage);
            return Ok(data);
        }

        [HttpPut("renovar/{id}")]
        public async Task<IActionResult> RenovarPrestamo(int id)
        {
            var (statusCode, errorMessage, data) = await _prestamoService.RenovarPrestamoAsync(id);
            if (statusCode == 404) return NotFound(errorMessage);
            if (statusCode == 400) return BadRequest(errorMessage);
            return Ok(data);
        }

        [HttpGet("historial-alumno/{usuarioId}")]
        public async Task<IActionResult> GetHistorialPorAlumno(int usuarioId)
        {
            var historial = await _prestamoService.GetHistorialPorAlumnoAsync(usuarioId);
            return Ok(historial);
        }

        [HttpGet("historial")]
        public async Task<ActionResult<IEnumerable<object>>> GetHistorial(int pagina = 1, int cantidad = 10)
        {
            if (pagina <= 0) pagina = 1;
            if (cantidad <= 0) cantidad = 10;
            
            var historial = await _prestamoService.GetHistorialAsync(pagina, cantidad);
            return Ok(historial);
        }
    }
}