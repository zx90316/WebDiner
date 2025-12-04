namespace WebDiner.Api.Data;

public static class DbInitializer
{
    public static void Initialize(WebDinerDbContext context)
    {
        // Ensure database is created
        context.Database.EnsureCreated();

        // 不自動插入測試資料，由管理員手動建立
        Console.WriteLine("Database initialized successfully.");
    }
}
