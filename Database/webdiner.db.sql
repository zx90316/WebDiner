BEGIN TRANSACTION;

-- 必須先創建 'divisions'，因為 'departments' 依賴它
CREATE TABLE divisions (
	id INT PRIMARY KEY IDENTITY(1,1),
	name NVARCHAR(255) NOT NULL UNIQUE, -- 假設長度為 255
	is_active BIT DEFAULT 1,
	display_column INT DEFAULT 0,
	display_order INT DEFAULT 0
);

---------------------------------------------------

CREATE TABLE departments (
	id INT PRIMARY KEY IDENTITY(1,1),
	name NVARCHAR(255) UNIQUE, -- 假設長度為 255
	is_active BIT DEFAULT 1,
	division_id INT,
	display_column INT DEFAULT 0,
	display_order INT DEFAULT 0,
	FOREIGN KEY (division_id) REFERENCES divisions(id)
);

---------------------------------------------------

CREATE TABLE vendors (
	id INT PRIMARY KEY IDENTITY(1,1),
	name NVARCHAR(255),
	description NVARCHAR(MAX), -- 描述欄位通常使用較大長度
	is_active BIT,
	created_at DATETIME,
	color VARCHAR(50) DEFAULT '#3B82F6' -- 顏色代碼，使用 VARCHAR
);

---------------------------------------------------

