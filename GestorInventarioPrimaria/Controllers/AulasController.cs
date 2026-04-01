using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Models;

namespace GestorInventarioPrimaria.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AulasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AulasController(AppDbContext context)
        {
            _context = context;
        }

        // 1. Obtener todas las reservas
        [HttpGet("reservas")]
        public async Task<ActionResult<IEnumerable<ReservaAula>>> GetReservas()
        {
            var reservas = await _context.ReservasAula
                .Include(r => r.Usuario)
                .OrderBy(r => r.Fecha)
                .ThenBy(r => r.HoraInicio)
                .ToListAsync();

            foreach (var r in reservas)
            {
                if (r.Usuario != null)
                    r.NombreProfesor = $"{r.Usuario.Nombre} {r.Usuario.Apellidos}";
            }

            return Ok(reservas);
        }

        // 2. Solicitar un horario
        [HttpPost("solicitar")]
        public async Task<IActionResult> SolicitarReserva([FromBody] ReservaAula nuevaReserva)
        {
            // --- PARCHE ANTI-CRASH 1: Validar que el usuario exista ---
            if (nuevaReserva.UsuarioId <= 0)
            {
                return BadRequest(new { mensaje = "❌ Error: No pudimos detectar tu ID de usuario. Por favor, cierra sesión y vuelve a entrar." });
            }

            // Validar que NO haya empalmes
            bool hayEmpalme = await _context.ReservasAula.AnyAsync(r =>
                r.Fecha.Date == nuevaReserva.Fecha.Date &&
                r.Estatus != "Rechazada" &&
                r.HoraInicio < nuevaReserva.HoraFin &&
                r.HoraFin > nuevaReserva.HoraInicio
            );

            if (hayEmpalme)
            {
                return BadRequest(new { mensaje = "❌ El horario seleccionado ya está ocupado o en proceso de revisión." });
            }

            nuevaReserva.Estatus = "Pendiente";
            
            // --- PARCHE ANTI-CRASH 2: Motivo por defecto por si las dudas ---
            if (string.IsNullOrEmpty(nuevaReserva.Motivo))
            {
                nuevaReserva.Motivo = "Clase regular";
            }

            _context.ReservasAula.Add(nuevaReserva);
            await _context.SaveChangesAsync(); // <-- Aquí era donde explotaba

            return Ok(new { mensaje = "✅ Solicitud enviada. Espera la confirmación en tu panel." });
        }

        // 3. Aprobar Reserva
        [HttpPut("aprobar/{id}")]
        public async Task<IActionResult> AprobarReserva(int id)
        {
            var reserva = await _context.ReservasAula.FindAsync(id);
            if (reserva == null) return NotFound(new { mensaje = "Reserva no encontrada." });

            var empalmadas = await _context.ReservasAula.Where(r =>
                r.Id != id &&
                r.Fecha.Date == reserva.Fecha.Date &&
                r.Estatus == "Pendiente" &&
                r.HoraInicio < reserva.HoraFin &&
                r.HoraFin > reserva.HoraInicio
            ).ToListAsync();

            foreach (var emp in empalmadas)
            {
                emp.Estatus = "Rechazada";
                emp.Motivo = "El horario fue ganado por otra solicitud que se aprobó primero.";
            }

            reserva.Estatus = "Aprobada";
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Reserva aprobada correctamente." });
        }

        // 4. Rechazar Reserva
        public class MotivoDto { public string Motivo { get; set; } = ""; }

        [HttpPut("rechazar/{id}")]
        public async Task<IActionResult> RechazarReserva(int id, [FromBody] MotivoDto datos)
        {
            var reserva = await _context.ReservasAula.FindAsync(id);
            if (reserva == null) return NotFound(new { mensaje = "Reserva no encontrada." });

            reserva.Estatus = "Rechazada";
            reserva.Motivo = datos.Motivo; 
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Reserva rechazada." });
        }

        // 5. Eliminar Reserva
        [HttpDelete("cancelar/{id}")]
        public async Task<IActionResult> CancelarReserva(int id)
        {
            var reserva = await _context.ReservasAula.FindAsync(id);
            if (reserva == null) return NotFound(new { mensaje = "Reserva no encontrada." });

            _context.ReservasAula.Remove(reserva);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Reserva cancelada y eliminada." });
        }
    }
}