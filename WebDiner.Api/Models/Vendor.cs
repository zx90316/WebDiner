using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

public class Vendor
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // 廠商名稱
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [MaxLength(7)]
    public string Color { get; set; } = "#3B82F6"; // 廠商代表色
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual ICollection<VendorMenuItem> MenuItems { get; set; } = new List<VendorMenuItem>();
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}

