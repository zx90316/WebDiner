# VSCC-WebDiner IIS 部署指南

本文檔說明如何將 VSCC-WebDiner 部署到 Windows Server IIS。

## 系統需求

### 伺服器端
- Windows Server 2019+ 或 Windows 10/11
- IIS 10+ 並啟用以下功能：
  - ASP.NET Core Module (ANCM)
- SQL Server 2019+ (或 SQL Server Express)

### 開發/建置環境
- .NET 8.0 SDK
- Node.js 18+
- npm 9+

## 架構說明

部署後的架構為 **整合模式**：

```
IIS 網站 (C:\web\WebDiner\publish)
├── WebDiner.Api.exe      (獨立部署執行檔)
├── WebDiner.Api.dll      (主程式)
├── *.dll                 (所有依賴 DLL，包含 .NET Runtime)
├── wwwroot/              (前端靜態檔案)
│   ├── index.html
│   ├── assets/
│   └── ...
├── web.config            (IIS 配置)
├── appsettings.json      (應用程式配置)
└── logs/                 (日誌目錄)
```

所有請求都由 .NET 應用程式處理：
- `/api/*` → API Controller 處理
- 其他請求 → 返回 `wwwroot/index.html` (SPA)

---

## 🚀 快速部署 (獨立部署模式 - 推薦)

獨立部署不需要在伺服器上安裝 .NET Runtime，所有依賴都包含在發布資料夾中。

### 步驟 1：在開發電腦建置

#### 方法 A：命令列發布

```powershell
cd C:\Users\cwt02014.VSCC\VSCC-WebDiner

# 1. 建置前端
cd frontend
npm install
npm run build

# 2. 發布後端 (獨立部署)
cd ..\WebDiner.Api
dotnet publish -c Release -o ..\publish-selfcontained --self-contained true -r win-x64

# 3. 複製前端到 wwwroot
Copy-Item -Path "..\frontend\dist\*" -Destination "..\publish-selfcontained\wwwroot" -Recurse -Force

# 4. 建立 logs 資料夾
mkdir ..\publish-selfcontained\logs -ErrorAction SilentlyContinue
```

#### 方法 B：VS2022 發布

1. 方案總管 → 右鍵 **WebDiner.Api** → **發佈...**
2. 選擇 **資料夾**
3. 設定選項：
   - 組態：Release
   - 目標框架：net8.0
   - **部署模式：獨立式 (Self-Contained)**
   - **目標執行階段：win-x64**
4. 點選 **發佈**
5. 手動複製前端：
   ```powershell
   Copy-Item -Path "frontend\dist\*" -Destination "publish\wwwroot" -Recurse -Force
   ```

### 步驟 2：複製到伺服器

將發布資料夾的**全部內容**複製到伺服器：
```
C:\web\WebDiner\publish
```

### 步驟 3：設定 IIS

#### 3.1 建立應用程式集區

1. 開啟 **IIS 管理員**
2. 右鍵 **應用程式集區** → **新增應用程式集區**
3. 設定：
   - 名稱：`WebDiner`
   - **.NET CLR 版本：無受控程式碼** ⚠️ 重要！
   - 受控管線模式：整合式

#### 3.2 建立網站

1. 右鍵 **站台** → **新增網站**
2. 設定：
   - 站台名稱：`WebDiner`
   - 應用程式集區：`WebDiner`
   - **實體路徑：`C:\web\WebDiner\publish`**
   - 繫結：
     - 類型：http
     - 連接埠：80
     - 主機名稱：(選填)

### 步驟 4：設定應用程式

#### 4.1 編輯 web.config

確認 `C:\web\WebDiner\publish\web.config` 內容：

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath=".\WebDiner.Api.exe" 
                  arguments="" 
                  stdoutLogEnabled="true" 
                  stdoutLogFile=".\logs\stdout" 
                  hostingModel="InProcess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        </environmentVariables>
      </aspNetCore>
    </system.webServer>
  </location>
</configuration>
```

> ⚠️ **重要**：獨立部署時 `arguments` 必須為空 `""`

#### 4.2 編輯 appsettings.json

編輯 `C:\web\WebDiner\publish\appsettings.json`：

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=WebDiner;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  },
  "Jwt": {
    "SecretKey": "YourSuperSecretKeyForWebDinerApp2024!AtLeast32Characters",
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

> ⚠️ **重要**：
> - `SecretKey` 必須至少 32 個字元！
> - 修改資料庫連線字串為實際值

### 步驟 5：設定權限

```powershell
# 給予 IIS 讀取權限
icacls "C:\web\WebDiner\publish" /grant "IIS_IUSRS:(OI)(CI)RX" /T

