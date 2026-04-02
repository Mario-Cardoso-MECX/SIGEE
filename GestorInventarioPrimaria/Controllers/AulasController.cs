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
        public async Task<ActionResult<IEnumerable<object>>> GetReservas()
        {
            var reservas = await _context.ReservasAula
                .Include(r => r.Usuario)
                .OrderBy(r => r.Fecha)
                .ThenBy(r => r.HoraInicio)
                .ToListAsync();

            // Mapeamos a un objeto a la medida para enviarle la matrícula exacta al frontend
            var resultado = reservas.Select(r => new {
                id = r.Id,
                matriculaProfesor = r.Usuario != null ? (r.Usuario.Matricula ?? r.Usuario.Username) : "",
                nombreProfesor = r.Usuario != null ? $"{r.Usuario.Nombre} {r.Usuario.Apellidos}" : "Usuario Borrado",
                fecha = r.Fecha.ToString("yyyy-MM-dd"),
                horaInicio = r.HoraInicio.ToString(@"hh\:mm\:ss"),
                horaFin = r.HoraFin.ToString(@"hh\:mm\:ss"),
                estatus = r.Estatus,
                motivo = r.Motivo
            });

            return Ok(resultado);
        }

        // Estructura temporal para recibir la petición del Frontend en texto
        public class SolicitudAulaDto
        {
            public string Matricula { get; set; } = "";
            public DateTime Fecha { get; set; }
            public TimeSpan HoraInicio { get; set; }
            public TimeSpan HoraFin { get; set; }
            public string Motivo { get; set; } = "";
        }

        // 2. Solicitar un horario
        [HttpPost("solicitar")]
        public async Task<IActionResult> SolicitarReserva([FromBody] SolicitudAulaDto dto)
        {
            // Buscamos al maestro por su matrícula (PER-2026-001) o username
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Matricula == dto.Matricula || u.Username == dto.Matricula);
            
            if (usuario == null)
            {
                return BadRequest(new { mensaje = $"❌ Error: No encontramos tu cuenta ({dto.Matricula}) en la base de datos." });
            }

            bool hayEmpalme = await _context.ReservasAula.AnyAsync(r =>
                r.Fecha.Date == dto.Fecha.Date &&
                r.Estatus != "Rechazada" &&
                r.HoraInicio < dto.HoraFin &&
                r.HoraFin > dto.HoraInicio
            );

            if (hayEmpalme)
            {
                return BadRequest(new { mensaje = "❌ El horario seleccionado ya está ocupado o en revisión." });
            }

            var nuevaReserva = new ReservaAula
            {
                UsuarioId = usuario.Id,
                Fecha = dto.Fecha,
                HoraInicio = dto.HoraInicio,
                HoraFin = dto.HoraFin,
                Estatus = "Pendiente",
                Motivo = string.IsNullOrEmpty(dto.Motivo) ? "Clase regular" : dto.Motivo
            };

            _context.ReservasAula.Add(nuevaReserva);
            await _context.SaveChangesAsync();

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