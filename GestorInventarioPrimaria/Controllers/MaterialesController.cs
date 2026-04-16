using GestorInventarioPrimaria.Interfaces;
using GestorInventarioPrimaria.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestorInventarioPrimaria.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MaterialesController : ControllerBase
    {
        private readonly IMaterialService _materialService;

        public MaterialesController(IMaterialService materialService)
        {
            _materialService = materialService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Material>>> GetMateriales()
        {
            var materiales = await _materialService.GetMaterialesAsync();
            return Ok(materiales);
        }

        [HttpGet("buscar")]
        public async Task<ActionResult<IEnumerable<Material>>> BuscarMateriales([FromQuery] string termino)
        {
            var resultados = await _materialService.BuscarMaterialesAsync(termino);
            return Ok(resultados);
        }

        [HttpPost]
        public async Task<ActionResult<Material>> PostMaterial(Material material)
        {
            var nuevoMaterial = await _materialService.CrearMaterialAsync(material);
            return Ok(nuevoMaterial);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutMaterial(int id, Material material)
        {
            var (statusCode, errorMessage) = await _materialService.ActualizarMaterialAsync(id, material);
            if (statusCode == 400) return BadRequest();
            if (statusCode == 404) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMaterial(int id)
        {
            var (statusCode, errorMessage) = await _materialService.EliminarMaterialAsync(id);
            if (statusCode == 404) return NotFound();
            if (statusCode == 400) return BadRequest(errorMessage);
            return Ok();
        }
    }
}