# 給予 logs 資料夾寫入權限
icacls "C:\web\WebDiner\publish\logs" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

### 步驟 6：重啟 IIS

```powershell
iisreset
```

### 步驟 7：測試

1. 開啟瀏覽器，訪問 `http://your-server/`
2. 應該看到 WebDiner 登入頁面
3. 測試 API：`http://your-server/api`

---

## 🔧 NuGet 問題修復

如果遇到 NuGet 無法下載套件的問題：

```powershell
# 重新設定 NuGet 來源
dotnet nuget remove source "nuget.org"
dotnet nuget remove source "nuget.org1"
dotnet nuget add source "https://api.nuget.org/v3/index.json" -n "nuget.org"

# 清除快取
dotnet nuget locals all --clear

# 重新還原
dotnet restore
```

---

## 📋 部署檢查清單

| 項目 | 狀態 |
|------|------|
| 前端已建置 (`npm run build`) | ☐ |
| 後端已發布 (`dotnet publish --self-contained`) | ☐ |
| 前端檔案已複製到 wwwroot | ☐ |
| appsettings.json 已設定（連線字串、JWT SecretKey） | ☐ |
| web.config arguments 為空 | ☐ |
| IIS 應用程式集區為「無受控程式碼」 | ☐ |
| IIS 網站指向 publish 資料夾 | ☐ |
| logs 資料夾已建立且有寫入權限 | ☐ |
| 已執行 iisreset | ☐ |

---

## 🔍 故障排除

### HTTP 404.17 錯誤
- 安裝 .NET 8.0 Hosting Bundle
- 執行 `iisreset`

### HTTP 500.31 錯誤
- 確認使用獨立部署 (`--self-contained true`)
- 或在伺服器安裝對應版本的 .NET Runtime

### HTTP 503 錯誤
- 檢查 `web.config` 的 `arguments` 是否為空
- 檢查 `appsettings.json` 的 `Jwt:SecretKey` 是否有值（至少32字元）
- 檢查資料庫連線字串是否正確
- 查看 `logs\stdout*.log` 日誌

### 啟用詳細日誌

1. 編輯 web.config：
   ```xml
   stdoutLogEnabled="true"
   ```

2. 建立 logs 資料夾並給予寫入權限：
   ```powershell
   mkdir C:\web\WebDiner\publish\logs
   icacls "C:\web\WebDiner\publish\logs" /grant "IIS_IUSRS:(OI)(CI)F"
   ```

3. 重新整理網頁後檢查日誌：
   ```powershell
   Get-Content "C:\web\WebDiner\publish\logs\stdout*.log" -Tail 50
   ```

### 檢查 Windows 事件日誌

```powershell
Get-WinEvent -LogName Application -MaxEvents 30 | 
  Where-Object { $_.Message -like "*WebDiner*" -or $_.ProviderName -like "*ASP.NET*" } | 
  Format-List TimeCreated, Message
```

---

## 🔄 更新部署

```powershell
# 1. 停止應用程式集區
Stop-WebAppPool -Name "WebDiner"

# 2. 複製新檔案
Copy-Item -Path ".\publish-selfcontained\*" -Destination "C:\web\WebDiner\publish" -Recurse -Force

# 3. 啟動應用程式集區
Start-WebAppPool -Name "WebDiner"
```

---

## 📦 備份建議

定期備份以下項目：
- `appsettings.json` (包含設定)
- SQL Server 資料庫
- 上傳的檔案 (如果有)

---

## 🌐 HTTPS 配置 (建議)

### 使用自簽憑證 (測試用)
在 IIS Manager 中：伺服器 → Server Certificates → Create Self-Signed Certificate

### 綁定 HTTPS
1. 在網站 Bindings 中新增 https (443)
2. 選擇 SSL 憑證

### 強制 HTTPS 重導向
在 web.config 的 `<system.webServer>` 區段加入：

```xml
<rewrite>
  <rules>
    <rule name="HTTPS Redirect" stopProcessing="true">
      <match url="(.*)" />
      <conditions>
        <add input="{HTTPS}" pattern="off" ignoreCase="true" />
      </conditions>
      <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
    </rule>
  </rules>
</rewrite>
```

> 注意：需要安裝 URL Rewrite Module
