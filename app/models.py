from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    name = Column(String)
    extension = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    orders = relationship("Order", back_populates="user")

# New: Vendor model
class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # 廠商名稱
    description = Column(String)
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
