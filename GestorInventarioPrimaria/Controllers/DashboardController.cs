using GestorInventarioPrimaria.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestorInventarioPrimaria.Controllers
{
    [Authorize] // <-- SIGUE TU CANDADO
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("resumen")]
        public async Task<IActionResult> ObtenerResumen()
        {
            var resumen = await _dashboardService.ObtenerResumenAsync();
            return Ok(resumen);
        }

        [HttpGet("top-libros")]
        public async Task<IActionResult> ObtenerTopLibros()
        {
            var topLibros = await _dashboardService.ObtenerTopLibrosAsync();
            return Ok(topLibros);
        }

        [HttpGet("prestamos-mes")]
        public async Task<IActionResult> ObtenerPrestamosPorMes()
        {
            var prestamosMes = await _dashboardService.ObtenerPrestamosPorMesAsync();
            return Ok(prestamosMes);
        }
    }
}