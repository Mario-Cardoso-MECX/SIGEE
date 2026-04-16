using GestorInventarioPrimaria.DTOs; // <--- LA BRÚJULA
using GestorInventarioPrimaria.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestorInventarioPrimaria.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AulasController : ControllerBase
    {
        private readonly IAulaService _aulaService;

        public AulasController(IAulaService aulaService)
        {
            _aulaService = aulaService;
        }

        [HttpGet("reservas")]
        public async Task<ActionResult<IEnumerable<object>>> GetReservas()
        {
            var reservas = await _aulaService.GetReservasAsync();
            return Ok(reservas);
        }

        [HttpPost("solicitar")]
        public async Task<IActionResult> SolicitarReserva([FromBody] SolicitudAulaDto dto)
        {
            var (statusCode, data) = await _aulaService.SolicitarReservaAsync(dto);
            if (statusCode == 400) return BadRequest(data);
            return Ok(data);
        }

        [HttpPut("aprobar/{id}")]
        public async Task<IActionResult> AprobarReserva(int id)
        {
            var (statusCode, data) = await _aulaService.AprobarReservaAsync(id);
            if (statusCode == 404) return NotFound(data);
            return Ok(data);
        }

        [HttpPut("rechazar/{id}")]
        public async Task<IActionResult> RechazarReserva(int id, [FromBody] MotivoDto datos)
        {
            var (statusCode, data) = await _aulaService.RechazarReservaAsync(id, datos.Motivo);
            if (statusCode == 404) return NotFound(data);
            return Ok(data);
        }

        [HttpDelete("cancelar/{id}")]
        public async Task<IActionResult> CancelarReserva(int id)
        {
            var (statusCode, data) = await _aulaService.CancelarReservaAsync(id);
            if (statusCode == 404) return NotFound(data);
            return Ok(data);
        }
    }
}