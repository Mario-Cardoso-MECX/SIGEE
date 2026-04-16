using GestorInventarioPrimaria.DTOs;
using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Interfaces;
using GestorInventarioPrimaria.Models;
using Microsoft.EntityFrameworkCore;

namespace GestorInventarioPrimaria.Services
{
    public class AulaService : IAulaService
    {
        private readonly AppDbContext _context;

        public AulaService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<object>> GetReservasAsync()
        {
            var reservas = await _context.ReservasAula
                .Include(r => r.Usuario)
                .OrderBy(r => r.Fecha)
                .ThenBy(r => r.HoraInicio)
                .ToListAsync();

            return reservas.Select(r => new {
                id = r.Id,
                usuarioId = r.UsuarioId,
                matriculaProfesor = r.Usuario != null ? (r.Usuario.Matricula ?? r.Usuario.Username) : "",
                nombreProfesor = r.Usuario != null ? $"{r.Usuario.Nombre} {r.Usuario.Apellidos}" : "Usuario Borrado",
                fecha = r.Fecha.ToString("yyyy-MM-dd"),
                horaInicio = r.HoraInicio.ToString(@"hh\:mm"),
                horaFin = r.HoraFin.ToString(@"hh\:mm"),
                estatus = r.Estatus,
                motivo = r.Motivo
            });
        }

        public async Task<(int StatusCode, object Data)> SolicitarReservaAsync(SolicitudAulaDto dto)
        {
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Matricula == dto.Matricula || u.Username == dto.Matricula);
            
            if (usuario == null)
                return (400, new { mensaje = $"❌ Error: No encontramos tu cuenta ({dto.Matricula}) en la base de datos." });

            if (usuario.Rol != "Docente" && usuario.Rol != "Admin" && usuario.Rol != "Secretaria")
                return (400, new { mensaje = "❌ Acceso denegado: El personal de Inventario no puede apartar el Aula de Medios." });

            bool hayEmpalme = await _context.ReservasAula.AnyAsync(r =>
                r.Fecha.Date == dto.Fecha.Date &&
                r.Estatus != "Rechazada" &&
                r.HoraInicio < dto.HoraFin &&
                r.HoraFin > dto.HoraInicio
            );

            if (hayEmpalme)
                return (400, new { mensaje = "❌ El horario seleccionado ya está ocupado o en revisión." });

            string estatusInicial = "Pendiente";
            if (usuario.Rol == "Admin" || usuario.Rol == "Secretaria")
            {
                estatusInicial = "Aprobada";
            }

            var nuevaReserva = new ReservaAula
            {
                UsuarioId = usuario.Id,
                Fecha = dto.Fecha,
                HoraInicio = dto.HoraInicio,
                HoraFin = dto.HoraFin,
                Estatus = estatusInicial,
                Motivo = string.IsNullOrEmpty(dto.Motivo) ? "Clase regular / Junta" : dto.Motivo
            };

            _context.ReservasAula.Add(nuevaReserva);
            await _context.SaveChangesAsync();

            return (200, new { mensaje = "✅ Solicitud enviada. Espera la confirmación en tu panel." });
        }

        public async Task<(int StatusCode, object Data)> AprobarReservaAsync(int id)
        {
            var reserva = await _context.ReservasAula.FindAsync(id);
            if (reserva == null) return (404, new { mensaje = "Reserva no encontrada." });

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

            return (200, new { mensaje = "Reserva aprobada correctamente." });
        }

        public async Task<(int StatusCode, object Data)> RechazarReservaAsync(int id, string motivo)
        {
            var reserva = await _context.ReservasAula.FindAsync(id);
            if (reserva == null) return (404, new { mensaje = "Reserva no encontrada." });

            reserva.Estatus = "Rechazada";
            reserva.Motivo = motivo; 
            await _context.SaveChangesAsync();

            return (200, new { mensaje = "Reserva rechazada." });
        }

        public async Task<(int StatusCode, object Data)> CancelarReservaAsync(int id)
        {
            var reserva = await _context.ReservasAula.FindAsync(id);
            if (reserva == null) return (404, new { mensaje = "Reserva no encontrada." });

            _context.ReservasAula.Remove(reserva);
            await _context.SaveChangesAsync();

            return (200, new { mensaje = "Reserva cancelada y eliminada." });
        }
    }
}