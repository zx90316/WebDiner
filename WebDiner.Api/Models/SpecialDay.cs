using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebDiner.Api.Models;

public class SpecialDay
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    public DateOnly Date { get; set; }
    
    public bool IsHoliday { get; set; } = true; // True = Holiday, False = Workday (makeup day)
    
    [MaxLength(200)]
    public string? Description { get; set; }
}

