using GestorInventarioPrimaria.Models;

namespace GestorInventarioPrimaria.Interfaces
{
    public interface IMaterialService
    {
        Task<IEnumerable<Material>> GetMaterialesAsync();
        Task<IEnumerable<Material>> BuscarMaterialesAsync(string termino);
        Task<Material> CrearMaterialAsync(Material material);
        Task<(int StatusCode, string ErrorMessage)> ActualizarMaterialAsync(int id, Material material);
        Task<(int StatusCode, string ErrorMessage)> EliminarMaterialAsync(int id);
    }
}