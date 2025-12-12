-- ============================================
-- 建立 DepartmentItems 表的遷移腳本
-- 用於在分機表中顯示部門下的額外資訊項目
-- ============================================

BEGIN TRANSACTION;

-- 建立 DepartmentItems 表
-- 必須先創建 'departments'，因為 'DepartmentItems' 依賴它
CREATE TABLE DepartmentItems (
    Id INT PRIMARY KEY IDENTITY(1,1),
    DepartmentId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Extension NVARCHAR(20) NULL,
    ItemType NVARCHAR(20) NOT NULL DEFAULT 'text', -- 'room' 或 'text'
    DisplayOrder INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id) ON DELETE CASCADE
);

-- 為 DepartmentId 建立索引，提升查詢效能
CREATE INDEX ix_department_items_DepartmentId ON DepartmentItems (DepartmentId);

-- 為 DisplayOrder 建立索引，提升排序效能
CREATE INDEX ix_department_items_DisplayOrder ON DepartmentItems (DisplayOrder);

-- 為 IsActive 建立索引，過濾啟用項目時更快速
CREATE INDEX ix_department_items_IsActive ON DepartmentItems (IsActive);

COMMIT;

-- ============================================
-- 說明：
-- 1. Id: 主鍵，自動遞增
-- 2. DepartmentId: 外鍵，關聯到 Departments 表
-- 3. Name: 項目名稱（必填，最大長度 100）
-- 4. Extension: 分機號碼（選填，僅用於 room 類型，最大長度 20）
-- 5. ItemType: 項目類型，'room'（會議室/辦公室）或 'text'（純字串），預設 'text'
-- 6. DisplayOrder: 顯示順序，用於同一部門內的排序，預設 0
-- 7. IsActive: 是否啟用，預設 1（啟用）
-- ============================================
