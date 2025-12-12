using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

/// <summary>
/// 部門資訊項目模型 - 用於在分機表中顯示部門下的額外資訊
/// 可以是會議室/辦公室類型（名字 + 分機）或純字串類型（名字）
/// </summary>
public class DepartmentItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    [Required]
    public int DepartmentId { get; set; }
    
    [ForeignKey("DepartmentId")]
    public virtual Department Department { get; set; } = null!;
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// 分機號碼（可選，僅用於會議室/辦公室類型）
    /// </summary>
    [MaxLength(20)]
    public string? Extension { get; set; }
    
    /// <summary>
    /// 項目類型：room（會議室/辦公室，有分機）或 text（純字串，無分機）
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string ItemType { get; set; } = "text"; // "room" or "text"
    
    /// <summary>
    /// 顯示順序（在同一部門內的排序）
    /// </summary>
    public int DisplayOrder { get; set; } = 0;
    
    public bool IsActive { get; set; } = true;
}
