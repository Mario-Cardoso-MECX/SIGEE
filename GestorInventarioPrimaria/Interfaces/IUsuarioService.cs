using GestorInventarioPrimaria.DTOs;
using GestorInventarioPrimaria.Models;
using Microsoft.AspNetCore.Http; // Para IFormFile

namespace GestorInventarioPrimaria.Interfaces
{
    public interface IUsuarioService
    {
        Task<IEnumerable<Usuario>> GetAlumnosAsync();
        Task<IEnumerable<Usuario>> BuscarUsuariosAsync(string termino);
        Task<(int StatusCode, object Data)> CrearAlumnoAsync(Usuario nuevoAlumno);
        Task<(int StatusCode, object Data)> SubirFotoAlumnoAsync(string matricula, IFormFile foto, string rootPath);
        Task<(int StatusCode, object Data)> EditarAlumnoAsync(int id, Usuario datosActualizados);
        Task<(int StatusCode, object Data)> DeleteUsuarioAsync(int id);
        
        Task<IEnumerable<Usuario>> GetPersonalAdministrativoAsync();
        Task<(int StatusCode, object Data)> CrearPersonalAsync(Usuario nuevoPersonal);
        Task<(int StatusCode, object Data)> GetUsuarioAsync(int id);
        Task<(int StatusCode, object Data)> EditarPersonalAsync(int id, Usuario datosActualizados);
        Task<(int StatusCode, object Data)> EliminarPersonalAsync(int id);
        
        Task<(int StatusCode, object Data)> PromocionMasivaAsync();
        Task<(int StatusCode, object Data)> EliminarEgresadosMasivoAsync();
        Task<(int StatusCode, object Data)> SincronizarFotosAsync(string rootPath);
        Task<(int StatusCode, object Data)> SubirFotoPersonalAsync(string username, IFormFile foto, string rootPath);
        Task<(int StatusCode, object Data)> CambiarPasswordAsync(CambioPasswordDto datos);
        Task<(int StatusCode, string MimeType, string RutaCompleta, string ErrorMessage)> ObtenerFotoProtegidaAsync(string tipo, string nombreArchivo, string token, string rootPath);
    }
}