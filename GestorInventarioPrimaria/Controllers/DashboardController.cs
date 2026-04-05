using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestorInventarioPrimaria.Data;
using System.Linq; 
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization; // <-- NUEVO: SEGURIDAD

namespace GestorInventarioPrimaria.Controllers
{
    [Authorize] // <-- NUEVO: CANDADO
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("resumen")]
        public async Task<IActionResult> ObtenerResumen()
        {
            var totalAlumnos = await _context.Usuarios.CountAsync(u => u.Rol == "Alumno");
            var totalTitulos = await _context.Materiales.CountAsync();
            var totalEjemplares = await _context.Materiales.SumAsync(m => m.StockTotal);

            // CONTAR PRÉSTAMOS ACTIVOS REALES
            var prestamosActivos = await _context.Reservas.CountAsync(r => r.Estatus == "Activo");

            return Ok(new
            {
                Alumnos = totalAlumnos,
                Titulos = totalTitulos,
                Ejemplares = totalEjemplares,
                Prestamos = prestamosActivos
            });
        }

        // Endpoint para los 5 libros más leídos
        [HttpGet("top-libros")]
        public async Task<IActionResult> ObtenerTopLibros()
        {
            var topLibros = await _context.Reservas
                .Include(r => r.Material) 
                .Where(r => r.Material != null && r.Material.Categoria != "Salón") 
                .GroupBy(r => r.Material.Titulo)
                .Select(g => new { Titulo = g.Key, Cantidad = g.Count() })
                .OrderByDescending(x => x.Cantidad)
                .Take(5)
                .ToListAsync();

            return Ok(topLibros);
        }

        // Endpoint para la gráfica de barras de meses
        [HttpGet("prestamos-mes")]
        public async Task<IActionResult> ObtenerPrestamosPorMes()
        {
            int anioActual = System.DateTime.Now.Year;
            
            // Obtenemos los datos a memoria primero para evitar errores
            // Usamos tus estatus reales: "Activo" o "Finalizado"
            var reservas = await _context.Reservas
                .Where(r => r.Estatus == "Activo" || r.Estatus == "Finalizado") 
                .ToListAsync();

            var prestamos = reservas
                // USAMOS TU VARIABLE REAL: FechaInicio
                .Where(r => r.FechaInicio.Year == anioActual) 
                .GroupBy(r => r.FechaInicio.Month)
                .Select(g => new { Mes = g.Key, Cantidad = g.Count() })
                .OrderBy(x => x.Mes)
                .ToList();
                
            return Ok(prestamos);
        }
    }
}