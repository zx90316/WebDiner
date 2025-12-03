using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

public class VendorMenuItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    public int VendorId { get; set; }
    
    [ForeignKey("VendorId")]
    public virtual Vendor Vendor { get; set; } = null!;
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // 品項名稱
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public int Price { get; set; } // 價格（元）
    
    public int? Weekday { get; set; } // 0-4 for Mon-Fri, null for all days
    
    public bool IsActive { get; set; } = true;
}

