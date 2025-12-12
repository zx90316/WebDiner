using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string EmployeeId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(20)]
    public string? Extension { get; set; }
    
    [MaxLength(200)]
    public string? Email { get; set; }
    
    [Required]
    public string HashedPassword { get; set; } = string.Empty;
    
    public bool IsActive { get; set; } = true;
    
    public bool IsAdmin { get; set; } = false;
    
    [MaxLength(20)]
    public string Role { get; set; } = "user"; // user, admin, sysadmin
    
    public int? DepartmentId { get; set; }
    
    [ForeignKey("DepartmentId")]
    public virtual Department? Department { get; set; }
    
    // 分機表相關欄位
    [MaxLength(50)]
    public string? Title { get; set; } // 職稱：董事長、執行長、經理等
    
    public bool IsDepartmentHead { get; set; } = false; // 是否為部門主管
    
    // 兼任部門（多對多關係）
    public virtual ICollection<UserDepartment> UserDepartments { get; set; } = new List<UserDepartment>();
    
    // Navigation property
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}

