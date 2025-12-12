namespace WebDiner.Api.DTOs;

// ===== Extension Directory DTOs =====

public record ExtensionDirectoryDto(
    List<ExtensionDirectoryColumnDto> Columns,
    DateTime GeneratedAt
);

public record ExtensionDirectoryColumnDto(
    int ColumnIndex,
    List<ExtensionDirectoryDivisionDto> Divisions
);

public record ExtensionDirectoryDivisionDto(
    int Id,
    string Name,
    int DisplayColumn,
    int DisplayOrder,
    List<ExtensionDirectoryDepartmentDto> Departments
);

public record ExtensionDirectoryDepartmentDto(
    int Id,
    string Name,
    int? DivisionId,
    string? DivisionName,
    int DisplayOrder,
    List<ExtensionDirectoryUserDto> Users
);

public record ExtensionDirectoryUserDto(
    string EmployeeId,
    string Name,
    string? Extension,
    string? Title,
    bool IsDepartmentHead,
    bool IsSecondaryDepartment = false
);

// ===== Position Update DTOs =====

public record DivisionPositionDto(
    int Id,
    int DisplayColumn,
    int DisplayOrder
);

public record DepartmentPositionDto(
    int Id,
    int? DivisionId,
    int DisplayOrder
);
