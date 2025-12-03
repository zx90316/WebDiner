using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

public class Order
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    public int UserId { get; set; }
    
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    public int? VendorId { get; set; }
    
    [ForeignKey("VendorId")]
    public virtual Vendor? Vendor { get; set; }
    
    public int? VendorMenuItemId { get; set; }
    
    [ForeignKey("VendorMenuItemId")]
    public virtual VendorMenuItem? MenuItem { get; set; }
    
    public DateOnly OrderDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [MaxLength(50)]
    public string Status { get; set; } = "Pending";
    
    // Legacy: 保留向後相容
    public string? Items { get; set; }
}

