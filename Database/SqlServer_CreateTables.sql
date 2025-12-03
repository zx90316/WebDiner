-- =============================================
-- VSCC-WebDiner SQL Server 資料庫建立腳本
-- =============================================

-- 建立資料庫（如果不存在）
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'WebDiner')
BEGIN
    CREATE DATABASE WebDiner;
END
GO

USE WebDiner;
GO

-- =============================================
-- 1. 處別 (Divisions)
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Divisions' AND xtype='U')
BEGIN
    CREATE TABLE Divisions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        DisplayColumn INT NOT NULL DEFAULT 0,
        DisplayOrder INT NOT NULL DEFAULT 0
    );
    
    CREATE UNIQUE INDEX IX_Divisions_Name ON Divisions(Name);
END
GO

-- =============================================
-- 2. 部門 (Departments)
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Departments' AND xtype='U')
BEGIN
    CREATE TABLE Departments (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        DivisionId INT NULL,
        DisplayColumn INT NOT NULL DEFAULT 0,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_Departments_Divisions FOREIGN KEY (DivisionId) 
            REFERENCES Divisions(Id) ON DELETE SET NULL
    );
    
    CREATE UNIQUE INDEX IX_Departments_Name ON Departments(Name);
END
GO

-- =============================================
-- 3. 使用者 (Users)
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId NVARCHAR(50) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        Extension NVARCHAR(20) NULL,
        Email NVARCHAR(200) NULL,
        HashedPassword NVARCHAR(MAX) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        IsAdmin BIT NOT NULL DEFAULT 0,
        Role NVARCHAR(20) NOT NULL DEFAULT 'user',
        DepartmentId INT NULL,
        Title NVARCHAR(50) NULL,
        IsDepartmentHead BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_Users_Departments FOREIGN KEY (DepartmentId) 
            REFERENCES Departments(Id) ON DELETE SET NULL
    );
    
    CREATE UNIQUE INDEX IX_Users_EmployeeId ON Users(EmployeeId);
    CREATE INDEX IX_Users_Email ON Users(Email);
END
GO

-- =============================================
-- 4. 廠商 (Vendors)
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Vendors' AND xtype='U')
BEGIN
    CREATE TABLE Vendors (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        Color NVARCHAR(7) NOT NULL DEFAULT '#3B82F6',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    
    CREATE UNIQUE INDEX IX_Vendors_Name ON Vendors(Name);
END
GO

-- =============================================
-- 5. 廠商菜單項目 (VendorMenuItems)
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VendorMenuItems' AND xtype='U')
BEGIN
    CREATE TABLE VendorMenuItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        VendorId INT NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        Price INT NOT NULL,
        Weekday INT NULL,  -- 0-4 for Mon-Fri, NULL for all days
        IsActive BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_VendorMenuItems_Vendors FOREIGN KEY (VendorId) 
            REFERENCES Vendors(Id) ON DELETE CASCADE
    );
END
GO

-- =============================================
-- 6. 舊版菜單項目 (MenuItems) - 向後相容
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MenuItems' AND xtype='U')
BEGIN
    CREATE TABLE MenuItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        Price INT NOT NULL,
        Category NVARCHAR(50) NULL,
        IsActive BIT NOT NULL DEFAULT 1
    );
    
    CREATE INDEX IX_MenuItems_Name ON MenuItems(Name);
END
GO

-- =============================================
-- 7. 訂單 (Orders)
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Orders' AND xtype='U')
BEGIN
    CREATE TABLE Orders (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        VendorId INT NULL,
        VendorMenuItemId INT NULL,
        OrderDate DATE NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        Items NVARCHAR(MAX) NULL,  -- Legacy: JSON string
        CONSTRAINT FK_Orders_Users FOREIGN KEY (UserId) 
            REFERENCES Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_Orders_Vendors FOREIGN KEY (VendorId) 
            REFERENCES Vendors(Id) ON DELETE SET NULL,
        CONSTRAINT FK_Orders_VendorMenuItems FOREIGN KEY (VendorMenuItemId) 
            REFERENCES VendorMenuItems(Id) ON DELETE SET NULL
    );
    
    CREATE INDEX IX_Orders_OrderDate ON Orders(OrderDate);
    CREATE INDEX IX_Orders_UserId ON Orders(UserId);
END
GO

-- =============================================
-- 8. 特殊日期 (SpecialDays)
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SpecialDays' AND xtype='U')
BEGIN
    CREATE TABLE SpecialDays (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Date DATE NOT NULL,
        IsHoliday BIT NOT NULL DEFAULT 1,
        Description NVARCHAR(200) NULL
    );
    
    CREATE UNIQUE INDEX IX_SpecialDays_Date ON SpecialDays(Date);
END
GO

PRINT '所有資料表建立完成！';
GO

