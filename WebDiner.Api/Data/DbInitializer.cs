using WebDiner.Api.Models;
using WebDiner.Api.Services;

namespace WebDiner.Api.Data;

public static class DbInitializer
{
    public static void Initialize(WebDinerDbContext context, IPasswordService passwordService)
    {
        // Ensure database is created
        context.Database.EnsureCreated();

        // Check if already seeded
        if (context.Users.Any())
        {
            return; // DB has been seeded
        }

        // Seed Divisions (處別)
        var divisions = new Division[]
        {
            new() { Name = "管理處", DisplayColumn = 0, DisplayOrder = 0 },
            new() { Name = "技術處", DisplayColumn = 1, DisplayOrder = 0 },
            new() { Name = "審驗處", DisplayColumn = 2, DisplayOrder = 0 }
        };
        context.Divisions.AddRange(divisions);
        context.SaveChanges();

        // Seed Departments (部門)
        var departments = new Department[]
        {
            new() { Name = "行政服務部", DivisionId = divisions[0].Id, DisplayColumn = 0, DisplayOrder = 0 },
            new() { Name = "人力資源部", DivisionId = divisions[0].Id, DisplayColumn = 0, DisplayOrder = 1 },
            new() { Name = "研究企畫一部", DivisionId = divisions[1].Id, DisplayColumn = 1, DisplayOrder = 0 },
            new() { Name = "研究企畫二部", DivisionId = divisions[1].Id, DisplayColumn = 1, DisplayOrder = 1 },
            new() { Name = "品質查核部", DivisionId = divisions[2].Id, DisplayColumn = 2, DisplayOrder = 0 }
        };
        context.Departments.AddRange(departments);
        context.SaveChanges();

        // Seed Users
        var users = new User[]
        {
            new() 
            { 
                EmployeeId = "admin", 
                Name = "系統管理員", 
                HashedPassword = passwordService.HashPassword("admin123"),
                Role = "sysadmin",
                IsAdmin = true,
                DepartmentId = departments[0].Id,
                Title = "系統管理員",
                IsDepartmentHead = false
            },
            new() 
            { 
                EmployeeId = "001", 
                Name = "張三", 
                HashedPassword = passwordService.HashPassword("123456"),
                Role = "user",
                IsAdmin = false,
                DepartmentId = departments[0].Id,
                Extension = "101",
                Title = "專員"
            },
            new() 
            { 
                EmployeeId = "002", 
                Name = "李四", 
                HashedPassword = passwordService.HashPassword("123456"),
                Role = "user",
                IsAdmin = false,
                DepartmentId = departments[2].Id,
                Extension = "201",
                Title = "工程師"
            }
        };
        context.Users.AddRange(users);
        context.SaveChanges();

        // Seed Vendors (廠商)
        var vendors = new Vendor[]
        {
            new() { Name = "便當王", Description = "各式便當", Color = "#EF4444" },
            new() { Name = "素食坊", Description = "健康素食", Color = "#22C55E" },
            new() { Name = "麵食館", Description = "各式麵食", Color = "#3B82F6" }
        };
        context.Vendors.AddRange(vendors);
        context.SaveChanges();

        // Seed Vendor Menu Items
        var menuItems = new VendorMenuItem[]
        {
            // 便當王
            new() { VendorId = vendors[0].Id, Name = "排骨便當", Description = "香酥排骨", Price = 80, Weekday = null },
            new() { VendorId = vendors[0].Id, Name = "雞腿便當", Description = "滷雞腿", Price = 85, Weekday = null },
            new() { VendorId = vendors[0].Id, Name = "豬排便當", Description = "日式豬排", Price = 90, Weekday = 0 }, // 只有週一
            
            // 素食坊
            new() { VendorId = vendors[1].Id, Name = "素食便當A", Description = "三菜一主食", Price = 70, Weekday = null },
            new() { VendorId = vendors[1].Id, Name = "素食便當B", Description = "四菜一主食", Price = 80, Weekday = null },
            
            // 麵食館
            new() { VendorId = vendors[2].Id, Name = "牛肉麵", Description = "紅燒牛肉麵", Price = 100, Weekday = null },
            new() { VendorId = vendors[2].Id, Name = "炸醬麵", Description = "傳統炸醬麵", Price = 65, Weekday = null },
            new() { VendorId = vendors[2].Id, Name = "水餃", Description = "10顆", Price = 60, Weekday = null }
        };
        context.VendorMenuItems.AddRange(menuItems);
        context.SaveChanges();

        Console.WriteLine("Database has been seeded successfully.");
    }
}

