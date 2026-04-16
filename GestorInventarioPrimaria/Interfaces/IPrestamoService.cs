using GestorInventarioPrimaria.DTOs;

namespace GestorInventarioPrimaria.Interfaces
{
    public interface IPrestamoService
    {
        Task<(int StatusCode, string ErrorMessage, object Data)> RegistrarPrestamoAsync(PrestamoDto datos);
        Task<(int StatusCode, string ErrorMessage, IEnumerable<object> Data)> GetPendientesAsync(string matricula);
        Task<(int StatusCode, string ErrorMessage, object Data)> DevolverMaterialAsync(int idReserva);
        Task<(int StatusCode, string ErrorMessage, object Data)> RenovarPrestamoAsync(int id);
        Task<IEnumerable<object>> GetHistorialPorAlumnoAsync(int usuarioId);
        Task<IEnumerable<object>> GetHistorialAsync(int pagina, int cantidad);
    }
}