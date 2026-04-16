using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Interfaces;
using GestorInventarioPrimaria.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace GestorInventarioPrimaria.Services
{
    public class MaterialService : IMaterialService
    {
        private readonly AppDbContext _context;

        public MaterialService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Material>> GetMaterialesAsync()
        {
            return await _context.Materiales.OrderBy(m => m.Id).ToListAsync();
        }

        public async Task<IEnumerable<Material>> BuscarMaterialesAsync(string termino)
        {
            if (string.IsNullOrWhiteSpace(termino) || termino.Length < 2) 
                return new List<Material>();

            var terminoLimpio = RemoveDiacritics(termino.Trim().ToLower());
            var materiales = await _context.Materiales.ToListAsync();

            return materiales
                .Where(m => 
                    (m.Titulo != null && RemoveDiacritics(m.Titulo.ToLower()).Contains(terminoLimpio)) || 
                    (m.Categoria != null && RemoveDiacritics(m.Categoria.ToLower()).Contains(terminoLimpio))
                )
                .Take(10)
                .ToList();
        }

        public async Task<Material> CrearMaterialAsync(Material material)
        {
            _context.Materiales.Add(material);
            await _context.SaveChangesAsync();
            return material;
        }

        public async Task<(int StatusCode, string ErrorMessage)> ActualizarMaterialAsync(int id, Material material)
        {
            if (id != material.Id) return (400, "IDs no coinciden");

            _context.Entry(material).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Materiales.Any(e => e.Id == id)) return (404, "Material no encontrado");
                else throw;
            }
            return (204, null); // 204 NoContent
        }

        public async Task<(int StatusCode, string ErrorMessage)> EliminarMaterialAsync(int id)
        {
            var material = await _context.Materiales.FindAsync(id);
            if (material == null) return (404, "Material no encontrado");

            var tienePrestamosActivos = await _context.Reservas.AnyAsync(r => r.MaterialId == id && r.Estatus == "Activo");
            if (tienePrestamosActivos)
            {
                return (400, "No puedes eliminar este material porque hay alumnos que lo tienen prestado ahora mismo.");
            }

            _context.Materiales.Remove(material);
            await _context.SaveChangesAsync();
            return (200, null);
        }

        // El método privado ahora vive donde debe vivir (en la capa de lógica)
        private static string RemoveDiacritics(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return text;
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder(capacity: normalizedString.Length);
            for (int i = 0; i < normalizedString.Length; i++)
            {
                char c = normalizedString[i];
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }
            return stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}