using Microsoft.EntityFrameworkCore;
using WebDiner.Api.Models;

namespace WebDiner.Api.Data;

public class WebDinerDbContext : DbContext
{
    public WebDinerDbContext(DbContextOptions<WebDinerDbContext> options) : base(options)
    {
    }
    
    public DbSet<User> Users { get; set; }
    public DbSet<Division> Divisions { get; set; }
    public DbSet<Department> Departments { get; set; }
    public DbSet<Vendor> Vendors { get; set; }
    public DbSet<VendorMenuItem> VendorMenuItems { get; set; }
    public DbSet<MenuItem> MenuItems { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<SpecialDay> SpecialDays { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasIndex(e => e.EmployeeId).IsUnique();
            entity.HasIndex(e => e.Email);
            
            entity.HasOne(u => u.Department)
                .WithMany(d => d.Users)
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });
        
        // Division
        modelBuilder.Entity<Division>(entity =>
        {
            entity.ToTable("Divisions");
            entity.HasIndex(e => e.Name).IsUnique();
        });
        
        // Department
        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("Departments");
            entity.HasIndex(e => e.Name).IsUnique();
            
            entity.HasOne(d => d.Division)
                .WithMany(v => v.Departments)
                .HasForeignKey(d => d.DivisionId)
                .OnDelete(DeleteBehavior.SetNull);
        });
        
        // Vendor
        modelBuilder.Entity<Vendor>(entity =>
        {
            entity.ToTable("Vendors");
            entity.HasIndex(e => e.Name).IsUnique();
        });
        
        // VendorMenuItem
        modelBuilder.Entity<VendorMenuItem>(entity =>
        {
            entity.ToTable("VendorMenuItems");
            entity.HasOne(m => m.Vendor)
                .WithMany(v => v.MenuItems)
                .HasForeignKey(m => m.VendorId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        // MenuItem (Legacy)
        modelBuilder.Entity<MenuItem>(entity =>
        {
            entity.ToTable("MenuItems");
            entity.HasIndex(e => e.Name);
        });
        
        // Order
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders");
            entity.HasIndex(e => e.OrderDate);
            entity.HasIndex(e => e.UserId);
            
            entity.HasOne(o => o.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(o => o.Vendor)
                .WithMany(v => v.Orders)
                .HasForeignKey(o => o.VendorId)
                .OnDelete(DeleteBehavior.SetNull);
                
            entity.HasOne(o => o.MenuItem)
                .WithMany()
                .HasForeignKey(o => o.VendorMenuItemId)
                .OnDelete(DeleteBehavior.SetNull);
        });
        
        // SpecialDay
        modelBuilder.Entity<SpecialDay>(entity =>
        {
            entity.ToTable("SpecialDays");
            entity.HasIndex(e => e.Date).IsUnique();
        });
    }
}

