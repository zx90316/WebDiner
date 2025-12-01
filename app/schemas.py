from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

# Auth Schemas
class UserBase(BaseModel):
    employee_id: str
    name: str
    extension: Optional[str] = None
    email: Optional[str] = None  # Email 改為非必要

class UserCreate(UserBase):
    password: str
    department_id: Optional[int] = None
    role: Optional[str] = "user"
    title: Optional[str] = None  # 職稱
    is_department_head: bool = False  # 是否為部門主管

class UserUpdate(BaseModel):
    employee_id: Optional[str] = None
    name: Optional[str] = None
    extension: Optional[str] = None
    email: Optional[str] = None
    department_id: Optional[int] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    role: Optional[str] = None
    title: Optional[str] = None  # 職稱
    is_department_head: Optional[bool] = None  # 是否為部門主管

class UserLogin(BaseModel):
    employee_id: str
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    role: Optional[str] = "user"
    department_id: Optional[int] = None
    title: Optional[str] = None  # 職稱
    is_department_head: bool = False  # 是否為部門主管

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

# Division Schemas (處別)
class DivisionBase(BaseModel):
    name: str  # 處別名稱：管理處、技術處、審驗處
    is_active: bool = True
    display_column: int = 0  # 顯示欄位 (0-3)
    display_order: int = 0   # 欄內排序

class DivisionCreate(DivisionBase):
    pass

class DivisionUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    display_column: Optional[int] = None
    display_order: Optional[int] = None

class Division(DivisionBase):
    id: int

    class Config:
        from_attributes = True

# Department Schemas (部門)
class DepartmentBase(BaseModel):
    name: str
    is_active: bool = True
    division_id: Optional[int] = None  # 所屬處別ID
    display_column: int = 0  # 顯示欄位 (0-3)
    display_order: int = 0   # 欄內排序

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    division_id: Optional[int] = None
    display_column: Optional[int] = None
    display_order: Optional[int] = None

class Department(DepartmentBase):
    id: int

    class Config:
        from_attributes = True

class DepartmentWithDivision(Department):
    """部門資訊含處別名稱"""
    division_name: Optional[str] = None

# 處別含部門（需在 Department 定義後）
class DivisionWithDepartments(Division):
    """處別及其下屬部門"""
    departments: List[Department] = []

# 分機表專用 Schema
class ExtensionDirectoryUser(BaseModel):
    """分機表中的使用者資訊"""
    employee_id: str
    name: str
    extension: Optional[str] = None
    title: Optional[str] = None
    is_department_head: bool = False

    class Config:
        from_attributes = True

class ExtensionDirectoryDepartment(BaseModel):
    """分機表中的部門及其成員"""
    id: int
    name: str
    division_id: Optional[int] = None
    division_name: Optional[str] = None
    display_order: int
    users: List[ExtensionDirectoryUser] = []

    class Config:
        from_attributes = True

class ExtensionDirectoryDivision(BaseModel):
    """分機表中的處別及其部門"""
    id: int
    name: str
    display_column: int
    display_order: int
    departments: List[ExtensionDirectoryDepartment] = []

    class Config:
        from_attributes = True

class ExtensionDirectoryColumn(BaseModel):
    """分機表的單一欄"""
    column_index: int
    divisions: List[ExtensionDirectoryDivision] = []

class ExtensionDirectory(BaseModel):
    """完整的分機表結構"""
    columns: List[ExtensionDirectoryColumn] = []
    generated_at: datetime

# Vendor Schemas
class VendorBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    is_active: bool = True

class VendorCreate(VendorBase):
    pass

class Vendor(VendorBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# VendorMenuItem Schemas
class VendorMenuItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: int
    weekday: Optional[int] = None  # 0-4 for Mon-Fri, null for all days
    is_active: bool = True

class VendorMenuItemCreate(VendorMenuItemBase):
    vendor_id: int

class VendorMenuItem(VendorMenuItemBase):
    id: int
    vendor_id: int

    class Config:
        from_attributes = True

# Menu Schemas (Legacy - keep for backward compatibility)
class MenuItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: int
    category: str
    is_active: bool = True

class MenuItemCreate(MenuItemBase):
    pass

class MenuItem(MenuItemBase):
    id: int

    class Config:
        from_attributes = True

# Order Schemas
class OrderItem(BaseModel):
    menu_item_id: int
    quantity: int

class OrderCreate(BaseModel):
    order_date: date
    vendor_id: Optional[int] = None
    vendor_menu_item_id: Optional[int] = None
    is_no_order: bool = False

class OrderBatchCreate(BaseModel):
    """For creating multiple orders at once"""
    orders: List[OrderCreate]

class UserOrderUpdate(BaseModel):
    user_id: int
    order_date: date
    vendor_id: Optional[int] = None
    item_id: Optional[int] = None
    is_cancel: bool = False

class Order(BaseModel):
    id: int
    user_id: int
    vendor_id: Optional[int] = None
    vendor_menu_item_id: Optional[int] = None
    order_date: date
    created_at: datetime
    status: str

    class Config:
        from_attributes = True

class OrderWithDetails(Order):
    """Order with vendor and menu item details"""
    vendor_name: Optional[str] = None
    vendor_color: Optional[str] = None
    menu_item_name: Optional[str] = None
    menu_item_price: Optional[int] = None

# Special Day Schemas
class SpecialDayBase(BaseModel):
    date: date
    is_holiday: bool
    description: Optional[str] = None

class SpecialDayCreate(SpecialDayBase):
    pass

class SpecialDay(SpecialDayBase):
    id: int
    class Config:
        from_attributes = True
