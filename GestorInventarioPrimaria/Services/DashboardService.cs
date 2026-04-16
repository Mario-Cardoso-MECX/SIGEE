using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GestorInventarioPrimaria.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<object> ObtenerResumenAsync()
        {
            var totalAlumnos = await _context.Usuarios.CountAsync(u => u.Rol == "Alumno");
            var totalTitulos = await _context.Materiales.CountAsync();
            var totalEjemplares = await _context.Materiales.SumAsync(m => m.StockTotal);
            var prestamosActivos = await _context.Reservas.CountAsync(r => r.Estatus == "Activo");

            return new
            {
                Alumnos = totalAlumnos,
                Titulos = totalTitulos,
                Ejemplares = totalEjemplares,
                Prestamos = prestamosActivos
            };
        }

        public async Task<IEnumerable<object>> ObtenerTopLibrosAsync()
        {
            return await _context.Reservas
                .Include(r => r.Material) 
                .Where(r => r.Material != null && r.Material.Categoria == "Libro") 
                .GroupBy(r => r.Material.Titulo)
                .Select(g => new { Titulo = g.Key, Cantidad = g.Count() })
                .OrderByDescending(x => x.Cantidad)
                .Take(5)
                .ToListAsync();
        }

        public async Task<IEnumerable<object>> ObtenerPrestamosPorMesAsync()
        {
            int anioActual = System.DateTime.Now.Year;
            
            // Obtenemos los datos a memoria primero para evitar errores
            var reservas = await _context.Reservas
                .Where(r => r.Estatus == "Activo" || r.Estatus == "Devuelto") 
                .ToListAsync();

            return reservas
                .Where(r => r.FechaInicio.Year == anioActual) 
                .GroupBy(r => r.FechaInicio.Month)
                .Select(g => new { Mes = g.Key, Cantidad = g.Count() })
                .OrderBy(x => x.Mes)
                .ToList();
        }
    }
}