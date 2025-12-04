# WebDiner 獨立部署腳本
# 此腳本會發布包含 .NET Runtime 的獨立應用程式
# 使用方式: .\deploy-selfcontained.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WebDiner 獨立部署腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$projectRoot = $PSScriptRoot
$frontendPath = Join-Path $projectRoot "frontend"
$apiPath = Join-Path $projectRoot "WebDiner.Api"
$publishPath = Join-Path $projectRoot "publish-selfcontained"

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

# 2. 發布後端 (獨立部署)
Write-Host "`n[2/4] 發布後端 (獨立部署)..." -ForegroundColor Yellow
Set-Location $apiPath

dotnet publish -c Release -o $publishPath --self-contained true -r win-x64
if ($LASTEXITCODE -ne 0) {
    Write-Host "後端發布失敗!" -ForegroundColor Red
    exit 1
}
Write-Host "後端發布完成!" -ForegroundColor Green

# 3. 複製前端到 wwwroot
Write-Host "`n[3/4] 複製前端檔案到 wwwroot..." -ForegroundColor Yellow
$wwwrootPath = Join-Path $publishPath "wwwroot"
$distPath = Join-Path $frontendPath "dist"

# 確保 wwwroot 存在
if (-not (Test-Path $wwwrootPath)) {
    New-Item -ItemType Directory -Path $wwwrootPath | Out-Null
}

# 複製前端檔案
Copy-Item -Path "$distPath\*" -Destination $wwwrootPath -Recurse -Force
Write-Host "前端檔案複製完成!" -ForegroundColor Green

# 4. 建立 logs 資料夾
Write-Host "`n[4/4] 建立 logs 資料夾..." -ForegroundColor Yellow
$logsPath = Join-Path $publishPath "logs"
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath | Out-Null
}

# 5. 修正 web.config (確保 arguments 為空)
$webConfigPath = Join-Path $publishPath "web.config"
if (Test-Path $webConfigPath) {
    $webConfig = Get-Content $webConfigPath -Raw
    $webConfig = $webConfig -replace 'arguments="[^"]*"', 'arguments=""'
    Set-Content $webConfigPath -Value $webConfig -Encoding UTF8
    Write-Host "web.config 已修正!" -ForegroundColor Green
}

# 完成
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  發布完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n輸出資料夾: $publishPath" -ForegroundColor White
Write-Host "`n下一步:" -ForegroundColor Yellow
Write-Host "1. 將 '$publishPath' 資料夾內容複製到伺服器" -ForegroundColor White
Write-Host "2. 編輯 appsettings.json 設定資料庫連線和 JWT SecretKey" -ForegroundColor White
Write-Host "3. 確認 IIS 網站指向該資料夾" -ForegroundColor White
Write-Host "4. 確認應用程式集區為「無受控程式碼」" -ForegroundColor White
Write-Host "5. 執行 iisreset" -ForegroundColor White

Set-Location $projectRoot
