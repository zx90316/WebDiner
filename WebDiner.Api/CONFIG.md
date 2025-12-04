# 配置說明

## 開發環境設置

### 方法一：使用 User Secrets（推薦）

```bash
cd WebDiner.Api

# 初始化 User Secrets
dotnet user-secrets init

# 設置資料庫連接字串
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=YOUR_SERVER;Database=YOUR_DB;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;"

# 設置 JWT 密鑰
dotnet user-secrets set "Jwt:SecretKey" "YourSecretKeyAtLeast32CharactersLong"
```

### 方法二：使用 appsettings.Development.json

1. 複製範本檔案：
   ```bash
   cp appsettings.json.template appsettings.Development.json
   ```

2. 編輯 `appsettings.Development.json`，填入實際的連接資訊

> ⚠️ 注意：`appsettings.Development.json` 已被 `.gitignore` 排除，不會被提交到版控

## 生產環境設置

建議使用環境變數：

```bash
# Windows PowerShell
$env:ConnectionStrings__DefaultConnection = "Server=...;Database=...;User Id=...;Password=...;"
$env:Jwt__SecretKey = "YourProductionSecretKey"

# Linux/macOS
export ConnectionStrings__DefaultConnection="Server=...;Database=...;User Id=...;Password=...;"
export Jwt__SecretKey="YourProductionSecretKey"
```

或使用 Azure Key Vault、AWS Secrets Manager 等密鑰管理服務。

## 配置優先順序

.NET 配置的載入順序（後者覆蓋前者）：

1. `appsettings.json`
2. `appsettings.{Environment}.json`
3. User Secrets（僅開發環境）
4. 環境變數
5. 命令列參數

