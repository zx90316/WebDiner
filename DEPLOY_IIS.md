# VSCC-WebDiner IIS 部署指南

本文檔說明如何將 VSCC-WebDiner 部署到 Windows Server IIS。

## 系統需求

### 伺服器端
- Windows Server 2019+ 或 Windows 10/11
- IIS 10+ 並啟用以下功能：
  - ASP.NET Core Module (ANCM)
  - URL Rewrite Module 2.1+
- .NET 8.0 Runtime (Hosting Bundle)
- SQL Server 2019+ (或 SQL Server Express)

### 開發/建置環境
- .NET 8.0 SDK
- Node.js 18+
- npm 9+

## 架構說明

部署後的架構為 **整合模式**：

```
IIS 網站
├── WebDiner.Api.dll      (後端 .NET API)
├── wwwroot/              (前端靜態檔案)
│   ├── index.html
│   ├── assets/
│   └── ...
├── web.config            (IIS 配置)
└── appsettings.json      (應用程式配置)
```

所有請求都由 .NET 應用程式處理：
- `/api/*` → API Controller 處理
- 其他請求 → 返回 `wwwroot/index.html` (SPA)

## 部署步驟

### 步驟 1: 安裝必要軟體

1. **安裝 .NET 8.0 Hosting Bundle**
   - 下載: https://dotnet.microsoft.com/download/dotnet/8.0
   - 選擇 "Hosting Bundle" (包含 Runtime + ANCM)
   - 安裝後重啟 IIS

2. **安裝 URL Rewrite Module**
   - 下載: https://www.iis.net/downloads/microsoft/url-rewrite
   - 安裝後重啟 IIS

3. **確認安裝**
   ```powershell
   # 檢查 .NET Runtime
   dotnet --list-runtimes
   
   # 應該看到類似:
   # Microsoft.AspNetCore.App 8.0.x
   # Microsoft.NETCore.App 8.0.x
   ```

### 步驟 2: 建置應用程式

#### 方法 A: 使用部署腳本 (推薦)

```powershell
# PowerShell
.\deploy-iis.ps1
```

或

```cmd
# 命令提示字元
deploy-iis.bat
```

#### 方法 B: 手動建置

```bash
# 1. 建置前端
cd frontend
npm install
npm run build

# 2. 發布後端
cd ../WebDiner.Api
dotnet publish -c Release -o ../publish

# 3. 複製前端到 wwwroot
xcopy /s /e /y ..\frontend\dist\* ..\publish\wwwroot\
```

### 步驟 3: 設定 IIS

1. **建立 Application Pool**
   - 開啟 IIS Manager
   - 右鍵「Application Pools」→「Add Application Pool」
   - 名稱: `WebDiner`
   - .NET CLR Version: **No Managed Code**
   - Managed Pipeline Mode: Integrated
   - Start application pool immediately: ✓

2. **設定 Application Pool 身份識別**
   - 選擇 `WebDiner` Pool → Advanced Settings
   - Identity: 選擇有足夠權限存取資料庫的帳戶
   - 或使用 `ApplicationPoolIdentity` 並在 SQL Server 授權

3. **建立網站**
   - 右鍵「Sites」→「Add Website」
   - Site name: `WebDiner`
   - Application pool: `WebDiner`
   - Physical path: `C:\inetpub\wwwroot\WebDiner` (或您的部署目錄)
   - Binding: 
     - Type: http
     - Port: 80 (或其他)
     - Host name: (選填)

4. **複製發布檔案**
   - 將 `publish` 目錄的所有內容複製到網站物理路徑

### 步驟 4: 設定應用程式

編輯 `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=WebDiner;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  },
  "Jwt": {
    "SecretKey": "YOUR_STRONG_SECRET_KEY_AT_LEAST_32_CHARACTERS",
    "Issuer": "WebDiner.Api",
    "Audience": "WebDiner.Frontend",
    "ExpirationMinutes": 480
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

> ⚠️ **重要**: 
> - 使用強密碼的 JWT SecretKey (至少 32 字元)
> - 根據實際環境設定資料庫連線字串
> - 生產環境建議將 LogLevel 設為 Warning

### 步驟 5: 設定權限

確保 Application Pool 身份有以下權限：

```powershell
# 給予 IIS_IUSRS 讀取權限
icacls "C:\inetpub\wwwroot\WebDiner" /grant "IIS_IUSRS:(OI)(CI)RX" /T

# 如果需要寫入 logs 目錄
icacls "C:\inetpub\wwwroot\WebDiner\logs" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

### 步驟 6: 測試部署

1. 開啟瀏覽器，訪問 `http://your-server/`
2. 應該看到 WebDiner 登入頁面
3. 測試 API: `http://your-server/api`
4. 使用預設帳號登入測試

## 故障排除

### 500.19 錯誤
- 確認已安裝 URL Rewrite Module
- 檢查 web.config 語法

### 502.5 錯誤
- 確認已安裝 .NET 8.0 Hosting Bundle
- 檢查 Application Pool 是否為 "No Managed Code"
- 查看 Windows 事件檢視器 → Application

### API 返回 500 錯誤
- 檢查資料庫連線字串
- 確認 SQL Server 允許該帳戶連線
- 啟用 stdout 日誌：編輯 web.config，設定 `stdoutLogEnabled="true"`

### 前端頁面顯示空白
- 確認 wwwroot 目錄包含前端檔案
- 檢查瀏覽器 Console 是否有 JavaScript 錯誤
- 確認檔案有正確的讀取權限

### 啟用 stdout 日誌

1. 建立 logs 目錄:
   ```
   mkdir C:\inetpub\wwwroot\WebDiner\logs
   ```

2. 修改 web.config:
   ```xml
   <aspNetCore stdoutLogEnabled="true" ...>
   ```

3. 給予寫入權限並重啟網站

## HTTPS 配置 (建議)

### 使用自簽憑證 (測試用)
```powershell
# 在 IIS Manager 中
# 選擇伺服器 → Server Certificates → Create Self-Signed Certificate
```

### 綁定 HTTPS
1. 在網站 Bindings 中新增 https (443)
2. 選擇 SSL 憑證

### 強制 HTTPS 重導向
在 web.config 的 `<rewrite>` 區段加入:

```xml
<rule name="HTTPS Redirect" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

## 更新部署

1. 停止 Application Pool
2. 重新執行 `deploy-iis.ps1`
3. 複製新的發布檔案到網站目錄
4. 啟動 Application Pool

```powershell
# 範例腳本
Stop-WebAppPool -Name "WebDiner"
Copy-Item -Path ".\publish\*" -Destination "C:\inetpub\wwwroot\WebDiner" -Recurse -Force
Start-WebAppPool -Name "WebDiner"
```

## 備份建議

定期備份以下項目：
- `appsettings.json` (包含設定)
- SQL Server 資料庫
- 上傳的檔案 (如果有)

