using GestorInventarioPrimaria.Data;
using Microsoft.EntityFrameworkCore;
using System.IO; // <-- NECESARIO PARA DETECTAR LA CARPETA

var builder = WebApplication.CreateBuilder(args);

// Agregar servicios básicos
builder.Services.AddControllers();

// --- LÓGICA TODOTERRENO PARA LA BASE DE DATOS ---
// Por defecto lee la cadena normal (SmarterASP en prod, o LocalDB en dev)
string cadenaConexion = builder.Configuration.GetConnectionString("CadenaSQL") ?? "";

// TRUCO MAESTRO: Si detecta que está en la carpeta de la escuela (C:\SIGE), cambia a SQL Express automáticamente
if (Directory.Exists(@"C:\SIGE") && builder.Environment.EnvironmentName != "Development")
{
    var cadenaIIS = builder.Configuration.GetConnectionString("CadenaSQL_IIS");
    if (!string.IsNullOrEmpty(cadenaIIS))
    {
        cadenaConexion = cadenaIIS;
    }
}

// CONEXIÓN A BASE DE DATOS 
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(cadenaConexion));
// ------------------------------------------------

builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirTodo", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()   
              .AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 5. MIDDLEWARES
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// --- CONFIGURACIÓN PARA ACCESO A wwwroot EN IIS ---
app.UseDefaultFiles(); // <-- AGREGA ESTO: Permite cargar el login.html sin escribir rutas raras
app.UseStaticFiles();  // <-- ESTE YA LO TENÍAS: Es el que da acceso físico a los archivos de wwwroot/front
// --------------------------------------------------

app.UseCors("PermitirTodo");

app.UseAuthorization();

app.MapControllers();

app.Run();