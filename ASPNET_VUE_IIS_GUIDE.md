# ASP.NET Core + Vue.js 部署 IIS 教戰手冊

完整的 ASP.NET Core API + Vue.js SPA 部署到 Windows Server IIS 指南。

---

## 📚 目錄

1. [架構概述](#架構概述)
2. [伺服器環境準備](#伺服器環境準備)
3. [開發環境建置](#開發環境建置)
4. [發布方式選擇](#發布方式選擇)
5. [IIS 設定](#iis-設定)
6. [應用程式設定](#應用程式設定)
7. [常見錯誤排解](#常見錯誤排解)
8. [檢查清單](#檢查清單)

---

## 架構概述

### 整合部署模式

```
┌─────────────────────────────────────────────────────────┐
│                    IIS 網站                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │              ASP.NET Core 應用程式                  │  │
│  │  ┌─────────────┐    ┌─────────────────────────┐   │  │
│  │  │ wwwroot/    │    │    API Controllers     │   │  │
│  │  │ (Vue 前端)  │    │    /api/*              │   │  │
│  │  └─────────────┘    └─────────────────────────┘   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 請求流程

| 請求路徑 | 處理方式 |
|---------|---------|
| `/api/*` | ASP.NET Core API Controller |
| `/assets/*` | 靜態檔案 (wwwroot) |
| 其他路徑 | 返回 `index.html` (Vue Router 處理) |

---

## 伺服器環境準備

### 必要軟體

| 軟體 | 用途 | 下載連結 |
|-----|------|---------|
| **Hosting Bundle** | IIS 運行 .NET 應用 | [下載](https://dotnet.microsoft.com/download/dotnet/8.0) |
| IIS | Web 伺服器 | Windows 內建功能 |

### ⚠️ 重要：安裝 Hosting Bundle，不是 Runtime！

| 安裝項目 | IIS 支援 | 說明 |
|---------|---------|------|
| ❌ ASP.NET Core Runtime | 不支援 | 只能在命令列運行 |
| ❌ .NET Runtime | 不支援 | 缺少 IIS 模組 |
| ✅ **Hosting Bundle** | 支援 | 包含 Runtime + ASP.NET Core Module |

### 安裝 Hosting Bundle

1. 前往 [.NET 8.0 下載頁面](https://dotnet.microsoft.com/download/dotnet/8.0)
2. 找到 **ASP.NET Core Runtime** 區塊
3. Windows 行 → 點選 **Hosting Bundle**
4. 執行安裝程式
5. **重要：重新啟動 IIS**
   ```powershell
   iisreset
   ```

### 驗證安裝

```powershell
# 檢查 .NET Runtime
dotnet --list-runtimes

# 預期輸出：
# Microsoft.AspNetCore.App 8.0.x
# Microsoft.NETCore.App 8.0.x

# 檢查 IIS 模組
Get-WebGlobalModule | Where-Object { $_.Name -like "*AspNetCore*" }

# 預期輸出：
# Name                  Image
# ----                  -----
# AspNetCoreModuleV2    ...\aspnetcorev2.dll
```

---

## 開發環境建置

### 必要工具

- .NET 8.0 SDK
- Node.js 18+
- npm 9+

### 專案結構

```
專案根目錄/
├── WebDiner.Api/           # ASP.NET Core 專案
│   ├── Controllers/
│   ├── Models/
│   ├── appsettings.json
│   ├── Program.cs
│   └── WebDiner.Api.csproj
├── frontend/               # Vue.js 專案
│   ├── src/
│   ├── dist/              # 建置輸出
│   ├── package.json
│   └── vite.config.ts
├── publish/               # 發布輸出
└── WebDiner.sln
```

---

## 發布方式選擇

### 比較表

| 項目 | 框架依賴 | 獨立部署 |
|------|---------|---------|
| **指令** | `dotnet publish -c Release` | `dotnet publish -c Release --self-contained -r win-x64` |
| **大小** | ~20 MB | ~90 MB |
| **伺服器需求** | 需安裝 Hosting Bundle | 無需安裝 |
| **web.config processPath** | `dotnet` | `.\AppName.exe` |
| **web.config arguments** | `.\AppName.dll` | `""` (空) |
| **適用場景** | 多應用共用 Runtime | 環境隔離、確保版本一致 |

---

### 方法 A：框架依賴發布（推薦，較小）

```powershell
# 1. 建置前端
cd frontend
npm install
npm run build

# 2. 發布後端
cd ../WebDiner.Api
dotnet publish -c Release -o ../publish

# 3. 複製前端到 wwwroot
Copy-Item -Path "../frontend/dist/*" -Destination "../publish/wwwroot" -Recurse -Force

# 4. 建立 logs 資料夾
mkdir ../publish/logs -ErrorAction SilentlyContinue
```

**web.config 設定：**
```xml
<aspNetCore processPath="dotnet" 
            arguments=".\WebDiner.Api.dll" 
            stdoutLogEnabled="true" 
            stdoutLogFile=".\logs\stdout" 
            hostingModel="InProcess">
```

---

### 方法 B：獨立部署（較大，免安裝 Runtime）

```powershell
# 1. 建置前端
cd frontend
npm install
npm run build

# 2. 發布後端（獨立部署）
cd ../WebDiner.Api
dotnet publish -c Release -o ../publish --self-contained true -r win-x64

# 3. 複製前端到 wwwroot
Copy-Item -Path "../frontend/dist/*" -Destination "../publish/wwwroot" -Recurse -Force

# 4. 建立 logs 資料夾
mkdir ../publish/logs -ErrorAction SilentlyContinue
```

**web.config 設定：**
```xml
<aspNetCore processPath=".\WebDiner.Api.exe" 
            arguments="" 
            stdoutLogEnabled="true" 
            stdoutLogFile=".\logs\stdout" 
            hostingModel="InProcess">
```

---

## IIS 設定

### 1. 建立應用程式集區

1. 開啟 **IIS 管理員**
2. 右鍵 **應用程式集區** → **新增應用程式集區**
3. 設定：

| 設定項目 | 值 |
|---------|---|
| 名稱 | `MyApp` |
| **.NET CLR 版本** | **⚠️ 無受控程式碼** |
| 受控管線模式 | 整合式 |

> ⚠️ **關鍵設定**：`.NET CLR 版本` 必須選擇「**無受控程式碼**」(No Managed Code)

### 2. 建立網站

1. 右鍵 **站台** → **新增網站**
2. 設定：

| 設定項目 | 值 |
|---------|---|
| 站台名稱 | `MyApp` |
| 應用程式集區 | `MyApp` |
| 實體路徑 | `C:\web\MyApp\publish` |
| 連接埠 | 80 (或其他) |

### 3. 設定權限

```powershell
# 給予 IIS 讀取權限
icacls "C:\web\MyApp\publish" /grant "IIS_IUSRS:(OI)(CI)RX" /T

# 給予 logs 資料夾寫入權限
icacls "C:\web\MyApp\publish\logs" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

---

## 應用程式設定

### web.config 完整範例

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" 
             modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      
      <!-- 框架依賴版本 -->
      <aspNetCore processPath="dotnet" 
                  arguments=".\WebDiner.Api.dll" 
                  stdoutLogEnabled="true" 
                  stdoutLogFile=".\logs\stdout" 
                  hostingModel="InProcess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        </environmentVariables>
      </aspNetCore>
      
      <!-- 獨立部署版本（二擇一）
      <aspNetCore processPath=".\WebDiner.Api.exe" 
                  arguments="" 
                  stdoutLogEnabled="true" 
                  stdoutLogFile=".\logs\stdout" 
                  hostingModel="InProcess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        </environmentVariables>
      </aspNetCore>
      -->
      
    </system.webServer>
  </location>
</configuration>
```

### appsettings.json 範例

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=伺服器;Database=資料庫;User Id=帳號;Password=密碼;TrustServerCertificate=True;"
  },
  "Jwt": {
    "SecretKey": "至少32個字元的安全金鑰!!!!!!!!!!",
    "Issuer": "MyApp.Api",
    "Audience": "MyApp.Frontend",
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

> ⚠️ **重要**：`Jwt:SecretKey` 必須至少 32 個字元！

### Program.cs SPA 設定

```csharp
var app = builder.Build();

// ... 其他中介軟體 ...

// Production 環境提供靜態檔案
if (!app.Environment.IsDevelopment())
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SPA Fallback: 非 API 路徑返回 index.html
if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("index.html");
}

app.Run();
```

---

## 常見錯誤排解

### HTTP 404.17 - Not Found

**原因**：ASP.NET Core Module 未安裝

**解決**：
1. 安裝 **Hosting Bundle**（不是 Runtime！）
2. 執行 `iisreset`

---

### HTTP 500.19 - Internal Server Error

**原因**：web.config 語法錯誤或缺少模組

**解決**：
1. 檢查 web.config 語法
2. 確認已安裝 Hosting Bundle

---

### HTTP 500.31 - Failed to load ASP.NET Core runtime

**原因**：
- 只安裝了 Runtime，沒有安裝 Hosting Bundle
- 獨立部署時 `arguments` 不為空

**解決**：
1. 安裝 **Hosting Bundle**
2. 獨立部署時確認 `arguments=""`

---

### HTTP 503 - Service Unavailable

**原因**：應用程式啟動失敗

**常見原因**：
- `Jwt:SecretKey` 為空或少於 32 字元
- 資料庫連線失敗
- web.config 設定錯誤

**解決**：
1. 檢查 `appsettings.json`
2. 啟用 stdout 日誌：
   ```xml
   stdoutLogEnabled="true"
   ```
3. 建立 logs 資料夾並給予寫入權限
4. 查看日誌：
   ```powershell
   Get-Content "C:\web\MyApp\publish\logs\stdout*.log" -Tail 50
   ```

---

### 啟用詳細日誌

```powershell
# 1. 建立 logs 資料夾
mkdir C:\web\MyApp\publish\logs

# 2. 給予寫入權限
icacls "C:\web\MyApp\publish\logs" /grant "IIS_IUSRS:(OI)(CI)F"

# 3. 確認 web.config 設定 stdoutLogEnabled="true"

# 4. 重新整理網頁後查看日誌
Get-Content "C:\web\MyApp\publish\logs\stdout*.log" -Tail 50
```

---

### 查看 Windows 事件日誌

```powershell
Get-WinEvent -LogName Application -MaxEvents 30 | 
  Where-Object { $_.Message -like "*MyApp*" -or $_.ProviderName -like "*ASP.NET*" } | 
  Format-List TimeCreated, Message
```

---

## 檢查清單

### 伺服器準備

- [ ] 已安裝 **Hosting Bundle**（不是 Runtime）
- [ ] 已執行 `iisreset`
- [ ] 已驗證 `AspNetCoreModuleV2` 模組存在

### 發布檔案

- [ ] 前端已建置 (`npm run build`)
- [ ] 後端已發布 (`dotnet publish`)
- [ ] 前端檔案已複製到 `wwwroot`
- [ ] `logs` 資料夾已建立

### IIS 設定

- [ ] 應用程式集區 `.NET CLR 版本` = **無受控程式碼**
- [ ] 網站實體路徑指向 `publish` 資料夾
- [ ] 資料夾權限已設定 (`IIS_IUSRS` 讀取/寫入)

### 應用程式設定

- [ ] `web.config` 設定正確（根據發布方式）
- [ ] `appsettings.json` 資料庫連線正確
- [ ] `Jwt:SecretKey` 至少 32 字元
- [ ] `stdoutLogEnabled="true"` 已啟用（除錯用）

### 最後步驟

- [ ] 執行 `iisreset`
- [ ] 瀏覽網站測試

---

## 快速指令參考

```powershell
# 框架依賴發布
dotnet publish -c Release -o ./publish

# 獨立部署發布
dotnet publish -c Release -o ./publish --self-contained true -r win-x64

# 重啟 IIS
iisreset

# 停止/啟動應用程式集區
Stop-WebAppPool -Name "MyApp"
Start-WebAppPool -Name "MyApp"

# 查看 stdout 日誌
Get-Content "C:\web\MyApp\publish\logs\stdout*.log" -Tail 50

# 設定資料夾權限
icacls "C:\web\MyApp\publish" /grant "IIS_IUSRS:(OI)(CI)RX" /T
icacls "C:\web\MyApp\publish\logs" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

---

## 參考連結

- [.NET 8.0 下載](https://dotnet.microsoft.com/download/dotnet/8.0)
- [ASP.NET Core IIS 部署文件](https://learn.microsoft.com/aspnet/core/host-and-deploy/iis/)
- [ASP.NET Core Module 設定](https://learn.microsoft.com/aspnet/core/host-and-deploy/aspnet-core-module)

---

*最後更新：2025-01*

