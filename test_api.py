"""
API 驗證測試腳本
測試註冊和登入功能
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_api():
    print("=== API 驗證測試 ===\n")
    
    # 測試 1: 根端點
    print("1. 測試根端點...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   狀態碼: {response.status_code}")
        print(f"   回應: {response.json()}")
        print("   ✓ 根端點正常\n")
    except Exception as e:
        print(f"   ✗ 錯誤: {e}\n")
        return
    
    # 測試 2: 註冊新用戶
    print("2. 測試用戶註冊...")
    test_user = {
        "employee_id": "TEST001",
        "name": "測試用戶",
        "extension": "1234",
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
        print(f"   狀態碼: {response.status_code}")
        if response.status_code == 200:
            user_data = response.json()
            print(f"   註冊成功!")
            print(f"   用戶資料: {json.dumps(user_data, indent=2, ensure_ascii=False)}")
            print(f"   ✓ 用戶有 is_active 欄位: {'is_active' in user_data}")
            print(f"   ✓ 用戶有 is_admin 欄位: {'is_admin' in user_data}")
        elif response.status_code == 400:
            print(f"   用戶已存在 (這是正常的)")
        print()
    except Exception as e:
        print(f"   ✗ 錯誤: {e}\n")
    
    # 測試 3: 用戶登入
    print("3. 測試用戶登入...")
    login_data = {
        "username": test_user["employee_id"],
        "password": test_user["password"]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"   狀態碼: {response.status_code}")
        if response.status_code == 200:
            token_data = response.json()
            print(f"   登入成功!")
            print(f"   Token: {token_data.get('access_token', '')[:50]}...")
            print(f"   ✓ 登入功能正常")
        else:
            print(f"   回應: {response.json()}")
        print()
    except Exception as e:
        print(f"   ✗ 錯誤: {e}\n")
    
    print("=== 測試完成 ===")

if __name__ == "__main__":
    test_api()
