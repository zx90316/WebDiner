using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebDiner.Api.Data;
using WebDiner.Api.DTOs;
using WebDiner.Api.Models;
using WebDiner.Api.Services;
using System.Security.Claims;
using System.Text.Json;

namespace WebDiner.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Tags("admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly WebDinerDbContext _context;
    private readonly IPasswordService _passwordService;

    public AdminController(WebDinerDbContext context, IPasswordService passwordService)
    {
        _context = context;
        _passwordService = passwordService;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var employeeId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (employeeId == null) return null;
        return await _context.Users.FirstOrDefaultAsync(u => u.EmployeeId == employeeId);
    }

    private async Task<ActionResult?> RequireAdminAsync()
    {
        var user = await GetCurrentUserAsync();
        if (user == null || !user.IsAdmin)
        {
            return StatusCode(403, new { detail = "權限不足" });
        }
        return null;
    }

    // ===== Stats =====

    [HttpGet("stats")]
    public async Task<ActionResult<OrderStatsDto>> GetStats([FromQuery] DateOnly? date = null)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var orders = await _context.Orders
            .Include(o => o.MenuItem)
            .ThenInclude(m => m!.Vendor)
            .Where(o => o.OrderDate == targetDate)
            .ToListAsync();

        var vendorStats = new Dictionary<string, VendorStatsDto>();
        int totalPrice = 0;

        foreach (var order in orders)
        {
            if (order.VendorMenuItemId.HasValue && order.MenuItem != null)
            {
                var vendorName = order.MenuItem.Vendor?.Name ?? "Unknown Vendor";
                var price = order.MenuItem.Price;
                totalPrice += price;

                if (!vendorStats.ContainsKey(vendorName))
                {
                    vendorStats[vendorName] = new VendorStatsDto(vendorName, 0, 0, new List<ItemStatsDto>());
                }

                var current = vendorStats[vendorName];
                var items = current.Items.ToList();
                var existingItem = items.FirstOrDefault(i => i.Name == order.MenuItem.Name);

                if (existingItem != null)
                {
                    var idx = items.IndexOf(existingItem);
                    items[idx] = existingItem with { Count = existingItem.Count + 1, Subtotal = existingItem.Subtotal + price };
                }
                else
                {
                    items.Add(new ItemStatsDto(order.MenuItem.Name, order.MenuItem.Description, 1, price));
                }

                vendorStats[vendorName] = current with 
                { 
                    TotalOrders = current.TotalOrders + 1, 
                    TotalPrice = current.TotalPrice + price, 
                    Items = items 
                };
            }
        }

        var vendorsList = vendorStats.Values
            .Select(v => v with { Items = v.Items.OrderByDescending(i => i.Count).ToList() })
            .OrderByDescending(v => v.TotalPrice)
            .ToList();

        return Ok(new OrderStatsDto(targetDate, orders.Count, totalPrice, vendorsList));
    }

    // ===== Reminders =====

    [HttpGet("reminders/missing")]
    public async Task<ActionResult<List<MissingUserDto>>> GetMissingOrders([FromQuery] DateOnly? targetDate = null)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var date = targetDate ?? DateOnly.FromDateTime(DateTime.Today);
        var allUsers = await _context.Users.Where(u => u.IsActive).ToListAsync();
        var orderedUserIds = await _context.Orders
            .Where(o => o.OrderDate == date)
            .Select(o => o.UserId)
            .ToListAsync();

        var missing = allUsers
            .Where(u => !orderedUserIds.Contains(u.Id))
            .Select(u => new MissingUserDto(u.EmployeeId, u.Name, u.Email))
            .ToList();

        return Ok(missing);
    }

    [HttpPost("reminders/send")]
    public async Task<ActionResult> SendReminders([FromQuery] DateOnly? targetDate = null)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var missing = await GetMissingOrders(targetDate);
        var missingUsers = (missing.Result as OkObjectResult)?.Value as List<MissingUserDto>;
        var count = missingUsers?.Count ?? 0;

        // Mock sending email
        return Ok(new { message = $"Sent reminders to {count} users" });
    }

    // ===== User Management =====

    [HttpGet("users")]
    public async Task<ActionResult<List<UserDto>>> GetUsers(int skip = 0, int limit = 200)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var users = await _context.Users.Skip(skip).Take(limit).ToListAsync();
        return Ok(users.Select(MapUserToDto));
    }

    [HttpPost("users")]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] UserCreateDto dto)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || !currentUser.IsAdmin)
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var existing = await _context.Users.FirstOrDefaultAsync(u => u.EmployeeId == dto.EmployeeId);
        if (existing != null)
        {
            return BadRequest(new { detail = "此工號已註冊" });
        }

        if ((dto.Role == "admin" || dto.Role == "sysadmin") && currentUser.Role != "sysadmin")
        {
            return StatusCode(403, new { detail = "只有系統管理員可以建立管理員帳號" });
        }

        var user = new User
        {
            EmployeeId = dto.EmployeeId,
            Name = dto.Name,
            Extension = dto.Extension,
            Email = dto.Email,
            DepartmentId = dto.DepartmentId,
            HashedPassword = _passwordService.HashPassword(dto.Password),
            Role = dto.Role ?? "user",
            IsAdmin = dto.Role == "admin" || dto.Role == "sysadmin",
            Title = dto.Title,
            IsDepartmentHead = dto.IsDepartmentHead
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(MapUserToDto(user));
    }

    [HttpPut("users/{userId}")]
    public async Task<ActionResult<UserDto>> UpdateUser(int userId, [FromBody] UserUpdateDto dto)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || !currentUser.IsAdmin)
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { detail = "找不到使用者" });
        }

        if (currentUser.Role != "sysadmin" && (user.Role == "admin" || user.Role == "sysadmin"))
        {
            return StatusCode(403, new { detail = "管理員無法修改其他管理員或系統管理員" });
        }

        if (dto.Role != null && (dto.Role == "admin" || dto.Role == "sysadmin") && currentUser.Role != "sysadmin")
        {
            return StatusCode(403, new { detail = "只有系統管理員可以指派管理員角色" });
        }

        if (dto.Password != null && currentUser.Role != "sysadmin")
        {
            return StatusCode(403, new { detail = "只有系統管理員可以重設使用者密碼" });
        }

        if (dto.EmployeeId != null) user.EmployeeId = dto.EmployeeId;
        if (dto.Name != null) user.Name = dto.Name;
        if (dto.Extension != null) user.Extension = dto.Extension;
        if (dto.Email != null) user.Email = dto.Email;
        if (dto.DepartmentId.HasValue) user.DepartmentId = dto.DepartmentId;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;
        if (dto.IsAdmin.HasValue) user.IsAdmin = dto.IsAdmin.Value;
        if (dto.Role != null)
        {
            user.Role = dto.Role;
            user.IsAdmin = dto.Role == "admin" || dto.Role == "sysadmin";
        }
        if (dto.Title != null) user.Title = dto.Title;
        if (dto.IsDepartmentHead.HasValue) user.IsDepartmentHead = dto.IsDepartmentHead.Value;
        if (dto.Password != null) user.HashedPassword = _passwordService.HashPassword(dto.Password);

        await _context.SaveChangesAsync();

        return Ok(MapUserToDto(user));
    }

    [HttpDelete("users/{userId}")]
    public async Task<ActionResult> DeleteUser(int userId)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || !currentUser.IsAdmin)
        {
            return StatusCode(403, new { detail = "權限不足" });
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { detail = "找不到使用者" });
        }

        if (currentUser.Role != "sysadmin" && (user.Role == "admin" || user.Role == "sysadmin"))
        {
            return StatusCode(403, new { detail = "管理員無法刪除其他管理員或系統管理員" });
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User deleted" });
    }

    // ===== Division Management =====

    [HttpGet("divisions")]
    public async Task<ActionResult<List<DivisionDto>>> GetDivisions()
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var divisions = await _context.Divisions
            .Where(d => d.IsActive)
            .OrderBy(d => d.DisplayColumn)
            .ThenBy(d => d.DisplayOrder)
            .ToListAsync();

        return Ok(divisions.Select(d => new DivisionDto(d.Id, d.Name, d.IsActive, d.DisplayColumn, d.DisplayOrder)));
    }

    [HttpGet("divisions/{divisionId}")]
    public async Task<ActionResult<DivisionWithDepartmentsDto>> GetDivisionWithDepartments(int divisionId)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var division = await _context.Divisions.FindAsync(divisionId);
        if (division == null)
        {
            return NotFound(new { detail = "找不到處別" });
        }

        var departments = await _context.Departments
            .Where(d => d.DivisionId == divisionId && d.IsActive)
            .OrderBy(d => d.DisplayOrder)
            .ToListAsync();

        return Ok(new DivisionWithDepartmentsDto(
            division.Id, division.Name, division.IsActive, division.DisplayColumn, division.DisplayOrder,
            departments.Select(d => new DepartmentDto(d.Id, d.Name, d.IsActive, d.DivisionId, d.DisplayColumn, d.DisplayOrder)).ToList()
        ));
    }

    [HttpPost("divisions")]
    public async Task<ActionResult<DivisionDto>> CreateDivision([FromBody] DivisionCreateDto dto)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var existing = await _context.Divisions.FirstOrDefaultAsync(d => d.Name == dto.Name);
        if (existing != null)
        {
            if (existing.IsActive)
            {
                return BadRequest(new { detail = "處別已存在" });
            }
            existing.IsActive = true;
            existing.DisplayColumn = dto.DisplayColumn;
            existing.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            return Ok(new DivisionDto(existing.Id, existing.Name, existing.IsActive, existing.DisplayColumn, existing.DisplayOrder));
        }

        var division = new Division
        {
            Name = dto.Name,
            IsActive = dto.IsActive,
            DisplayColumn = dto.DisplayColumn,
            DisplayOrder = dto.DisplayOrder
        };

        _context.Divisions.Add(division);
        await _context.SaveChangesAsync();

        return Ok(new DivisionDto(division.Id, division.Name, division.IsActive, division.DisplayColumn, division.DisplayOrder));
    }

    [HttpPut("divisions/{divisionId}")]
    public async Task<ActionResult<DivisionDto>> UpdateDivision(int divisionId, [FromBody] DivisionUpdateDto dto)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var division = await _context.Divisions.FindAsync(divisionId);
        if (division == null)
        {
            return NotFound(new { detail = "找不到處別" });
        }

        if (dto.Name != null) division.Name = dto.Name;
        if (dto.IsActive.HasValue) division.IsActive = dto.IsActive.Value;
        if (dto.DisplayColumn.HasValue) division.DisplayColumn = dto.DisplayColumn.Value;
        if (dto.DisplayOrder.HasValue) division.DisplayOrder = dto.DisplayOrder.Value;

        await _context.SaveChangesAsync();

        return Ok(new DivisionDto(division.Id, division.Name, division.IsActive, division.DisplayColumn, division.DisplayOrder));
    }

    [HttpDelete("divisions/{divisionId}")]
    public async Task<ActionResult> DeleteDivision(int divisionId)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var division = await _context.Divisions.FindAsync(divisionId);
        if (division == null)
        {
            return NotFound(new { detail = "找不到處別" });
        }

        var deptCount = await _context.Departments.CountAsync(d => d.DivisionId == divisionId && d.IsActive);
        if (deptCount > 0)
        {
            return BadRequest(new { detail = $"無法刪除有 {deptCount} 個使用中部門的處別" });
        }

        division.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Division deleted" });
    }

    // ===== Department Management =====

    [HttpGet("departments")]
    public async Task<ActionResult<List<DepartmentDto>>> GetDepartments()
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var departments = await _context.Departments.Where(d => d.IsActive).ToListAsync();
        return Ok(departments.Select(d => new DepartmentDto(d.Id, d.Name, d.IsActive, d.DivisionId, d.DisplayColumn, d.DisplayOrder)));
    }

    [HttpGet("departments/by-division/{divisionId}")]
    public async Task<ActionResult<List<DepartmentDto>>> GetDepartmentsByDivision(int divisionId)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var departments = await _context.Departments
            .Where(d => d.DivisionId == divisionId && d.IsActive)
            .OrderBy(d => d.DisplayOrder)
            .ToListAsync();

        return Ok(departments.Select(d => new DepartmentDto(d.Id, d.Name, d.IsActive, d.DivisionId, d.DisplayColumn, d.DisplayOrder)));
    }

    [HttpPost("departments")]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment([FromBody] DepartmentCreateDto dto)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var existing = await _context.Departments.FirstOrDefaultAsync(d => d.Name == dto.Name);
        if (existing != null)
        {
            if (existing.IsActive)
            {
                return BadRequest(new { detail = "部門已存在" });
            }
            existing.IsActive = true;
            existing.DivisionId = dto.DivisionId;
            existing.DisplayColumn = dto.DisplayColumn;
            existing.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            return Ok(new DepartmentDto(existing.Id, existing.Name, existing.IsActive, existing.DivisionId, existing.DisplayColumn, existing.DisplayOrder));
        }

        var department = new Department
        {
            Name = dto.Name,
            IsActive = dto.IsActive,
            DivisionId = dto.DivisionId,
            DisplayColumn = dto.DisplayColumn,
            DisplayOrder = dto.DisplayOrder
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        return Ok(new DepartmentDto(department.Id, department.Name, department.IsActive, department.DivisionId, department.DisplayColumn, department.DisplayOrder));
    }

    [HttpPut("departments/{deptId}")]
    public async Task<ActionResult<DepartmentDto>> UpdateDepartment(int deptId, [FromBody] DepartmentUpdateDto dto)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var department = await _context.Departments.FindAsync(deptId);
        if (department == null)
        {
            return NotFound(new { detail = "找不到部門" });
        }

        if (dto.Name != null) department.Name = dto.Name;
        if (dto.IsActive.HasValue) department.IsActive = dto.IsActive.Value;
        if (dto.DivisionId.HasValue) department.DivisionId = dto.DivisionId;
        if (dto.DisplayColumn.HasValue) department.DisplayColumn = dto.DisplayColumn.Value;
        if (dto.DisplayOrder.HasValue) department.DisplayOrder = dto.DisplayOrder.Value;

        await _context.SaveChangesAsync();

        return Ok(new DepartmentDto(department.Id, department.Name, department.IsActive, department.DivisionId, department.DisplayColumn, department.DisplayOrder));
    }

    [HttpDelete("departments/{deptId}")]
    public async Task<ActionResult> DeleteDepartment(int deptId)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var department = await _context.Departments.FindAsync(deptId);
        if (department == null)
        {
            return NotFound(new { detail = "找不到部門" });
        }

        department.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Department deleted" });
    }

    // ===== Order Management =====

    [HttpGet("orders/daily_details")]
    public async Task<ActionResult<List<DailyOrderDetailDto>>> GetDailyOrderDetails([FromQuery] DateOnly? date = null)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var users = await _context.Users.Where(u => u.IsActive).OrderBy(u => u.EmployeeId).ToListAsync();
        var departments = await _context.Departments.ToDictionaryAsync(d => d.Id, d => d.Name);
        var orders = await _context.Orders
            .Include(o => o.MenuItem)
            .ThenInclude(m => m!.Vendor)
            .Where(o => o.OrderDate == targetDate)
            .ToListAsync();

        var userOrders = orders.ToDictionary(o => o.UserId);

        var result = users.Select(user =>
        {
            var order = userOrders.GetValueOrDefault(user.Id);
            var itemName = "未選";
            var vendorName = "";
            var vendorColor = "";
            int? vendorId = null;
            int? itemId = null;

            if (order?.MenuItem != null)
            {
                itemName = order.MenuItem.Name;
                vendorName = order.MenuItem.Vendor?.Name ?? "";
                vendorColor = order.MenuItem.Vendor?.Color ?? "";
                vendorId = order.MenuItem.Vendor?.Id;
                itemId = order.MenuItem.Id;
            }

            return new DailyOrderDetailDto(
                user.Id, user.EmployeeId, user.Name,
                user.DepartmentId.HasValue ? departments.GetValueOrDefault(user.DepartmentId.Value) : null,
                order?.Id, itemName, vendorName, vendorColor, vendorId, itemId
            );
        }).ToList();

        return Ok(result);
    }

    [HttpPut("orders/user_order")]
    public async Task<ActionResult> UpdateUserOrder([FromBody] UserOrderUpdateDto dto)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
        {
            return NotFound(new { detail = "找不到使用者" });
        }

        var existingOrder = await _context.Orders
            .FirstOrDefaultAsync(o => o.UserId == dto.UserId && o.OrderDate == dto.OrderDate);

        if (dto.IsCancel)
        {
            if (existingOrder != null)
            {
                _context.Orders.Remove(existingOrder);
                await _context.SaveChangesAsync();
            }
            return Ok(new { message = "Order cancelled" });
        }

        if (!dto.VendorId.HasValue || !dto.ItemId.HasValue)
        {
            return BadRequest(new { detail = "需要指定廠商和餐點品項" });
        }

        var menuItem = await _context.VendorMenuItems
            .FirstOrDefaultAsync(m => m.Id == dto.ItemId && m.VendorId == dto.VendorId);

        if (menuItem == null)
        {
            return NotFound(new { detail = "找不到餐點品項" });
        }

        if (existingOrder != null)
        {
            existingOrder.VendorId = dto.VendorId;
            existingOrder.VendorMenuItemId = dto.ItemId;
            existingOrder.Items = null;
        }
        else
        {
            var newOrder = new Order
            {
                UserId = dto.UserId,
                VendorId = dto.VendorId,
                VendorMenuItemId = dto.ItemId,
                OrderDate = dto.OrderDate,
                Status = "Confirmed"
            };
            _context.Orders.Add(newOrder);
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Order updated" });
    }

    // ===== Special Days =====

    [HttpGet("special_days")]
    public async Task<ActionResult<List<SpecialDayDto>>> GetSpecialDays()
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var days = await _context.SpecialDays.ToListAsync();
        return Ok(days.Select(d => new SpecialDayDto(d.Id, d.Date, d.IsHoliday, d.Description)));
    }

    [HttpPost("special_days")]
    public async Task<ActionResult<SpecialDayDto>> CreateSpecialDay([FromBody] SpecialDayCreateDto dto)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var existing = await _context.SpecialDays.FirstOrDefaultAsync(d => d.Date == dto.Date);
        if (existing != null)
        {
            existing.IsHoliday = dto.IsHoliday;
            existing.Description = dto.Description;
        }
        else
        {
            existing = new SpecialDay
            {
                Date = dto.Date,
                IsHoliday = dto.IsHoliday,
                Description = dto.Description
            };
            _context.SpecialDays.Add(existing);
        }

        await _context.SaveChangesAsync();

        return Ok(new SpecialDayDto(existing.Id, existing.Date, existing.IsHoliday, existing.Description));
    }

    [HttpDelete("special_days/{dateStr}")]
    public async Task<ActionResult> DeleteSpecialDay(string dateStr)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        if (!DateOnly.TryParse(dateStr, out var targetDate))
        {
            return BadRequest(new { detail = "日期格式錯誤，請使用 YYYY-MM-DD 格式" });
        }

        var day = await _context.SpecialDays.FirstOrDefaultAsync(d => d.Date == targetDate);
        if (day == null)
        {
            return NotFound(new { detail = "找不到特殊日期" });
        }

        _context.SpecialDays.Remove(day);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Special day deleted" });
    }

    // ===== Order Announcement =====

    [HttpGet("order_announcement")]
    public async Task<ActionResult<OrderAnnouncementDto>> GetOrderAnnouncement([FromQuery] DateOnly? date = null)
    {
        var adminCheck = await RequireAdminAsync();
        if (adminCheck != null) return adminCheck;

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var orders = await _context.Orders
            .Include(o => o.MenuItem)
            .ThenInclude(m => m!.Vendor)
            .Include(o => o.User)
            .Where(o => o.OrderDate == targetDate && o.VendorMenuItemId.HasValue)
            .ToListAsync();

        var itemOrders = new Dictionary<int, OrderAnnouncementItemDto>();

        foreach (var order in orders)
        {
            if (order.MenuItem == null || order.User == null) continue;

            var itemKey = order.VendorMenuItemId!.Value;

            if (!itemOrders.ContainsKey(itemKey))
            {
                itemOrders[itemKey] = new OrderAnnouncementItemDto(
                    order.MenuItem.VendorId,
                    order.MenuItem.Vendor?.Name ?? "未知廠商",
                    order.MenuItem.Vendor?.Color ?? "#6B7280",
                    order.MenuItem.Id,
                    order.MenuItem.Name,
                    order.MenuItem.Description ?? "",
                    new List<OrderPersonDto>()
                );
            }

            var current = itemOrders[itemKey];
            var ordersList = current.Orders.ToList();
            ordersList.Add(new OrderPersonDto(order.User.EmployeeId, order.User.Name));
            itemOrders[itemKey] = current with { Orders = ordersList };
        }

        var result = itemOrders.Values
            .Select(item => item with { Orders = item.Orders.OrderBy(o => o.EmployeeId).ToList() })
            .OrderBy(item => item.VendorName)
            .ThenBy(item => item.ItemName)
            .ToList();

        return Ok(new OrderAnnouncementDto(targetDate, result));
    }

    private static UserDto MapUserToDto(User user) => new(
        user.Id, user.EmployeeId, user.Name, user.Extension, user.Email,
        user.IsActive, user.IsAdmin, user.Role, user.DepartmentId,
        user.Title, user.IsDepartmentHead
    );
}

