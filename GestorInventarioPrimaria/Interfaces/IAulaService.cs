using GestorInventarioPrimaria.DTOs;

namespace GestorInventarioPrimaria.Interfaces
{
    public interface IAulaService
    {
        Task<IEnumerable<object>> GetReservasAsync();
        Task<(int StatusCode, object Data)> SolicitarReservaAsync(SolicitudAulaDto dto);
        Task<(int StatusCode, object Data)> AprobarReservaAsync(int id);
        Task<(int StatusCode, object Data)> RechazarReservaAsync(int id, string motivo);
        Task<(int StatusCode, object Data)> CancelarReservaAsync(int id);
    }
}