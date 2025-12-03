using System.ComponentModel.DataAnnotations;

namespace WebDiner.Api.DTOs;

// ===== Order DTOs =====

public record OrderDto(
    int Id,
    int UserId,
    int? VendorId,
    int? VendorMenuItemId,
    DateOnly OrderDate,
    DateTime CreatedAt,
    string Status
);

public record OrderCreateDto(
    DateOnly OrderDate,
    int? VendorId = null,
    int? VendorMenuItemId = null,
    bool IsNoOrder = false
);

public record OrderBatchCreateDto(
    List<OrderCreateDto> Orders
);

public record OrderWithDetailsDto(
    int Id,
    int UserId,
    int? VendorId,
    int? VendorMenuItemId,
    DateOnly OrderDate,
    DateTime CreatedAt,
    string Status,
    string? VendorName,
    string? VendorColor,
    string? MenuItemName,
    int? MenuItemPrice,
    string? MenuItemDescription
);

public record UserOrderUpdateDto(
    int UserId,
    DateOnly OrderDate,
    int? VendorId = null,
    int? ItemId = null,
    bool IsCancel = false
);

// ===== SpecialDay DTOs =====

public record SpecialDayDto(
    int Id,
    DateOnly Date,
    bool IsHoliday,
    string? Description
);

public record SpecialDayCreateDto(
    DateOnly Date,
    bool IsHoliday,
    string? Description = null
);

// ===== Daily Order Details =====

public record DailyOrderDetailDto(
    int UserId,
    string EmployeeId,
    string Name,
    string? Department,
    int? OrderId,
    string ItemName,
    string VendorName,
    string VendorColor,
    int? VendorId,
    int? ItemId
);

// ===== Order Announcement =====

public record OrderAnnouncementDto(
    DateOnly Date,
    List<OrderAnnouncementItemDto> Items
);

public record OrderAnnouncementItemDto(
    int VendorId,
    string VendorName,
    string VendorColor,
    int ItemId,
    string ItemName,
    string ItemDescription,
    List<OrderPersonDto> Orders
);

public record OrderPersonDto(
    string EmployeeId,
    string Name
);

// ===== Stats =====

public record OrderStatsDto(
    DateOnly Date,
    int TotalOrders,
    int TotalPrice,
    List<VendorStatsDto> Vendors
);

public record VendorStatsDto(
    string Name,
    int TotalOrders,
    int TotalPrice,
    List<ItemStatsDto> Items
);

public record ItemStatsDto(
    string Name,
    string? Description,
    int Count,
    int Subtotal
);

// ===== Reminders =====

public record MissingUserDto(
    string EmployeeId,
    string Name,
    string? Email
);
