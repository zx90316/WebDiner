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
    
    // Navigation property
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}

