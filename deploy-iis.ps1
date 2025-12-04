# VSCC-WebDiner IIS 部署腳本 (PowerShell)
# 用法: .\deploy-iis.ps1 [-SitePath "C:\inetpub\wwwroot\WebDiner"]

param(
    [string]$SitePath = ".\publish",
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "VSCC-WebDiner IIS 部署腳本" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = $PSScriptRoot
$PublishDir = Join-Path $ProjectRoot "publish"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$ApiDir = Join-Path $ProjectRoot "WebDiner.Api"

# 1. 清理舊的發布目錄
Write-Host "[1/4] 清理舊的發布目錄..." -ForegroundColor Yellow
if (Test-Path $PublishDir) {
    Remove-Item $PublishDir -Recurse -Force
}
New-Item -ItemType Directory -Path $PublishDir | Out-Null

# 2. 建置前端
if (-not $SkipFrontend) {
    Write-Host ""
    Write-Host "[2/4] 建置前端 (npm run build)..." -ForegroundColor Yellow
    
    # 設定 Node.js 跳過平台檢查 (Windows Server 2012 等舊版系統需要)
    $env:NODE_SKIP_PLATFORM_CHECK = "1"
    
    Push-Location $FrontendDir
    try {
        npm install
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "前端建置失敗"
        }
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host ""
    Write-Host "[2/4] 跳過前端建置" -ForegroundColor Gray
}

# 3. 發布後端 .NET API
if (-not $SkipBackend) {
    Write-Host ""
    Write-Host "[3/4] 發布後端 .NET API..." -ForegroundColor Yellow
    Push-Location $ApiDir
    try {
        dotnet publish -c Release -o $PublishDir
        if ($LASTEXITCODE -ne 0) {
            throw "後端發布失敗"
        }
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host ""
    Write-Host "[3/4] 跳過後端發布" -ForegroundColor Gray
}

# 4. 複製前端檔案到 wwwroot
Write-Host ""
Write-Host "[4/4] 複製前端檔案到 wwwroot..." -ForegroundColor Yellow
$WwwrootDir = Join-Path $PublishDir "wwwroot"
if (-not (Test-Path $WwwrootDir)) {
    New-Item -ItemType Directory -Path $WwwrootDir | Out-Null
}
$DistDir = Join-Path $FrontendDir "dist"
Copy-Item -Path "$DistDir\*" -Destination $WwwrootDir -Recurse -Force

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "發布目錄: $PublishDir" -ForegroundColor White
Write-Host ""
Write-Host "下一步驟:" -ForegroundColor Yellow
Write-Host "1. 將 publish 目錄的內容複製到 IIS 網站目錄"
Write-Host "2. 確認 IIS 已安裝 ASP.NET Core Runtime 8.0"
Write-Host "3. 設定 IIS Application Pool 為 'No Managed Code'"
Write-Host "4. 設定 appsettings.json 中的資料庫連線字串和 JWT 金鑰"
Write-Host ""

# 顯示發布目錄內容
Write-Host "發布目錄內容:" -ForegroundColor Yellow
Get-ChildItem $PublishDir | Format-Table Name, Length, LastWriteTime

