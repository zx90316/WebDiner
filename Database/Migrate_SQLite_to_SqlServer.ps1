# =============================================
# SQLite 到 SQL Server 資料遷移 PowerShell 腳本
# =============================================
#
# 使用前請先安裝：
# 1. System.Data.SQLite (NuGet 套件或從 https://system.data.sqlite.org 下載)
# 2. SqlServer PowerShell 模組: Install-Module -Name SqlServer
#
# 使用方式：
# .\Migrate_SQLite_to_SqlServer.ps1 -SqlitePath "C:\path\to\webdiner.db" -SqlServerConnection "Server=localhost;Database=WebDiner;Trusted_Connection=True;"
#
# =============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlitePath,
    
    [Parameter(Mandatory=$true)]
    [string]$SqlServerConnection
)

# 載入 SQLite 組件
Add-Type -Path "C:\Program Files\System.Data.SQLite\2015\bin\System.Data.SQLite.dll" -ErrorAction SilentlyContinue

function Get-SqliteData {
    param([string]$Query, [string]$DbPath)
    
    $connectionString = "Data Source=$DbPath;Version=3;"
    $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
    $connection.Open()
    
    $command = $connection.CreateCommand()
    $command.CommandText = $Query
    
    $adapter = New-Object System.Data.SQLite.SQLiteDataAdapter($command)
    $dataset = New-Object System.Data.DataSet
    $adapter.Fill($dataset) | Out-Null
    
    $connection.Close()
    return $dataset.Tables[0]
}

function Insert-SqlServerData {
    param([string]$TableName, [System.Data.DataTable]$Data, [string]$ConnectionString)
    
    $connection = New-Object System.Data.SqlClient.SqlConnection($ConnectionString)
    $connection.Open()
    
    # 啟用 IDENTITY_INSERT
    $identityOnCmd = $connection.CreateCommand()
    $identityOnCmd.CommandText = "SET IDENTITY_INSERT $TableName ON"
    $identityOnCmd.ExecuteNonQuery() | Out-Null
    
    $bulkCopy = New-Object System.Data.SqlClient.SqlBulkCopy($connection)
    $bulkCopy.DestinationTableName = $TableName
    $bulkCopy.BatchSize = 1000
    
    # 映射欄位
    foreach ($column in $Data.Columns) {
        $bulkCopy.ColumnMappings.Add($column.ColumnName, $column.ColumnName) | Out-Null
    }
    
    try {
        $bulkCopy.WriteToServer($Data)
        Write-Host "已遷移 $($Data.Rows.Count) 筆資料到 $TableName" -ForegroundColor Green
    }
    catch {
        Write-Host "遷移 $TableName 時發生錯誤: $_" -ForegroundColor Red
    }
    
    # 關閉 IDENTITY_INSERT
    $identityOffCmd = $connection.CreateCommand()
    $identityOffCmd.CommandText = "SET IDENTITY_INSERT $TableName OFF"
    $identityOffCmd.ExecuteNonQuery() | Out-Null
    
    $connection.Close()
}

Write-Host "開始從 SQLite 遷移到 SQL Server..." -ForegroundColor Cyan
Write-Host "SQLite 路徑: $SqlitePath"
Write-Host "SQL Server 連線: $SqlServerConnection"
Write-Host ""

# 遷移順序（依照外鍵關係）
$tables = @(
    @{ Name = "Divisions"; Query = "SELECT Id, Name, IsActive, DisplayColumn, DisplayOrder FROM divisions" },
    @{ Name = "Departments"; Query = "SELECT Id, Name, IsActive, DivisionId as DivisionId, DisplayColumn, DisplayColumn as DisplayColumn, DisplayOrder as DisplayOrder FROM departments" },
    @{ Name = "Users"; Query = "SELECT Id, EmployeeId as EmployeeId, Name, Extension, Email, HashedPassword as HashedPassword, IsActive as IsActive, IsAdmin as IsAdmin, Role, DepartmentId as DepartmentId, Title, IsDepartmentHead as IsDepartmentHead FROM users" },
    @{ Name = "Vendors"; Query = "SELECT Id, Name, Description, Color, IsActive as IsActive, CreatedAt as CreatedAt FROM vendors" },
    @{ Name = "VendorMenuItems"; Query = "SELECT Id, VendorId as VendorId, Name, Description, Price, Weekday, IsActive as IsActive FROM vendor_menu_items" },
    @{ Name = "MenuItems"; Query = "SELECT Id, Name, Description, Price, Category, IsActive as IsActive FROM menu_items" },
    @{ Name = "Orders"; Query = "SELECT Id, UserId as UserId, VendorId as VendorId, VendorMenuItemId as VendorMenuItemId, OrderDate as OrderDate, CreatedAt as CreatedAt, Status, Items FROM orders" },
    @{ Name = "SpecialDays"; Query = "SELECT Id, Date, IsHoliday as IsHoliday, Description FROM special_days" }
)

foreach ($table in $tables) {
    Write-Host "正在遷移 $($table.Name)..." -ForegroundColor Yellow
    
    try {
        $data = Get-SqliteData -Query $table.Query -DbPath $SqlitePath
        
        if ($data.Rows.Count -gt 0) {
            Insert-SqlServerData -TableName $table.Name -Data $data -ConnectionString $SqlServerConnection
        }
        else {
            Write-Host "$($table.Name) 沒有資料需要遷移" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "遷移 $($table.Name) 時發生錯誤: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "遷移完成！" -ForegroundColor Green
Write-Host "請執行 Migrate_SQLite_to_SqlServer.sql 重設 IDENTITY 種子值" -ForegroundColor Yellow

