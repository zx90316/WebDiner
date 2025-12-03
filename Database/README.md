# WebDiner 資料庫腳本

此資料夾包含 SQL Server 資料庫建立和資料遷移所需的腳本。

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `SqlServer_CreateTables.sql` | SQL Server 資料表建立腳本 |
| `SqlServer_SeedData.sql` | 種子資料（初始資料）插入腳本 |
| `Migrate_SQLite_to_SqlServer.sql` | SQLite 遷移後的 IDENTITY 重設腳本 |
| `Migrate_SQLite_to_SqlServer.ps1` | 自動化遷移 PowerShell 腳本 |

## 快速開始（新安裝）

### 1. 建立資料庫和資料表

```sql
-- 在 SQL Server Management Studio (SSMS) 執行
-- 執行 SqlServer_CreateTables.sql
```

### 2. 插入種子資料（可選）

```sql
-- 執行 SqlServer_SeedData.sql
-- 注意：密碼雜湊需要由應用程式生成，或手動更新
```

### 3. 更新連接字串

修改 `appsettings.json`：

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=你的伺服器;Database=WebDiner;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

連接字串範例：

| 認證方式 | 連接字串 |
|----------|----------|
| Windows 驗證 | `Server=localhost;Database=WebDiner;Trusted_Connection=True;TrustServerCertificate=True;` |
| SQL Server 驗證 | `Server=localhost;Database=WebDiner;User Id=sa;Password=你的密碼;TrustServerCertificate=True;` |
| 命名實例 | `Server=localhost\SQLEXPRESS;Database=WebDiner;Trusted_Connection=True;TrustServerCertificate=True;` |

## 從 SQLite 遷移資料

### 方法一：使用 PowerShell 腳本（推薦）

```powershell
# 1. 先執行建表腳本
# 2. 執行遷移腳本
.\Migrate_SQLite_to_SqlServer.ps1 `
    -SqlitePath "C:\path\to\webdiner.db" `
    -SqlServerConnection "Server=localhost;Database=WebDiner;Trusted_Connection=True;"

# 3. 執行 IDENTITY 重設
# 在 SSMS 執行 Migrate_SQLite_to_SqlServer.sql
```

### 方法二：使用 SSMS 匯入精靈

1. 使用 [DB Browser for SQLite](https://sqlitebrowser.org/) 開啟 `webdiner.db`
2. 匯出每個資料表為 CSV 檔案
3. 在 SSMS 中右鍵點擊 WebDiner 資料庫 → 工作 → 匯入資料
4. 選擇「一般檔案來源」並匯入 CSV
5. 執行 `Migrate_SQLite_to_SqlServer.sql` 重設 IDENTITY

### 方法三：使用 Entity Framework Core 遷移

```bash
cd WebDiner.Api

# 新增遷移
dotnet ef migrations add InitialCreate

# 更新資料庫
dotnet ef database update
```

## 資料表結構

```
┌─────────────┐     ┌─────────────┐
│  Divisions  │◄────│ Departments │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Users    │
                    └──────┬──────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐
│   Vendors   │◄────│   Orders    │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────────┐
│ VendorMenuItems │
└─────────────────┘

┌─────────────┐
│ SpecialDays │ (獨立)
└─────────────┘

┌─────────────┐
│  MenuItems  │ (舊版，獨立)
└─────────────┘
```

## 預設帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin | admin123 | 系統管理員 |
| 001 | 123456 | 一般用戶 |
| 002 | 123456 | 一般用戶 |

> ⚠️ **注意**：如果使用 SQL 腳本插入種子資料，密碼雜湊是佔位符。
> 建議讓應用程式首次啟動時自動執行 `DbInitializer` 生成正確的密碼雜湊。

