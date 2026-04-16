using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.DTOs;
using GestorInventarioPrimaria.Interfaces;
using GestorInventarioPrimaria.Models;
using Microsoft.EntityFrameworkCore;

namespace GestorInventarioPrimaria.Services
{
    public class PrestamoService : IPrestamoService
    {
        private readonly AppDbContext _context;

        public PrestamoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(int StatusCode, string ErrorMessage, object Data)> RegistrarPrestamoAsync(PrestamoDto datos)
        {
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Matricula == datos.MatriculaAlumno);
            if (usuario == null) return (400, "❌ No existe ningún usuario con esa matrícula.", null);

            if (!string.IsNullOrEmpty(usuario.Grupo) && usuario.Grupo.ToUpper().Contains("EGRESADO"))
                return (400, $"❌ {usuario.Nombre} es un alumno Egresado. Ya no se le puede prestar material.", null);

            var material = await _context.Materiales.FindAsync(datos.MaterialId);
            if (material == null) return (404, "❌ El material no existe.", null);

            if (material.Categoria == "Salón" && usuario.Rol != "Docente" && usuario.Rol != "Admin")
                return (400, $"❌ Acceso denegado: Los salones solo pueden ser reservados por Docentes. El rol de {usuario.Nombre} es {usuario.Rol}.", null);

            var prestamosActivos = await _context.Reservas.CountAsync(r => r.UsuarioId == usuario.Id && r.Estatus == "Activo");
            if (prestamosActivos >= 2)
                return (400, $"❌ {usuario.Nombre} ya tiene {prestamosActivos} préstamos activos. Debe devolver alguno primero.", null);

            if (material.StockDisponible <= 0)
                return (400, $"❌ No hay disponibilidad de '{material.Titulo}'.", null);

            var nuevaReserva = new Reserva
            {
                UsuarioId = usuario.Id,
                MaterialId = material.Id,
                FechaInicio = DateTime.Now,
                FechaFinEsperada = material.Categoria == "Libro" ? DateTime.Now.AddDays(7) : DateTime.Now.AddHours(datos.HorasDuracion ?? 2),
                Motivo = "Préstamo escolar",
                Estatus = "Activo"
            };

            material.StockDisponible -= 1;
            _context.Reservas.Add(nuevaReserva);
            await _context.SaveChangesAsync();

            var dataResponse = new { mensaje = "✅ Préstamo exitoso", alumno = usuario.Nombre, material = material.Titulo, fechaTermino = nuevaReserva.FechaFinEsperada.ToString("g") };
            return (200, null, dataResponse);
        }

        public async Task<(int StatusCode, string ErrorMessage, IEnumerable<object> Data)> GetPendientesAsync(string matricula)
        {
            var alumno = await _context.Usuarios.FirstOrDefaultAsync(u => u.Matricula == matricula);
            if (alumno == null) return (404, "Alumno no encontrado", null);

            var prestamos = await _context.Reservas
                .Include(r => r.Material)
                .Where(r => r.UsuarioId == alumno.Id && r.Estatus == "Activo")
                .Select(r => new { IdReserva = r.Id, Material = r.Material.Titulo, Categoria = r.Material.Categoria, FechaInicio = r.FechaInicio.ToShortDateString(), FechaFin = r.FechaFinEsperada.ToShortDateString(), FechaFinRaw = r.FechaFinEsperada })
                .ToListAsync();

            return (200, null, prestamos);
        }

        public async Task<(int StatusCode, string ErrorMessage, object Data)> DevolverMaterialAsync(int idReserva)
        {
            var reserva = await _context.Reservas.Include(r => r.Material).FirstOrDefaultAsync(r => r.Id == idReserva);
            if (reserva == null) return (404, "Reserva no encontrada", null);
            if (reserva.Estatus == "Devuelto") return (400, "Este material ya fue devuelto.", null);

            reserva.Estatus = "Devuelto";
            reserva.FechaDevolucionReal = DateTime.Now;

            if (reserva.Material != null) reserva.Material.StockDisponible += 1;

            await _context.SaveChangesAsync();
            return (200, null, new { mensaje = "✅ Devolución exitosa. Stock actualizado." });
        }

        public async Task<(int StatusCode, string ErrorMessage, object Data)> RenovarPrestamoAsync(int id)
        {
            var reserva = await _context.Reservas.FindAsync(id);
            if (reserva == null) return (404, "Préstamo no encontrado.", null);
            if (reserva.Estatus != "Activo") return (400, "Solo se pueden renovar préstamos activos.", null);

            reserva.FechaFinEsperada = reserva.FechaFinEsperada.AddDays(7);
            await _context.SaveChangesAsync();

            return (200, null, new { mensaje = "✅ Préstamo renovado por 7 días más", nuevaFecha = reserva.FechaFinEsperada.ToString("dd/MM/yyyy") });
        }

        public async Task<IEnumerable<object>> GetHistorialPorAlumnoAsync(int usuarioId)
        {
            return await _context.Reservas
                .Include(r => r.Material)
                .Where(r => r.UsuarioId == usuarioId)
                .OrderByDescending(r => r.FechaInicio)
                .Select(r => new { Material = r.Material.Titulo, Categoria = r.Material.Categoria, FechaPrestamo = r.FechaInicio.ToString("dd/MM/yyyy"), Estado = r.Estatus })
                .ToListAsync();
        }

        public async Task<IEnumerable<object>> GetHistorialAsync(int pagina, int cantidad)
        {
            return await _context.Reservas
                .Include(r => r.Usuario)
                .Include(r => r.Material)
                .OrderByDescending(r => r.FechaInicio)
                .Skip((pagina - 1) * cantidad)
                .Take(cantidad)
                .Select(r => new { IdReserva = r.Id, Alumno = (r.Usuario.Nombre + " " + r.Usuario.Apellidos).Trim(), Matricula = r.Usuario.Matricula, Material = r.Material.Titulo, FechaInicioRaw = r.FechaInicio, FechaVencimiento = r.FechaFinEsperada, Estado = r.Estatus })
                .ToListAsync();
        }
    }
}