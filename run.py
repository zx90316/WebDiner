"""
VSCC-WebDiner 後端伺服器啟動腳本
用於正確啟動 FastAPI 應用程式
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8200,
        reload=True,
        reload_dirs=["app"]
    )
