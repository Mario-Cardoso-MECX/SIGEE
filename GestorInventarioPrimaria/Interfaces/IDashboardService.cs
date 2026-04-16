namespace GestorInventarioPrimaria.Interfaces
{
    public interface IDashboardService
    {
        Task<object> ObtenerResumenAsync();
        Task<IEnumerable<object>> ObtenerTopLibrosAsync();
        Task<IEnumerable<object>> ObtenerPrestamosPorMesAsync();
    }
}