using GestorInventarioPrimaria.DTOs;

namespace GestorInventarioPrimaria.Interfaces
{
    public interface IAuthService
    {
        Task<(int StatusCode, object Data)> LoginAsync(LoginRequest request);
        Task<(int StatusCode, object Data)> VerificarSesionAsync(string username, string token);
    }
}