using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestorInventarioPrimaria.Migrations
{
    /// <inheritdoc />
    public partial class SesionUnica : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TokenSesion",
                table: "Usuarios",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TokenSesion",
                table: "Usuarios");
        }
    }
}
