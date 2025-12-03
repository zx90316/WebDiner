using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebDiner.Api.Data;
using WebDiner.Api.DTOs;
using WebDiner.Api.Models;
using System.Security.Claims;

namespace WebDiner.Api.Controllers;

[ApiController]
[Route("api/menu")]
[Tags("menu")]
public class MenuController : ControllerBase
{
    private readonly WebDinerDbContext _context;

    public MenuController(WebDinerDbContext context)
    {
        _context = context;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var employeeId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (employeeId == null) return null;
        return await _context.Users.FirstOrDefaultAsync(u => u.EmployeeId == employeeId);
    }

    private async Task<bool> IsAdminAsync()
    {
        var user = await GetCurrentUserAsync();
        return user?.IsAdmin ?? false;
    }

    [HttpGet]
    public async Task<ActionResult<List<MenuItemDto>>> GetMenuItems(int skip = 0, int limit = 100)
    {
        var items = await _context.MenuItems
            .Where(m => m.IsActive)
            .Skip(skip)
            .Take(limit)
            .ToListAsync();

        return Ok(items.Select(m => new MenuItemDto(
            m.Id, m.Name, m.Description, m.Price, m.Category, m.IsActive
        )));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<MenuItemDto>> CreateMenuItem([FromBody] MenuItemCreateDto dto)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var item = new MenuItem
        {
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            Category = dto.Category,
            IsActive = dto.IsActive
        };

        _context.MenuItems.Add(item);
        await _context.SaveChangesAsync();

        return Ok(new MenuItemDto(item.Id, item.Name, item.Description, item.Price, item.Category, item.IsActive));
    }

    [HttpPut("{itemId}")]
    [Authorize]
    public async Task<ActionResult<MenuItemDto>> UpdateMenuItem(int itemId, [FromBody] MenuItemCreateDto dto)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var item = await _context.MenuItems.FindAsync(itemId);
        if (item == null)
        {
            return NotFound(new { detail = "找不到品項" });
        }

        item.Name = dto.Name;
        item.Description = dto.Description;
        item.Price = dto.Price;
        item.Category = dto.Category;
        item.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new MenuItemDto(item.Id, item.Name, item.Description, item.Price, item.Category, item.IsActive));
    }

    [HttpDelete("{itemId}")]
    [Authorize]
    public async Task<ActionResult> DeleteMenuItem(int itemId)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var item = await _context.MenuItems.FindAsync(itemId);
        if (item == null)
        {
            return NotFound(new { detail = "找不到品項" });
        }

        item.IsActive = false; // Soft delete
        await _context.SaveChangesAsync();

        return Ok(new { message = "Item deleted" });
    }
}

