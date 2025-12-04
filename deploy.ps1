# WebDiner 部署腳本
# 使用方式: 
#   .\deploy.ps1              - 預設框架依賴版本
#   .\deploy.ps1 -SelfContained  - 獨立部署版本

param(
    [switch]$SelfContained
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = $PSScriptRoot
$frontendPath = Join-Path $projectRoot "frontend"
$apiPath = Join-Path $projectRoot "WebDiner.Api"

if ($SelfContained) {
    $publishPath = Join-Path $projectRoot "publish-selfcontained"
    $deployType = "獨立部署 (含 Runtime)"
} else {
    $publishPath = Join-Path $projectRoot "publish-framework-dependent"
    $deployType = "框架依賴 (不含 Runtime)"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WebDiner 部署腳本" -ForegroundColor Cyan
Write-Host "  模式: $deployType" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

# 1. 建置前端
Write-Host "`n[1/4] 建置前端..." -ForegroundColor Yellow
Set-Location $frontendPath

if (-not (Test-Path "node_modules")) {
    Write-Host "安裝 npm 依賴..." -ForegroundColor Gray
    npm install
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "前端建置失敗!" -ForegroundColor Red
    exit 1
}
Write-Host "前端建置完成!" -ForegroundColor Green

# 2. 發布後端
Write-Host "`n[2/4] 發布後端..." -ForegroundColor Yellow
Set-Location $apiPath

if ($SelfContained) {
    dotnet publish -c Release -o $publishPath --self-contained true -r win-x64
} else {
    dotnet publish -c Release -o $publishPath
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "後端發布失敗!" -ForegroundColor Red
    exit 1
}
Write-Host "後端發布完成!" -ForegroundColor Green

# 3. 複製前端到 wwwroot
Write-Host "`n[3/4] 複製前端檔案..." -ForegroundColor Yellow
$wwwrootPath = Join-Path $publishPath "wwwroot"
$distPath = Join-Path $frontendPath "dist"

if (-not (Test-Path $wwwrootPath)) {
    New-Item -ItemType Directory -Path $wwwrootPath | Out-Null
}

Copy-Item -Path "$distPath\*" -Destination $wwwrootPath -Recurse -Force
Write-Host "前端檔案複製完成!" -ForegroundColor Green

# 4. 建立 logs 資料夾 + 修正 web.config
Write-Host "`n[4/4] 設定檔案..." -ForegroundColor Yellow

$logsPath = Join-Path $publishPath "logs"
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath | Out-Null
}

# 修正 web.config
$webConfigPath = Join-Path $publishPath "web.config"
if (Test-Path $webConfigPath) {
    $webConfig = Get-Content $webConfigPath -Raw
    if ($SelfContained) {
        # 獨立部署: processPath=exe, arguments=空
        $webConfig = $webConfig -replace 'processPath="[^"]*"', 'processPath=".\WebDiner.Api.exe"'
        $webConfig = $webConfig -replace 'arguments="[^"]*"', 'arguments=""'
    }
    Set-Content $webConfigPath -Value $webConfig -Encoding UTF8
}

Write-Host "設定完成!" -ForegroundColor Green

# 計算大小
$size = Get-ChildItem $publishPath -Recurse | Measure-Object -Property Length -Sum
$sizeMB = [math]::Round($size.Sum / 1MB, 2)

# 完成
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  發布完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n輸出資料夾: $publishPath" -ForegroundColor White
Write-Host "總大小: $sizeMB MB" -ForegroundColor White

Write-Host "`n下一步:" -ForegroundColor Yellow
Write-Host "1. 將資料夾內容複製到伺服器" -ForegroundColor White
Write-Host "2. 編輯 appsettings.json (資料庫連線、JWT SecretKey)" -ForegroundColor White

if (-not $SelfContained) {
    Write-Host "3. 確認伺服器已安裝 .NET 8.0 Hosting Bundle" -ForegroundColor Red
}

Write-Host "4. IIS 應用程式集區設為「無受控程式碼」" -ForegroundColor White
Write-Host "5. 執行 iisreset" -ForegroundColor White

Set-Location $projectRoot

