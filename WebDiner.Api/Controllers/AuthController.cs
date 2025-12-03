using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebDiner.Api.Data;
using WebDiner.Api.DTOs;
using WebDiner.Api.Models;
using WebDiner.Api.Services;
using System.Security.Claims;

namespace WebDiner.Api.Controllers;

[ApiController]
[Route("api/auth")]
[Tags("auth")]
public class AuthController : ControllerBase
{
    private readonly WebDinerDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IPasswordService _passwordService;

    public AuthController(
        WebDinerDbContext context,
        IJwtService jwtService,
        IPasswordService passwordService)
    {
        _context = context;
        _jwtService = jwtService;
        _passwordService = passwordService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register([FromBody] UserCreateDto dto)
    {
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.EmployeeId == dto.EmployeeId);
        
        if (existingUser != null)
        {
            return BadRequest(new { detail = "此工號已註冊" });
        }

        var user = new User
        {
            EmployeeId = dto.EmployeeId,
            Name = dto.Name,
            Extension = dto.Extension,
            Email = dto.Email,
            HashedPassword = _passwordService.HashPassword(dto.Password),
            DepartmentId = dto.DepartmentId,
            Role = dto.Role,
            Title = dto.Title,
            IsDepartmentHead = dto.IsDepartmentHead
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(MapToDto(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<TokenDto>> Login([FromForm] string username, [FromForm] string password)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.EmployeeId == username);

        if (user == null || !_passwordService.VerifyPassword(password, user.HashedPassword))
        {
            return Unauthorized(new { detail = "工號或密碼錯誤" });
        }

        var token = _jwtService.GenerateToken(user.EmployeeId, user.Role);

        return Ok(new TokenDto(token, "bearer"));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        var employeeId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (employeeId == null)
        {
            return Unauthorized(new { detail = "無法驗證身份憑證" });
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.EmployeeId == employeeId);

        if (user == null)
        {
            return Unauthorized(new { detail = "無法驗證身份憑證" });
        }

        return Ok(MapToDto(user));
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var employeeId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.EmployeeId == employeeId);

        if (user == null)
        {
            return Unauthorized();
        }

        if (!_passwordService.VerifyPassword(dto.OldPassword, user.HashedPassword))
        {
            return BadRequest(new { detail = "舊密碼錯誤" });
        }

        user.HashedPassword = _passwordService.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password updated successfully" });
    }

    private static UserDto MapToDto(User user) => new(
        user.Id,
        user.EmployeeId,
        user.Name,
        user.Extension,
        user.Email,
        user.IsActive,
        user.IsAdmin,
        user.Role,
        user.DepartmentId,
        user.Title,
        user.IsDepartmentHead
    );
}

