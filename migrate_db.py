"""
資料庫遷移腳本
為現有的 users 表添加 is_active 和 is_admin 欄位
"""
import sqlite3

db_path = 'webdiner.db'

try:
    # 連接資料庫
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 檢查 users 表的欄位
    cursor.execute("PRAGMA table_info(users)")
    columns = [column[1] for column in cursor.fetchall()]
    print(f"目前欄位: {columns}")
    
    # 添加 is_active 欄位 (如果不存在)
    if 'is_active' not in columns:
        print("\n正在添加 is_active 欄位...")
        cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
        print("✓ is_active 欄位已添加")
    else:
        print("\n- is_active 欄位已存在")
    
    # 添加 is_admin 欄位 (如果不存在)
    if 'is_admin' not in columns:
        print("\n正在添加 is_admin 欄位...")
        cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
        print("✓ is_admin 欄位已添加")
    else:
        print("\n- is_admin 欄位已存在")
    
    # 提交更改
    conn.commit()
    
    # 驗證新的表結構
    print("\n=== 更新後的表結構 ===")
    cursor.execute("PRAGMA table_info(users)")
    for column in cursor.fetchall():
        print(f"  {column[1]}: {column[2]}")
    
    conn.close()
    print("\n✓ 資料庫遷移完成!")
    
except sqlite3.OperationalError as e:
    print(f"✗ 錯誤: {e}")
except Exception as e:
    print(f"✗ 未預期的錯誤: {e}")
