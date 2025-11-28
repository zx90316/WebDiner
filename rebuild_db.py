"""
重建資料庫腳本
刪除舊資料庫並根據最新的模型重新建立
"""
import os
from app.database import engine, Base
from app import models

# 資料庫檔案路徑
db_files = ['webdiner.db', 'test.db']

# 刪除舊資料庫檔案
for db_file in db_files:
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
            print(f"✓ 已刪除 {db_file}")
        except Exception as e:
            print(f"✗ 無法刪除 {db_file}: {e}")
    else:
        print(f"- {db_file} 不存在")

# 重新建立所有資料表
print("\n正在建立資料表...")
Base.metadata.create_all(bind=engine)
print("✓ 資料表建立完成!")

# 顯示建立的資料表和欄位
print("\n=== 資料表結構 ===")
for table_name, table in Base.metadata.tables.items():
    print(f"\n{table_name}:")
    for column in table.columns:
        print(f"  - {column.name}: {column.type}")
