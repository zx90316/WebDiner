using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebDiner.Api.Data;
using WebDiner.Api.DTOs;
using WebDiner.Api.Models;
using System.Security.Claims;

namespace WebDiner.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Tags("orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly WebDinerDbContext _context;
    private static readonly TimeOnly CutoffTime = new(9, 0); // 9:00 AM
    private static readonly TimeZoneInfo TaiwanTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Taipei");

    public OrdersController(WebDinerDbContext context)
    {
        _context = context;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var employeeId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (employeeId == null) return null;
        return await _context.Users.FirstOrDefaultAsync(u => u.EmployeeId == employeeId);
    }

    private async Task<bool> IsHolidayOrWeekend(DateOnly orderDate)
    {
        var specialDay = await _context.SpecialDays
            .FirstOrDefaultAsync(s => s.Date == orderDate);

        if (specialDay != null)
        {
            return specialDay.IsHoliday;
        }

        var dayOfWeek = orderDate.DayOfWeek;
        return dayOfWeek == DayOfWeek.Saturday || dayOfWeek == DayOfWeek.Sunday;
    }

    private ActionResult? CheckCutoff(DateOnly orderDate)
    {
        var nowTaiwan = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TaiwanTimeZone);
        var todayTaiwan = DateOnly.FromDateTime(nowTaiwan);

        if (orderDate < todayTaiwan)
        {
            return BadRequest(new { detail = "無法為過去的日期訂餐" });
        }

        if (orderDate == todayTaiwan)
        {
            var currentTime = TimeOnly.FromDateTime(nowTaiwan);
            if (currentTime > CutoffTime)
            {
                return BadRequest(new { detail = "今日訂餐截止時間（早上 9:00）已過" });
            }
        }

        return null;
    }

    [HttpGet("special_days")]
    public async Task<ActionResult<List<SpecialDayDto>>> GetSpecialDays()
    {
        var days = await _context.SpecialDays.ToListAsync();
        return Ok(days.Select(d => new SpecialDayDto(d.Id, d.Date, d.IsHoliday, d.Description)));
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] OrderCreateDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        // 1. Check Holiday/Weekend
        if (await IsHolidayOrWeekend(dto.OrderDate))
        {
            return BadRequest(new { detail = "週末或假日無法訂餐" });
        }

        // 2. Check Cut-off time
        var cutoffResult = CheckCutoff(dto.OrderDate);
        if (cutoffResult != null) return cutoffResult;

        // 3. Verify vendor and menu item
        if (!dto.IsNoOrder)
        {
            if (dto.VendorId == null)
            {
                return BadRequest(new { detail = "一般訂單需要指定廠商" });
            }

            var vendor = await _context.Vendors
                .FirstOrDefaultAsync(v => v.Id == dto.VendorId && v.IsActive);

            if (vendor == null)
            {
                return NotFound(new { detail = "找不到廠商或廠商已停用" });
            }

            if (dto.VendorMenuItemId == null)
            {
                return BadRequest(new { detail = "一般訂單需要指定餐點品項" });
            }

            var menuItem = await _context.VendorMenuItems
                .FirstOrDefaultAsync(m => m.Id == dto.VendorMenuItemId && 
                                         m.VendorId == dto.VendorId && 
                                         m.IsActive);

            if (menuItem == null)
            {
                return NotFound(new { detail = "找不到餐點品項或品項已停用" });
            }

            // Check weekday availability
            var weekday = (int)dto.OrderDate.DayOfWeek - 1; // Convert to 0=Mon ... 4=Fri
            if (weekday < 0) weekday = 6; // Sunday becomes 6
            
            if (menuItem.Weekday != null && menuItem.Weekday != weekday)
            {
                var dayNames = new[] { "星期一", "星期二", "星期三", "星期四", "星期五" };
                var dayName = weekday >= 0 && weekday < 5 ? dayNames[weekday] : "週末";
                return BadRequest(new { detail = $"此餐點品項在{dayName}不供應" });
            }
        }

        // 4. Check existing order
        var existingOrder = await _context.Orders
            .FirstOrDefaultAsync(o => o.UserId == user.Id && o.OrderDate == dto.OrderDate);

        if (existingOrder != null)
        {
            return BadRequest(new { detail = "您在此日期已有訂單" });
        }

        // 5. Create order
        var order = new Order
        {
            UserId = user.Id,
            VendorId = dto.IsNoOrder ? null : dto.VendorId,
            VendorMenuItemId = dto.IsNoOrder ? null : dto.VendorMenuItemId,
            OrderDate = dto.OrderDate,
            Status = dto.IsNoOrder ? "NoOrder" : "Pending"
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return Ok(MapToDto(order));
    }

    [HttpPost("batch")]
    public async Task<ActionResult<List<OrderDto>>> CreateBatchOrders([FromBody] OrderBatchCreateDto batch)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        if (batch.Orders == null || !batch.Orders.Any())
        {
            return Ok(new List<OrderDto>());
        }

        var dates = batch.Orders.Select(o => o.OrderDate).ToHashSet();
        var existingOrdersList = await _context.Orders
            .Where(o => o.UserId == user.Id && dates.Contains(o.OrderDate))
            .Select(o => o.OrderDate)
            .ToListAsync();
        var existingOrders = existingOrdersList.ToHashSet();

        var vendorIds = batch.Orders.Where(o => o.VendorId.HasValue).Select(o => o.VendorId!.Value).Distinct();
        var vendors = await _context.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id);

        var menuItemIds = batch.Orders.Where(o => o.VendorMenuItemId.HasValue).Select(o => o.VendorMenuItemId!.Value).Distinct();
        var menuItems = await _context.VendorMenuItems.Where(m => menuItemIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id);

        var createdOrders = new List<Order>();

        foreach (var orderData in batch.Orders)
        {
            if (existingOrders.Contains(orderData.OrderDate)) continue;
            if (await IsHolidayOrWeekend(orderData.OrderDate)) continue;
            if (CheckCutoff(orderData.OrderDate) != null) continue;

            if (!orderData.IsNoOrder)
            {
                if (!orderData.VendorId.HasValue || !orderData.VendorMenuItemId.HasValue) continue;
                if (!vendors.TryGetValue(orderData.VendorId.Value, out var vendor) || !vendor.IsActive) continue;
                if (!menuItems.TryGetValue(orderData.VendorMenuItemId.Value, out var menuItem) || !menuItem.IsActive) continue;
                if (menuItem.VendorId != orderData.VendorId) continue;

                var weekday = (int)orderData.OrderDate.DayOfWeek - 1;
                if (weekday < 0) weekday = 6;
                if (menuItem.Weekday != null && menuItem.Weekday != weekday) continue;
            }

            var order = new Order
            {
                UserId = user.Id,
                VendorId = orderData.IsNoOrder ? null : orderData.VendorId,
                VendorMenuItemId = orderData.IsNoOrder ? null : orderData.VendorMenuItemId,
                OrderDate = orderData.OrderDate,
                Status = orderData.IsNoOrder ? "NoOrder" : "Pending"
            };

            _context.Orders.Add(order);
            createdOrders.Add(order);
        }

        if (createdOrders.Any())
        {
            await _context.SaveChangesAsync();
        }

        return Ok(createdOrders.Select(MapToDto).ToList());
    }

    [HttpGet]
    public async Task<ActionResult<List<OrderWithDetailsDto>>> GetOrders()
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var orders = await _context.Orders
            .Include(o => o.Vendor)
            .Include(o => o.MenuItem)
            .Where(o => o.UserId == user.Id)
            .ToListAsync();

        var result = orders.Select(order => new OrderWithDetailsDto(
            order.Id,
            order.UserId,
            order.VendorId,
            order.VendorMenuItemId,
            order.OrderDate,
            order.CreatedAt,
            order.Status,
            order.Vendor?.Name ?? (order.Status == "NoOrder" ? "不訂餐" : null),
            order.Vendor?.Color,
            order.MenuItem?.Name ?? (order.Status == "NoOrder" ? "不訂餐" : null),
            order.MenuItem?.Price,
            order.MenuItem?.Description
        )).ToList();

        return Ok(result);
    }

    [HttpDelete("{orderId}")]
    public async Task<ActionResult> CancelOrder(int orderId)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == user.Id);

        if (order == null)
        {
            return NotFound(new { detail = "找不到訂單" });
        }

        var cutoffResult = CheckCutoff(order.OrderDate);
        if (cutoffResult != null) return cutoffResult;

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Order cancelled" });
    }

    private static OrderDto MapToDto(Order order) => new(
        order.Id,
        order.UserId,
        order.VendorId,
        order.VendorMenuItemId,
        order.OrderDate,
        order.CreatedAt,
        order.Status
    );
}

