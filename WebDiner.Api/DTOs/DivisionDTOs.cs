using System.ComponentModel.DataAnnotations;

namespace WebDiner.Api.DTOs;

// ===== Division (處別) DTOs =====

public record DivisionDto(
    int Id,
    string Name,
    bool IsActive,
    int DisplayColumn,
    int DisplayOrder
);

public record DivisionCreateDto(
    string Name,
    bool IsActive = true,
    int DisplayColumn = 0,
    int DisplayOrder = 0
);

public record DivisionUpdateDto(
    string? Name = null,
    bool? IsActive = null,
    int? DisplayColumn = null,
    int? DisplayOrder = null
);

public record DivisionWithDepartmentsDto(
    int Id,
    string Name,
    bool IsActive,
    int DisplayColumn,
    int DisplayOrder,
    List<DepartmentDto> Departments
);

// ===== Department (部門) DTOs =====

public record DepartmentDto(
    int Id,
    string Name,
    bool IsActive,
    int? DivisionId,
    int DisplayColumn,
    int DisplayOrder
);

public record DepartmentCreateDto(
    string Name,
    bool IsActive = true,
    int? DivisionId = null,
    int DisplayColumn = 0,
    int DisplayOrder = 0
);

public record DepartmentUpdateDto(
    string? Name = null,
    bool? IsActive = null,
    int? DivisionId = null,
    int? DisplayColumn = null,
    int? DisplayOrder = null
);

public record DepartmentWithDivisionDto(
    int Id,
    string Name,
    bool IsActive,
    int? DivisionId,
    int DisplayColumn,
    int DisplayOrder,
    string? DivisionName
);
