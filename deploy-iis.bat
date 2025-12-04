@echo off
chcp 65001
echo.
echo ================================================
echo VSCC-WebDiner IIS 部署腳本
echo ================================================
echo.

:: 設定變數
set PUBLISH_DIR=publish
set FRONTEND_DIR=frontend
set API_DIR=WebDiner.Api

:: 設定 Node.js 跳過平台檢查 (Windows Server 2012 等舊版系統需要)
set NODE_SKIP_PLATFORM_CHECK=1

:: 設定 CI 模式，減少控制台輸出 (避免 EIO 錯誤)
set CI=true

:: 1. 清理舊的發布目錄
echo [1/4] 清理舊的發布目錄...
if exist %PUBLISH_DIR% rmdir /s /q %PUBLISH_DIR%
mkdir %PUBLISH_DIR%

:: 2. 建置前端
echo.
echo [2/4] 建置前端...
cd %FRONTEND_DIR%
call npm install --silent
echo 正在執行 vite build...
call npx vite build --logLevel error
if errorlevel 1 (
    echo 前端建置失敗！
    pause
    exit /b 1
)
cd ..

:: 3. 發布後端 .NET API
echo.
echo [3/4] 發布後端 .NET API...
cd %API_DIR%
dotnet publish -c Release -o ..\%PUBLISH_DIR%
if errorlevel 1 (
    echo 後端發布失敗！
    pause
    exit /b 1
)
cd ..

:: 4. 複製前端檔案到 wwwroot
echo.
echo [4/4] 複製前端檔案到 wwwroot...
if not exist %PUBLISH_DIR%\wwwroot mkdir %PUBLISH_DIR%\wwwroot
xcopy /s /e /y %FRONTEND_DIR%\dist\* %PUBLISH_DIR%\wwwroot\

echo.
echo ================================================
echo 部署完成！
echo ================================================
echo.
echo 發布目錄: %PUBLISH_DIR%
echo.
echo 下一步驟:
echo 1. 將 %PUBLISH_DIR% 目錄的內容複製到 IIS 網站目錄
echo 2. 確認 IIS 已安裝 ASP.NET Core Runtime 8.0
echo 3. 設定 IIS Application Pool 為 "No Managed Code"
echo 4. 設定 appsettings.json 中的資料庫連線字串和 JWT 金鑰
echo.
pause

