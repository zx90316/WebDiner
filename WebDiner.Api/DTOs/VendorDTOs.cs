using System.ComponentModel.DataAnnotations;

namespace WebDiner.Api.DTOs;

// ===== Vendor DTOs =====

public record VendorDto(
    int Id,
    string Name,
    string? Description,
    string Color,
    bool IsActive,
    DateTime CreatedAt
);

public record VendorCreateDto(
    string Name,
    string? Description = null,
    string Color = "#3B82F6",
    bool IsActive = true
);

// ===== VendorMenuItem DTOs =====

public record VendorMenuItemDto(
    int Id,
    int VendorId,
    string Name,
    string? Description,
    int Price,
    int? Weekday,
    bool IsActive
);

public record VendorMenuItemCreateDto(
    string Name,
    string? Description = null,
    int Price = 0,
    int? Weekday = null,
    bool IsActive = true
);

// ===== Legacy MenuItem DTOs =====

public record MenuItemDto(
    int Id,
    string Name,
    string? Description,
    int Price,
    string? Category,
    bool IsActive
);

public record MenuItemCreateDto(
    string Name,
    string? Description = null,
    int Price = 0,
    string Category = "",
    bool IsActive = true
);

// ===== Available Vendor for Date =====

public record AvailableVendorDto(
    VendorInfoDto Vendor,
    List<MenuItemInfoDto> MenuItems
);

public record VendorInfoDto(
    int Id,
    string Name,
    string? Description,
    string Color
);

public record MenuItemInfoDto(
    int Id,
    string Name,
    string? Description,
    int Price
);
