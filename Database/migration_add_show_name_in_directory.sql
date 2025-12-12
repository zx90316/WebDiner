-- ============================================
-- 為 Departments 表添加 show_name_in_directory 欄位
-- 用於控制是否在分機表中顯示部門名稱
-- ============================================

BEGIN TRANSACTION;

-- 添加 show_name_in_directory 欄位，預設值為 1（顯示）
ALTER TABLE Departments
ADD show_name_in_directory BIT DEFAULT 1;

-- 更新現有記錄，確保所有現有部門都顯示名稱
UPDATE Departments
SET show_name_in_directory = 1
WHERE show_name_in_directory IS NULL;

COMMIT;

-- ============================================
-- 說明：
-- show_name_in_directory: 是否在分機表中顯示部門名稱
-- 1 = 顯示（預設）
-- 0 = 不顯示
-- ============================================
