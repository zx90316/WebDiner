using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

/// <summary>
/// 部門模型 - 如：行政服務部、研究企畫一部
/// </summary>
public class Department
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    public bool IsActive { get; set; } = true;
    
    // 所屬處別
    public int? DivisionId { get; set; }
    
    [ForeignKey("DivisionId")]
    public virtual Division? Division { get; set; }
    
    // 分機表顯示位置相關欄位
    public int DisplayColumn { get; set; } = 0; // 顯示在哪一欄（0-3，共4欄）
    
    public int DisplayOrder { get; set; } = 0; // 同一欄內的排序順序
    
    // 是否在分機表中顯示部門名稱
    public bool ShowNameInDirectory { get; set; } = true;
    
    // Navigation property
    public virtual ICollection<User> Users { get; set; } = new List<User>();
    
    // 兼任此部門的用戶（多對多關係）
    public virtual ICollection<UserDepartment> UserDepartments { get; set; } = new List<UserDepartment>();
    
    // 部門資訊項目（會議室/辦公室或純字串）
    public virtual ICollection<DepartmentItem> DepartmentItems { get; set; } = new List<DepartmentItem>();
}

