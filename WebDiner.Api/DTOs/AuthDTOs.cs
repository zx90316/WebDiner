using System.ComponentModel.DataAnnotations;

namespace WebDiner.Api.DTOs;

// ===== User DTOs =====

public record UserDto(
    int Id,
    string EmployeeId,
    string Name,
    string? Extension,
    string? Email,
    bool IsActive,
    bool IsAdmin,
    string? Role,
    int? DepartmentId,
    string? Title,
    bool IsDepartmentHead,
    List<int>? SecondaryDepartmentIds = null
);

public record UserCreateDto(
    string EmployeeId,
    string Name,
    string? Extension,
    string? Email,
    string Password,
    int? DepartmentId = null,
    string Role = "user",
    string? Title = null,
    bool IsDepartmentHead = false,
    List<int>? SecondaryDepartmentIds = null
);

public record UserUpdateDto(
    string? EmployeeId = null,
    string? Name = null,
    string? Extension = null,
    string? Email = null,
    int? DepartmentId = null,
    string? Password = null,
    bool? IsActive = null,
    bool? IsAdmin = null,
    string? Role = null,
    string? Title = null,
    bool? IsDepartmentHead = null,
    List<int>? SecondaryDepartmentIds = null
);

public record UserLoginDto(
    string EmployeeId,
    string Password
);

public record ChangePasswordDto(
    string OldPassword,
    string NewPassword
);

// ===== Token DTOs =====

public record TokenDto(
    string AccessToken,
    string TokenType
);

public record TokenDataDto(
    string? Username
);
