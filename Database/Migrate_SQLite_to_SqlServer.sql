-- =============================================
-- SQLite 到 SQL Server 資料遷移腳本
-- =============================================
-- 
-- 使用說明：
-- 1. 先執行 SqlServer_CreateTables.sql 建立資料表
-- 2. 使用工具（如 DB Browser for SQLite）匯出 SQLite 資料為 CSV
-- 3. 使用 SQL Server Management Studio 的匯入精靈匯入 CSV
-- 或者使用以下 PowerShell 腳本自動遷移
--
-- =============================================

-- 如果你已經用其他方式匯入了資料，執行以下腳本修正 IDENTITY 欄位

USE WebDiner;
GO

-- 重設 IDENTITY 種子值（在匯入資料後執行）

-- Divisions
DECLARE @maxDivisionId INT;
SELECT @maxDivisionId = ISNULL(MAX(Id), 0) FROM Divisions;
DBCC CHECKIDENT ('Divisions', RESEED, @maxDivisionId);
GO

-- Departments
DECLARE @maxDepartmentId INT;
SELECT @maxDepartmentId = ISNULL(MAX(Id), 0) FROM Departments;
DBCC CHECKIDENT ('Departments', RESEED, @maxDepartmentId);
GO

-- Users
DECLARE @maxUserId INT;
SELECT @maxUserId = ISNULL(MAX(Id), 0) FROM Users;
DBCC CHECKIDENT ('Users', RESEED, @maxUserId);
GO

-- Vendors
DECLARE @maxVendorId INT;
SELECT @maxVendorId = ISNULL(MAX(Id), 0) FROM Vendors;
DBCC CHECKIDENT ('Vendors', RESEED, @maxVendorId);
GO

-- VendorMenuItems
DECLARE @maxVendorMenuItemId INT;
SELECT @maxVendorMenuItemId = ISNULL(MAX(Id), 0) FROM VendorMenuItems;
DBCC CHECKIDENT ('VendorMenuItems', RESEED, @maxVendorMenuItemId);
GO

-- MenuItems
DECLARE @maxMenuItemId INT;
SELECT @maxMenuItemId = ISNULL(MAX(Id), 0) FROM MenuItems;
DBCC CHECKIDENT ('MenuItems', RESEED, @maxMenuItemId);
GO

-- Orders
DECLARE @maxOrderId INT;
SELECT @maxOrderId = ISNULL(MAX(Id), 0) FROM Orders;
DBCC CHECKIDENT ('Orders', RESEED, @maxOrderId);
GO

-- SpecialDays
DECLARE @maxSpecialDayId INT;
SELECT @maxSpecialDayId = ISNULL(MAX(Id), 0) FROM SpecialDays;
DBCC CHECKIDENT ('SpecialDays', RESEED, @maxSpecialDayId);
GO

PRINT 'IDENTITY 種子值已重設！';
GO

