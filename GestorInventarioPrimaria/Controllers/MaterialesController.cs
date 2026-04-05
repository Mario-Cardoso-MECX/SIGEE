using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Models;
using Microsoft.AspNetCore.Authorization; // <-- NUEVO: SEGURIDAD

namespace GestorInventarioPrimaria.Controllers
{
    [Authorize] // <-- NUEVO: CANDADO
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
            if (string.IsNullOrWhiteSpace(termino) || termino.Length < 2) 
                return Ok(new List<Material>());

            // 1. Limpiamos lo que el usuario escribió
            var terminoLimpio = RemoveDiacritics(termino.Trim().ToLower());

            // 2. Traemos los materiales a memoria para compararlos correctamente
            var materiales = await _context.Materiales.ToListAsync();

            // 3. Comparamos títulos y categorías quitando acentos también de la base
            var resultados = materiales
                .Where(m => 
                    (m.Titulo != null && RemoveDiacritics(m.Titulo.ToLower()).Contains(terminoLimpio)) || 
                    (m.Categoria != null && RemoveDiacritics(m.Categoria.ToLower()).Contains(terminoLimpio))
                )
                .Take(10)
                .ToList();

            return Ok(resultados);
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

        // --- Método privado para quitar acentos en C# ---
        private static string RemoveDiacritics(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            var normalizedString = text.Normalize(System.Text.NormalizationForm.FormD);
            var stringBuilder = new System.Text.StringBuilder(capacity: normalizedString.Length);

            for (int i = 0; i < normalizedString.Length; i++)
            {
                char c = normalizedString[i];
                var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }

            return stringBuilder.ToString().Normalize(System.Text.NormalizationForm.FormC);
        }
    }
}