using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebDiner.Api.Data;
using WebDiner.Api.DTOs;
using WebDiner.Api.Models;
using System.Security.Claims;

namespace WebDiner.Api.Controllers;

/// <summary>
/// 分機表 API Controller
/// 
/// 提供動態生成分機表的功能
/// - 處別依據 display_column 和 display_order 排列
/// - 部門依據 display_order 排列在其所屬處別下
/// - 部門內人員排序：主管優先，其次按工號由小到大
/// 
/// 結構：處 (Division) → 部 (Department) → 人員 (User)
/// </summary>
[ApiController]
[Route("api/extension-directory")]
[Tags("extension-directory")]
[Authorize]
public class ExtensionDirectoryController : ControllerBase
{
    private readonly WebDinerDbContext _context;

    public ExtensionDirectoryController(WebDinerDbContext context)
    {
        _context = context;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var employeeId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (employeeId == null) return null;
        return await _context.Users.FirstOrDefaultAsync(u => u.EmployeeId == employeeId);
    }

    private async Task<List<ExtensionDirectoryUserDto>> GetSortedUsersAsync(int departmentId)
    {
        var users = await _context.Users
            .Where(u => u.DepartmentId == departmentId && u.IsActive)
            .ToListAsync();

        return users
            .OrderBy(u => !u.IsDepartmentHead)
            .ThenBy(u => u.EmployeeId)
            .Select(u => new ExtensionDirectoryUserDto(
                u.EmployeeId, u.Name, u.Extension, u.Title, u.IsDepartmentHead
            ))
            .ToList();
    }

    [HttpGet]
    public async Task<ActionResult<ExtensionDirectoryDto>> GetExtensionDirectory()
    {
        var departments = await _context.Departments
            .Where(d => d.IsActive)
            .OrderBy(d => d.DisplayColumn)
            .ThenBy(d => d.DisplayOrder)
            .ToListAsync();

        var divisions = await _context.Divisions
            .Where(d => d.IsActive)
            .ToListAsync();
        var divisionMap = divisions.ToDictionary(d => d.Id);

        // 建立 4 個欄位的資料結構
        var columnsDict = new Dictionary<int, Dictionary<int, List<ExtensionDirectoryDepartmentDto>>>
        {
            { 0, new Dictionary<int, List<ExtensionDirectoryDepartmentDto>>() },
            { 1, new Dictionary<int, List<ExtensionDirectoryDepartmentDto>>() },
            { 2, new Dictionary<int, List<ExtensionDirectoryDepartmentDto>>() },
            { 3, new Dictionary<int, List<ExtensionDirectoryDepartmentDto>>() }
        };

        foreach (var dept in departments)
        {
            var colIndex = dept.DisplayColumn;
            if (colIndex < 0 || colIndex > 3) colIndex = 0;

            var divId = dept.DivisionId ?? 0;

            if (!columnsDict[colIndex].ContainsKey(divId))
            {
                columnsDict[colIndex][divId] = new List<ExtensionDirectoryDepartmentDto>();
            }

            var deptData = new ExtensionDirectoryDepartmentDto(
                dept.Id,
                dept.Name,
                divId == 0 ? null : divId,
                divId != 0 && divisionMap.ContainsKey(divId) ? divisionMap[divId].Name : null,
                dept.DisplayOrder,
                await GetSortedUsersAsync(dept.Id)
            );

            columnsDict[colIndex][divId].Add(deptData);
        }

        // 轉換為最終結構
        var finalColumns = new List<ExtensionDirectoryColumnDto>();

        for (int colIndex = 0; colIndex < 4; colIndex++)
        {
            var divIdsInCol = columnsDict[colIndex].Keys.ToList();

            // 排序處別
            divIdsInCol.Sort((a, b) =>
            {
                if (a == 0) return 1;
                if (b == 0) return -1;

                var divA = divisionMap.GetValueOrDefault(a);
                var divB = divisionMap.GetValueOrDefault(b);

                var orderA = divA?.DisplayOrder ?? 999;
                var orderB = divB?.DisplayOrder ?? 999;

                return orderA.CompareTo(orderB);
            });

            var columnDivisions = new List<ExtensionDirectoryDivisionDto>();

            foreach (var divId in divIdsInCol)
            {
                var deptList = columnsDict[colIndex][divId];
                var div = divId != 0 ? divisionMap.GetValueOrDefault(divId) : null;

                var divisionData = new ExtensionDirectoryDivisionDto(
                    divId,
                    div?.Name ?? "未分類",
                    colIndex,
                    div?.DisplayOrder ?? 999,
                    deptList
                );

                columnDivisions.Add(divisionData);
            }

            finalColumns.Add(new ExtensionDirectoryColumnDto(colIndex, columnDivisions));
        }

        return Ok(new ExtensionDirectoryDto(finalColumns, DateTime.Now));
    }

