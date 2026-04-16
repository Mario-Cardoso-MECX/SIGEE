namespace GestorInventarioPrimaria.DTOs
{
    public class CambioPasswordDto 
    {
        public required string Username { get; set; }
        public required string PasswordActual { get; set; }
        public required string PasswordNueva { get; set; }
    }
}