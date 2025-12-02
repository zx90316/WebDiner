@echo off
cd frontend 
set NODE_SKIP_PLATFORM_CHECK=1

echo 正在安裝依賴套件 (npm install)...
call npm install

echo 正在啟動開發伺服器 (npm run dev)...
npm run dev