    [HttpGet("divisions")]
    public async Task<ActionResult<List<DivisionDto>>> GetDivisionsForDirectory()
    {
        var divisions = await _context.Divisions
            .Where(d => d.IsActive)
            .OrderBy(d => d.DisplayColumn)
            .ThenBy(d => d.DisplayOrder)
            .ToListAsync();

        return Ok(divisions.Select(d => new DivisionDto(d.Id, d.Name, d.IsActive, d.DisplayColumn, d.DisplayOrder)));
    }

    [HttpGet("departments")]
    public async Task<ActionResult<List<DepartmentDto>>> GetDepartmentsForDirectory()
    {
        var departments = await _context.Departments
            .Where(d => d.IsActive)
            .OrderBy(d => d.DivisionId)
            .ThenBy(d => d.DisplayOrder)
            .ToListAsync();

        return Ok(departments.Select(d => new DepartmentDto(d.Id, d.Name, d.IsActive, d.DivisionId, d.DisplayColumn, d.DisplayOrder)));
    }

    [HttpPut("divisions/{divisionId}/position")]
    public async Task<ActionResult> UpdateDivisionPosition(
        int divisionId,
        [FromQuery] int displayColumn,
        [FromQuery] int displayOrder)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || !currentUser.IsAdmin)
        {
            return StatusCode(403, new { detail = "只有管理員可以修改處別位置" });
        }

        if (displayColumn < 0 || displayColumn > 3)
        {
            return BadRequest(new { detail = "display_column 必須在 0-3 之間" });
        }

        var division = await _context.Divisions.FindAsync(divisionId);
        if (division == null)
        {
            return NotFound(new { detail = "處別不存在" });
        }

        division.DisplayColumn = displayColumn;
        division.DisplayOrder = displayOrder;
        await _context.SaveChangesAsync();

        return Ok(new { message = "處別位置已更新", division = division.Name });
    }

    [HttpPut("departments/{deptId}/position")]
    public async Task<ActionResult> UpdateDepartmentPosition(
        int deptId,
        [FromQuery] int displayOrder,
        [FromQuery] int? divisionId = null)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || !currentUser.IsAdmin)
        {
            return StatusCode(403, new { detail = "只有管理員可以修改部門位置" });
        }

        var dept = await _context.Departments.FindAsync(deptId);
        if (dept == null)
        {
            return NotFound(new { detail = "部門不存在" });
        }

        dept.DisplayOrder = displayOrder;
        if (divisionId.HasValue)
        {
            dept.DivisionId = divisionId.Value;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "部門位置已更新", department = dept.Name });
    }

    [HttpPut("divisions/batch-position")]
    public async Task<ActionResult> BatchUpdateDivisionPositions([FromBody] List<DivisionPositionDto> positions)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || !currentUser.IsAdmin)
        {
            return StatusCode(403, new { detail = "只有管理員可以修改處別位置" });
        }

        int updated = 0;
        foreach (var pos in positions)
        {
            var division = await _context.Divisions.FindAsync(pos.Id);
            if (division != null)
            {
                division.DisplayColumn = pos.DisplayColumn;
                division.DisplayOrder = pos.DisplayOrder;
                updated++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"已更新 {updated} 個處別的位置" });
    }

    [HttpPut("departments/batch-position")]
    public async Task<ActionResult> BatchUpdateDepartmentPositions([FromBody] List<DepartmentPositionDto> positions)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || !currentUser.IsAdmin)
        {
            return StatusCode(403, new { detail = "只有管理員可以修改部門位置" });
        }

        int updated = 0;
        foreach (var pos in positions)
        {
            var dept = await _context.Departments.FindAsync(pos.Id);
            if (dept != null)
            {
                if (pos.DivisionId.HasValue)
                {
                    dept.DivisionId = pos.DivisionId.Value;
                }
                dept.DisplayOrder = pos.DisplayOrder;
                updated++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"已更新 {updated} 個部門的位置" });
    }

    [HttpGet("users/{deptId}")]
    public async Task<ActionResult<List<ExtensionDirectoryUserDto>>> GetDepartmentUsers(int deptId)
    {
        return Ok(await GetSortedUsersAsync(deptId));
    }
}

