using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

/// <summary>
/// 處別模型 - 如：管理處、技術處、審驗處
/// </summary>
public class Division
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // 處別名稱
    
    public bool IsActive { get; set; } = true;
    
    // 分機表顯示位置
    public int DisplayColumn { get; set; } = 0; // 顯示在哪一欄（0-3）
    
    public int DisplayOrder { get; set; } = 0; // 同一欄內的排序順序
    
    // Navigation property
    public virtual ICollection<Department> Departments { get; set; } = new List<Department>();
}

