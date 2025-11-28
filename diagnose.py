"""
快速診斷測試問題的腳本
"""
import sys
from pathlib import Path

# Add project root to sys.path
current_file = Path(__file__).resolve()
project_root = current_file.parent
sys.path.append(str(project_root))

from app.routers.auth import get_password_hash, verify_password

# 測試密碼哈希和驗證
password = "password123"
hashed = get_password_hash(password)

print(f"原始密碼: {password}")
print(f"哈希密碼: {hashed[:50]}...")
print(f"驗證結果: {verify_password(password, hashed)}")

# 測試註冊和登入流程
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# 註冊用戶
print("\n=== 測試註冊 ===")
response = client.post(
    "/auth/register",
    json={"employee_id": "diagnose_user", "name": "Diagnose User", "email": "diagnose@test.com", "password": password}
)
print(f"狀態碼: {response.status_code}")
if response.status_code == 200:
    print(f"註冊成功: {response.json()}")
else:
    print(f"註冊失敗: {response.json()}")

# 登入
print("\n=== 測試登入 ===")
response = client.post(
    "/auth/login",
    data={"username": "diagnose_user", "password": password}
)
print(f"狀態碼: {response.status_code}")
if response.status_code == 200:
    print(f"登入成功!")
    print(f"Token: {response.json()['access_token'][:50]}...")
else:
    print(f"登入失敗: {response.json()}")
