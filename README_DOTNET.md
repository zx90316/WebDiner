# VSCC-WebDiner (.NET Core 版本)

這是 VSCC 訂餐系統的 .NET Core C# 重構版本，支援 Visual Studio 2022。

## 系統需求

- .NET 8.0 SDK
- Visual Studio 2022 (建議版本 17.8+)
- Node.js 18+ (前端開發用)

## 專案結構

```
VSCC-WebDiner/
├── WebDiner.sln                 # VS2022 解決方案檔案
├── WebDiner.Api/                # .NET Core Web API 專案
│   ├── Controllers/             # API 控制器
│   │   ├── AuthController.cs
│   │   ├── OrdersController.cs
│   │   ├── MenuController.cs
│   │   ├── VendorsController.cs
│   │   ├── AdminController.cs
│   │   └── ExtensionDirectoryController.cs
│   ├── Models/                  # Entity Framework 資料模型
│   │   ├── User.cs
│   │   ├── Division.cs
│   │   ├── Department.cs
│   │   ├── Vendor.cs
│   │   ├── VendorMenuItem.cs
│   │   ├── Order.cs
│   │   └── SpecialDay.cs
│   ├── DTOs/                    # 資料傳輸物件
│   ├── Data/                    # 資料庫上下文
│   │   ├── WebDinerDbContext.cs
│   │   └── DbInitializer.cs
│   ├── Services/                # 服務層
│   │   ├── JwtService.cs
│   │   └── PasswordService.cs
│   ├── Program.cs               # 應用程式進入點
│   └── appsettings.json         # 配置檔案
└── frontend/                    # React 前端專案 (維持不變)
```

## 快速開始

### 使用 Visual Studio 2022

1. 開啟 `WebDiner.sln` 解決方案檔案
2. 按 F5 或點擊「開始偵錯」執行專案
3. 瀏覽器將自動開啟 Swagger UI: http://localhost:8201/swagger

### 使用命令列

```bash
# 進入 API 專案目錄
cd WebDiner.Api

# 還原套件
dotnet restore

# 執行專案
dotnet run --urls "http://localhost:8201"

# 或使用批次檔
run_backend_dotnet.bat
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## API 端點

所有 API 都以 `/api` 為前綴：

### 認證 (Auth)
- `POST /api/auth/register` - 註冊
- `POST /api/auth/login` - 登入 (OAuth2 form)
- `GET /api/auth/me` - 取得當前用戶資訊
- `POST /api/auth/change-password` - 變更密碼

### 訂單 (Orders)
- `GET /api/orders` - 取得用戶訂單
- `POST /api/orders` - 建立訂單
- `POST /api/orders/batch` - 批次建立訂單
- `DELETE /api/orders/{id}` - 取消訂單
- `GET /api/orders/special_days` - 取得特殊日期

### 廠商 (Vendors)
- `GET /api/vendors` - 廠商列表
- `GET /api/vendors/{id}` - 廠商詳情
- `GET /api/vendors/{id}/menu` - 廠商菜單
- `GET /api/vendors/available/{date}` - 指定日期可用廠商

### 管理 (Admin)
- `GET /api/admin/stats` - 訂餐統計
- `GET /api/admin/users` - 用戶管理
- `GET /api/admin/divisions` - 處別管理
- `GET /api/admin/departments` - 部門管理
- `GET /api/admin/special_days` - 特殊日期管理
- `GET /api/admin/order_announcement` - 訂餐公告

### 分機表 (Extension Directory)
- `GET /api/extension-directory` - 取得分機表

## 預設帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin | admin123 | 系統管理員 |
| 001 | 123456 | 一般用戶 |
| 002 | 123456 | 一般用戶 |

## 資料庫

預設使用 SQLite，資料庫檔案為 `webdiner.db`。

若需使用其他資料庫，修改 `appsettings.json` 中的連接字串並安裝對應的 EF Core Provider。

## 配置說明

### JWT 配置 (appsettings.json)

```json
{
  "Jwt": {
    "SecretKey": "your-secret-key",
    "Issuer": "WebDiner.Api",
    "Audience": "WebDiner.Frontend",
    "ExpirationMinutes": 30
  }
}
```

### CORS 配置

預設允許以下來源：
- http://localhost:5173 (Vite 預設)
- http://localhost:8201
- 內網 IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)

## 從 Python 版本遷移

此 .NET Core 版本完全相容原有的 Python FastAPI 版本 API 介面，前端無需修改即可使用。

主要變更：
1. 後端從 Python FastAPI 改為 ASP.NET Core
2. ORM 從 SQLAlchemy 改為 Entity Framework Core
3. 密碼雜湊從 Argon2 改為 BCrypt
4. JWT 實作使用 Microsoft.AspNetCore.Authentication.JwtBearer

## 授權

MIT License

