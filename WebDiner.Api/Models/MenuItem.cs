using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

/// <summary>
/// Legacy MenuItem - 保留向後相容
/// </summary>
public class MenuItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public int Price { get; set; }
    
    [MaxLength(50)]
    public string? Category { get; set; }
    
    public bool IsActive { get; set; } = true;
}

