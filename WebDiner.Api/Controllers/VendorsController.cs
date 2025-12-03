using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebDiner.Api.Data;
using WebDiner.Api.DTOs;
using WebDiner.Api.Models;
using System.Security.Claims;

namespace WebDiner.Api.Controllers;

[ApiController]
[Route("api/vendors")]
[Tags("vendors")]
[Authorize]
public class VendorsController : ControllerBase
{
    private readonly WebDinerDbContext _context;

    public VendorsController(WebDinerDbContext context)
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
    public async Task<ActionResult<List<VendorDto>>> GetVendors()
    {
        var vendors = await _context.Vendors
            .Where(v => v.IsActive)
            .ToListAsync();

        return Ok(vendors.Select(MapToDto));
    }

    [HttpGet("{vendorId}")]
    public async Task<ActionResult<VendorDto>> GetVendor(int vendorId)
    {
        var vendor = await _context.Vendors.FindAsync(vendorId);
        if (vendor == null)
        {
            return NotFound(new { detail = "找不到廠商" });
        }

        return Ok(MapToDto(vendor));
    }

    [HttpPost]
    public async Task<ActionResult<VendorDto>> CreateVendor([FromBody] VendorCreateDto dto)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var existing = await _context.Vendors.FirstOrDefaultAsync(v => v.Name == dto.Name);
        if (existing != null)
        {
            return BadRequest(new { detail = "廠商已存在" });
        }

        var vendor = new Vendor
        {
            Name = dto.Name,
            Description = dto.Description,
            Color = dto.Color,
            IsActive = dto.IsActive
        };

        _context.Vendors.Add(vendor);
        await _context.SaveChangesAsync();

        return Ok(MapToDto(vendor));
    }

    [HttpPut("{vendorId}")]
    public async Task<ActionResult<VendorDto>> UpdateVendor(int vendorId, [FromBody] VendorCreateDto dto)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var vendor = await _context.Vendors.FindAsync(vendorId);
        if (vendor == null)
        {
            return NotFound(new { detail = "找不到廠商" });
        }

        vendor.Name = dto.Name;
        vendor.Description = dto.Description;
        vendor.Color = dto.Color;
        vendor.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return Ok(MapToDto(vendor));
    }

    [HttpDelete("{vendorId}")]
    public async Task<ActionResult> DeleteVendor(int vendorId)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var vendor = await _context.Vendors.FindAsync(vendorId);
        if (vendor == null)
        {
            return NotFound(new { detail = "找不到廠商" });
        }

        vendor.IsActive = false; // Soft delete
        await _context.SaveChangesAsync();

        return Ok(new { message = "Vendor deleted successfully" });
    }

    // ===== Vendor Menu Items =====

    [HttpGet("{vendorId}/menu")]
    public async Task<ActionResult<List<VendorMenuItemDto>>> GetVendorMenu(int vendorId)
    {
        var menuItems = await _context.VendorMenuItems
            .Where(m => m.VendorId == vendorId && m.IsActive)
            .ToListAsync();

        return Ok(menuItems.Select(m => new VendorMenuItemDto(
            m.Id, m.VendorId, m.Name, m.Description, m.Price, m.Weekday, m.IsActive
        )));
    }

    [HttpPost("{vendorId}/menu")]
    public async Task<ActionResult<VendorMenuItemDto>> CreateVendorMenuItem(int vendorId, [FromBody] VendorMenuItemCreateDto dto)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var vendor = await _context.Vendors.FindAsync(vendorId);
        if (vendor == null)
        {
            return NotFound(new { detail = "找不到廠商" });
        }

        if (dto.Weekday != null && (dto.Weekday < 0 || dto.Weekday > 6))
        {
            return BadRequest(new { detail = "星期必須在 0（星期一）至 6（星期日）之間，或設為 null 表示每天供應" });
        }

        var menuItem = new VendorMenuItem
        {
            VendorId = vendorId,
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            Weekday = dto.Weekday,
            IsActive = dto.IsActive
        };

        _context.VendorMenuItems.Add(menuItem);
        await _context.SaveChangesAsync();

        return Ok(new VendorMenuItemDto(
            menuItem.Id, menuItem.VendorId, menuItem.Name, menuItem.Description, 
            menuItem.Price, menuItem.Weekday, menuItem.IsActive
        ));
    }

    [HttpPut("{vendorId}/menu/{itemId}")]
    public async Task<ActionResult<VendorMenuItemDto>> UpdateVendorMenuItem(
        int vendorId, int itemId, [FromBody] VendorMenuItemCreateDto dto)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var item = await _context.VendorMenuItems
            .FirstOrDefaultAsync(m => m.Id == itemId && m.VendorId == vendorId);

        if (item == null)
        {
            return NotFound(new { detail = "找不到餐點品項" });
        }

        if (dto.Weekday != null && (dto.Weekday < 0 || dto.Weekday > 4))
        {
            return BadRequest(new { detail = "星期必須在 0（星期一）至 4（星期五）之間，或設為 null 表示每天供應" });
        }

        item.Name = dto.Name;
        item.Description = dto.Description;
        item.Price = dto.Price;
        item.Weekday = dto.Weekday;
        item.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new VendorMenuItemDto(
            item.Id, item.VendorId, item.Name, item.Description, 
            item.Price, item.Weekday, item.IsActive
        ));
    }

    [HttpDelete("{vendorId}/menu/{itemId}")]
    public async Task<ActionResult> DeleteVendorMenuItem(int vendorId, int itemId)
    {
        if (!await IsAdminAsync())
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var item = await _context.VendorMenuItems
            .FirstOrDefaultAsync(m => m.Id == itemId && m.VendorId == vendorId);

        if (item == null)
        {
            return NotFound(new { detail = "找不到餐點品項" });
        }

        item.IsActive = false; // Soft delete
        await _context.SaveChangesAsync();

        return Ok(new { message = "Menu item deleted successfully" });
    }

    // ===== Available Vendors for Date =====

    [HttpGet("available/{orderDate}")]
    public async Task<ActionResult<List<AvailableVendorDto>>> GetAvailableVendors(string orderDate)
    {
        if (!DateOnly.TryParse(orderDate, out var dateObj))
        {
            return BadRequest(new { detail = "日期格式錯誤，請使用 YYYY-MM-DD 格式" });
        }

        // Check if holiday
        var specialDay = await _context.SpecialDays.FirstOrDefaultAsync(s => s.Date == dateObj);
        var isHoliday = specialDay?.IsHoliday ?? 
            (dateObj.DayOfWeek == DayOfWeek.Saturday || dateObj.DayOfWeek == DayOfWeek.Sunday);

        if (isHoliday)
        {
            return Ok(new List<AvailableVendorDto>());
        }

        var weekday = (int)dateObj.DayOfWeek - 1;
        if (weekday < 0) weekday = 6;

        var vendors = await _context.Vendors
            .Where(v => v.IsActive)
            .Include(v => v.MenuItems.Where(m => m.IsActive && (m.Weekday == null || m.Weekday == weekday)))
            .ToListAsync();

        var result = vendors
            .Where(v => v.MenuItems.Any())
            .Select(v => new AvailableVendorDto(
                new VendorInfoDto(v.Id, v.Name, v.Description, v.Color),
                v.MenuItems.Select(m => new MenuItemInfoDto(m.Id, m.Name, m.Description, m.Price)).ToList()
            ))
            .ToList();

        return Ok(result);
    }

    private static VendorDto MapToDto(Vendor vendor) => new(
        vendor.Id, vendor.Name, vendor.Description, vendor.Color, vendor.IsActive, vendor.CreatedAt
    );
}

