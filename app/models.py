from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String, unique=True, index=True)
    name = Column(String)
    extension = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)  # Email 改為非必要
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    role = Column(String, default="user") # user, admin, sysadmin
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # 分機表相關欄位
    title = Column(String, nullable=True)  # 職稱：董事長、執行長、經理、副理、主任等
    is_department_head = Column(Boolean, default=False)  # 是否為部門主管

    orders = relationship("Order", back_populates="user")

class Division(Base):
    """處別模型 - 如：管理處、技術處、審驗處"""
    __tablename__ = "divisions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # 處別名稱
    is_active = Column(Boolean, default=True)
    
    # 分機表顯示位置
    display_column = Column(Integer, default=0)  # 顯示在哪一欄（0-3）
    display_order = Column(Integer, default=0)   # 同一欄內的排序順序
    
    # 關聯
    departments = relationship("Department", back_populates="division")


class Department(Base):
    """部門模型 - 如：行政服務部、研究企畫一部"""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)
    
    # 所屬處別
    division_id = Column(Integer, ForeignKey("divisions.id"), nullable=True)
    
    # 分機表顯示位置相關欄位
    display_column = Column(Integer, default=0)  # 顯示在哪一欄（0-3，共4欄）
    display_order = Column(Integer, default=0)   # 同一欄內的排序順序
    
    # 關聯
    division = relationship("Division", back_populates="departments")

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # 廠商名稱
    description = Column(String)
    color = Column(String, default="#3B82F6")  # 廠商代表色
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    menu_items = relationship("VendorMenuItem", back_populates="vendor")
    orders = relationship("Order", back_populates="vendor")

# New: VendorMenuItem model
class VendorMenuItem(Base):
    __tablename__ = "vendor_menu_items"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    name = Column(String)  # 品項名稱
    description = Column(String)
    price = Column(Integer)  # 價格（元）
    weekday = Column(Integer, nullable=True)  # 0-4 for Mon-Fri, null for all days
    is_active = Column(Boolean, default=True)

    vendor = relationship("Vendor", back_populates="menu_items")

# Keep old MenuItem for backward compatibility (can be removed later)
class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Integer)
    category = Column(String)
    is_active = Column(Boolean, default=True)

# Modified: Order model
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))  # New
    vendor_menu_item_id = Column(Integer, ForeignKey("vendor_menu_items.id"))  # New
    order_date = Column(Date, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Pending")
    items = Column(String, nullable=True)  # Keep for backward compatibility, nullable

    user = relationship("User", back_populates="orders")
    vendor = relationship("Vendor", back_populates="orders")  # New
    menu_item = relationship("VendorMenuItem")  # New

class SpecialDay(Base):
    __tablename__ = "special_days"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True)
    is_holiday = Column(Boolean, default=True)  # True = Holiday, False = Workday (makeup day)
    description = Column(String, nullable=True)