-- 必須先創建 'vendors'，因為 'vendor_menu_items' 依賴它
CREATE TABLE vendor_menu_items (
	id INT PRIMARY KEY IDENTITY(1,1),
	vendor_id INT,
	name NVARCHAR(255),
	description NVARCHAR(MAX),
	price INT,
	weekday INT,
	is_active BIT,
	FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

---------------------------------------------------

-- 必須先創建 'departments'，因為 'users' 依賴它
CREATE TABLE users (
	id INT PRIMARY KEY IDENTITY(1,1),
	employee_id VARCHAR(50) NOT NULL UNIQUE, -- 員工 ID 通常使用非 Unicode 且有固定長度
	name NVARCHAR(255),
	extension VARCHAR(50),
	email VARCHAR(255),
	hashed_password VARCHAR(255),
	is_active BIT DEFAULT 1,
	is_admin BIT DEFAULT 0,
	role VARCHAR(50) DEFAULT 'user',
	department_id INT,
	title NVARCHAR(255),
	is_department_head BIT DEFAULT 0,
	FOREIGN KEY (department_id) REFERENCES departments(id)
);

---------------------------------------------------

-- 必須先創建 'users', 'vendors', 'vendor_menu_items'，因為 'orders' 依賴它們
CREATE TABLE orders (
	id INT PRIMARY KEY IDENTITY(1,1),
	user_id INT,
	vendor_id INT,
	vendor_menu_item_id INT,
	order_date DATE,
	created_at DATETIME,
	status VARCHAR(50),
	items NVARCHAR(MAX), -- 假定 'items' 可能是 JSON 或逗號分隔的列表
	FOREIGN KEY (user_id) REFERENCES users(id),
	FOREIGN KEY (vendor_id) REFERENCES vendors(id),
	FOREIGN KEY (vendor_menu_item_id) REFERENCES vendor_menu_items(id)
);

---------------------------------------------------

CREATE TABLE menu_items (
	id INT PRIMARY KEY IDENTITY(1,1),
	name NVARCHAR(255),
	description NVARCHAR(MAX),
	price INT,
	category NVARCHAR(255),
	is_active BIT
);

---------------------------------------------------

CREATE TABLE special_days (
	id INT PRIMARY KEY IDENTITY(1,1),
	date DATE,
	is_holiday BIT,
	description NVARCHAR(MAX)
);

CREATE UNIQUE INDEX ix_divisions_name ON divisions (name);

-- 'id' 欄位通常是主鍵，已有索引。
-- 為 'name' 創建索引，有助於按名稱搜索。
CREATE INDEX ix_menu_items_name ON menu_items (name);

-- 'id' 欄位通常是主鍵，已有索引。
-- 為 'order_date' 創建索引，有助於按日期過濾和排序。
CREATE INDEX ix_orders_order_date ON orders (order_date);

-- 'id' 欄位通常是主鍵，已有索引。
-- 為 'date' 創建唯一索引，確保日期不重複。
CREATE UNIQUE INDEX ix_special_days_date ON special_days (date);

-- 為 'email' 創建索引，有助於登錄或搜索用戶。
CREATE INDEX ix_users_email ON users (email);

-- 為 'employee_id' 創建唯一索引 (如果 CREATE TABLE 中沒有 UNIQUE 約束)。
CREATE UNIQUE INDEX ix_users_employee_id ON users (employee_id);

-- 'id' 欄位通常是主鍵，已有索引。
-- 為 'name' 創建唯一索引 (如果 CREATE TABLE 中沒有 UNIQUE 約束)。
CREATE UNIQUE INDEX ix_vendors_name ON vendors (name);

INSERT INTO "divisions" ("name","is_active","display_column","display_order") VALUES 
('車輛安全審驗中心',1,0,0),
 ('稽核室',0,0,1),
 ('品保室',0,0,2),
 ('管理處',1,0,1),
 ('技術處',1,1,0),
 ('審驗處',1,2,0);

INSERT INTO "departments" ("name","is_active","division_id","display_column","display_order") VALUES 
 ('行政服務部',1,4,0,1),
 ('國產車審驗部',1,6,3,0),
 ('進口車審驗部',1,6,3,1),
 ('實車查檢部',1,6,3,2),
 ('品質查核一部',1,5,2,0),
 ('品質查核二部',1,5,2,1),
 ('基準審查部',1,5,2,2),
 ('研究企劃一部',1,5,1,0),
 ('研究企劃二部',1,5,1,1),
 ('車輛安全審驗中心',1,1,0,0),
 ('稽核室',1,1,0,1),
 ('處級主管',1,1,0,2),
 ('品保室',1,1,0,3),
 ('會計室',1,4,0,0);

INSERT INTO "vendor_menu_items" ("vendor_id","name","description","price","weekday","is_active") VALUES 
(1,'葷食便當','',85,NULL,1),
 (2,'素食便當','',85,NULL,1),
 (2,'素食特餐','',85,NULL,1),
 (3,'漢堡','麵包餐',85,0,1),
 (3,'樂活堡','麵包餐',85,1,1),
 (3,'潛艇堡','麵包餐',85,2,1),
 (3,'漢堡','麵包餐',85,3,1),
 (3,'總匯','麵包餐',85,4,1),
 (3,'捲餅','輕食餐',85,0,1),
 (3,'沙拉','輕食餐',85,1,1),
 (3,'蘿蔔糕/煎餃','輕食餐',85,2,1),
 (3,'捲餅','輕食餐',85,3,1),
 (3,'沙拉','輕食餐',85,4,1),
 (3,'鍋燒麵','吃飯/吃麵',85,0,1),
 (3,'撈麵','吃飯/吃麵',85,1,1),
 (3,'咖哩飯','吃飯/吃麵',85,2,1),
 (3,'義大利麵','吃飯/吃麵',85,3,1),
 (3,'炒泡麵','吃飯/吃麵',85,4,1),
 (4,'蒸餃15顆','',85,NULL,1),
 (4,'炸醬','乾麵+湯',85,0,1),
 (4,'雙醬','',85,1,1),
 (4,'炸醬','乾麵+湯',85,2,1),
 (4,'魯肉','乾麵+湯',85,3,1),
 (4,'麻辣','乾麵+湯',85,4,1),
 (4,'牛肉麵','',85,NULL,1),
 (5,'葷食便當','',85,NULL,1)

INSERT INTO "vendors" ("name","description","is_active","created_at","color") VALUES 
 ('綠之葉','',1,'2025-12-03 00:00:00','#03a300'),
 ('有盛素食','',1,'2025-12-03 00:00:00','#002aff'),
 ('番茄村','',1,'2025-12-03 00:00:00','#dd4646'),
 ('元春餃子館','',1,'2025-12-03 00:00:00','#d1ca00'),
 ('𡘙師傅','',1,'2025-12-03 00:00:00','#faab00');

COMMIT;
