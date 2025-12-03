-- =============================================
-- VSCC-WebDiner SQL Server 種子資料
-- =============================================

USE WebDiner;
GO

-- =============================================
-- 插入處別資料
-- =============================================
IF NOT EXISTS (SELECT 1 FROM Divisions)
BEGIN
    SET IDENTITY_INSERT Divisions ON;
    
    INSERT INTO Divisions (Id, Name, IsActive, DisplayColumn, DisplayOrder) VALUES
    (1, N'管理處', 1, 0, 0),
    (2, N'技術處', 1, 1, 0),
    (3, N'審驗處', 1, 2, 0);
    
    SET IDENTITY_INSERT Divisions OFF;
    PRINT '處別資料插入完成';
END
GO

-- =============================================
-- 插入部門資料
-- =============================================
IF NOT EXISTS (SELECT 1 FROM Departments)
BEGIN
    SET IDENTITY_INSERT Departments ON;
    
    INSERT INTO Departments (Id, Name, IsActive, DivisionId, DisplayColumn, DisplayOrder) VALUES
    (1, N'行政服務部', 1, 1, 0, 0),
    (2, N'人力資源部', 1, 1, 0, 1),
    (3, N'研究企畫一部', 1, 2, 1, 0),
    (4, N'研究企畫二部', 1, 2, 1, 1),
    (5, N'品質查核部', 1, 3, 2, 0);
    
    SET IDENTITY_INSERT Departments OFF;
    PRINT '部門資料插入完成';
END
GO

-- =============================================
-- 插入使用者資料
-- 密碼: admin123 和 123456 (BCrypt 雜湊)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM Users)
BEGIN
    SET IDENTITY_INSERT Users ON;
    
    -- 注意: 這些密碼雜湊需要在應用程式啟動時由 DbInitializer 生成
    -- 這裡先插入佔位符，實際部署時需要更新
    INSERT INTO Users (Id, EmployeeId, Name, HashedPassword, Role, IsAdmin, DepartmentId, Title, IsDepartmentHead, IsActive) VALUES
    (1, N'admin', N'系統管理員', N'$2a$12$placeholder.hash.for.admin123', N'sysadmin', 1, 1, N'系統管理員', 0, 1),
    (2, N'001', N'張三', N'$2a$12$placeholder.hash.for.123456', N'user', 0, 1, N'專員', 0, 1),
    (3, N'002', N'李四', N'$2a$12$placeholder.hash.for.123456', N'user', 0, 3, N'工程師', 0, 1);
    
    SET IDENTITY_INSERT Users OFF;
    PRINT '使用者資料插入完成（注意：密碼雜湊需要更新）';
END
GO

-- =============================================
-- 插入廠商資料
-- =============================================
IF NOT EXISTS (SELECT 1 FROM Vendors)
BEGIN
    SET IDENTITY_INSERT Vendors ON;
    
    INSERT INTO Vendors (Id, Name, Description, Color, IsActive, CreatedAt) VALUES
    (1, N'便當王', N'各式便當', '#EF4444', 1, GETUTCDATE()),
    (2, N'素食坊', N'健康素食', '#22C55E', 1, GETUTCDATE()),
    (3, N'麵食館', N'各式麵食', '#3B82F6', 1, GETUTCDATE());
    
    SET IDENTITY_INSERT Vendors OFF;
    PRINT '廠商資料插入完成';
END
GO

-- =============================================
-- 插入廠商菜單項目
-- =============================================
IF NOT EXISTS (SELECT 1 FROM VendorMenuItems)
BEGIN
    SET IDENTITY_INSERT VendorMenuItems ON;
    
    INSERT INTO VendorMenuItems (Id, VendorId, Name, Description, Price, Weekday, IsActive) VALUES
    -- 便當王
    (1, 1, N'排骨便當', N'香酥排骨', 80, NULL, 1),
    (2, 1, N'雞腿便當', N'滷雞腿', 85, NULL, 1),
    (3, 1, N'豬排便當', N'日式豬排', 90, 0, 1),  -- 只有週一
    -- 素食坊
    (4, 2, N'素食便當A', N'三菜一主食', 70, NULL, 1),
    (5, 2, N'素食便當B', N'四菜一主食', 80, NULL, 1),
    -- 麵食館
    (6, 3, N'牛肉麵', N'紅燒牛肉麵', 100, NULL, 1),
    (7, 3, N'炸醬麵', N'傳統炸醬麵', 65, NULL, 1),
    (8, 3, N'水餃', N'10顆', 60, NULL, 1);
    
    SET IDENTITY_INSERT VendorMenuItems OFF;
    PRINT '廠商菜單項目插入完成';
END
GO

PRINT '種子資料插入完成！';
GO

