@echo off
setlocal

:: 設定環境變數
set NODE_SKIP_PLATFORM_CHECK=1
set CI=true

:: 設定目錄
set PUBLISH_DIR=publish
set FRONTEND_DIR=frontend
set API_DIR=WebDiner.Api

:: 清理舊的發布目錄
if exist %PUBLISH_DIR% rmdir /s /q %PUBLISH_DIR%
mkdir %PUBLISH_DIR%

:: 建置前端
cd %FRONTEND_DIR%
call npm install --silent 2>nul
call npx vite build --logLevel error 2>nul
cd ..

:: 發布後端 (嘗試多個可能的 dotnet 路徑)
cd %API_DIR%
if exist "C:\Program Files\dotnet\dotnet.exe" (
    "C:\Program Files\dotnet\dotnet.exe" publish -c Release -o ..\%PUBLISH_DIR% --nologo -v q
) else if exist "%ProgramFiles%\dotnet\dotnet.exe" (
    "%ProgramFiles%\dotnet\dotnet.exe" publish -c Release -o ..\%PUBLISH_DIR% --nologo -v q
) else (
    dotnet publish -c Release -o ..\%PUBLISH_DIR% --nologo -v q
)
cd ..

:: 複製前端檔案到 wwwroot
if not exist %PUBLISH_DIR%\wwwroot mkdir %PUBLISH_DIR%\wwwroot
xcopy /s /e /y /q %FRONTEND_DIR%\dist\* %PUBLISH_DIR%\wwwroot\ >nul

pause
