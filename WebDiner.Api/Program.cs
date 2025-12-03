using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json;
using WebDiner.Api.Data;
using WebDiner.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // 使用 snake_case 命名策略（與 Python FastAPI 相容）
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    });

// Database - SQL Server
builder.Services.AddDbContext<WebDinerDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Authentication
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ?? "SuperSecretKeyForWebDinerApplication2024!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "WebDiner.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "WebDiner.Frontend";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8201",
            "http://127.0.0.1:8201"
        )
        .SetIsOriginAllowedToAllowWildcardSubdomains()
        .SetIsOriginAllowed(origin =>
        {
            var uri = new Uri(origin);
            var host = uri.Host;
            
            // 允許 localhost 和 127.0.0.1
            if (host == "localhost" || host == "127.0.0.1") return true;
            
            // 允許內網 IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            if (System.Net.IPAddress.TryParse(host, out var ip))
            {
                var bytes = ip.GetAddressBytes();
                if (bytes.Length == 4)
                {
                    // 10.x.x.x
                    if (bytes[0] == 10) return true;
                    // 192.168.x.x
                    if (bytes[0] == 192 && bytes[1] == 168) return true;
                    // 172.16-31.x.x
                    if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                }
            }
            
            return false;
        })
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "VSCC-WebDiner API", 
        Version = "v1",
        Description = "VSCC 訂餐系統 API"
    });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "VSCC-WebDiner API v1");
    });
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Root endpoint
app.MapGet("/", () => new { message = "Welcome to VSCC-WebDiner API" });

// Ensure database is created and seed data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var dbContext = services.GetRequiredService<WebDinerDbContext>();
    var passwordService = services.GetRequiredService<IPasswordService>();
    
    dbContext.Database.EnsureCreated();
    
    // Seed initial data
    WebDiner.Api.Data.DbInitializer.Initialize(dbContext, passwordService);
}

app.Run();

