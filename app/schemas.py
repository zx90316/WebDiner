from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

# Auth Schemas
class UserBase(BaseModel):
    employee_id: str
    name: str
    extension: Optional[str] = None
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    employee_id: str
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

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
