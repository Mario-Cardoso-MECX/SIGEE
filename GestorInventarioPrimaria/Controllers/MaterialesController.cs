using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Models;

namespace GestorInventarioPrimaria.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MaterialesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MaterialesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Material>>> GetMateriales()
        {
            return await _context.Materiales
                                 .OrderBy(m => m.Id)
                                 .ToListAsync();
        }

        // GET: api/materiales/buscar?termino=mate
        [HttpGet("buscar")]
        public async Task<ActionResult<IEnumerable<Material>>> BuscarMateriales([FromQuery] string termino)
        {
            if (string.IsNullOrWhiteSpace(termino)) return Ok(new List<Material>());

            return await _context.Materiales
                .Where(m => m.Titulo.Contains(termino) || m.Categoria.Contains(termino))
                .Take(10)
                .ToListAsync();
        }

        // POST: api/Materiales
        [HttpPost]
        public async Task<ActionResult<Material>> PostMaterial(Material material)
        {
            _context.Materiales.Add(material);
            await _context.SaveChangesAsync();
            return Ok(material);
        }

        // PUT: api/Materiales/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutMaterial(int id, Material material)
        {
            if (id != material.Id) return BadRequest();

            _context.Entry(material).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Materiales.Any(e => e.Id == id)) return NotFound();
                else throw;
            }
            return NoContent();
        }

        // DELETE: api/Materiales/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMaterial(int id)
        {
            var material = await _context.Materiales.FindAsync(id);
            if (material == null) return NotFound();

            // Validación de seguridad: No borrar si está prestado
            var tienePrestamosActivos = await _context.Reservas.AnyAsync(r => r.MaterialId == id && r.Estatus == "Activo");
            if (tienePrestamosActivos)
            {
                return BadRequest("No puedes eliminar este material porque hay alumnos que lo tienen prestado ahora mismo.");
            }

            _context.Materiales.Remove(material);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}