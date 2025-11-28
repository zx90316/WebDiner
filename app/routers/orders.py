from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, time, date
import json
from .. import models, schemas, database
from .auth import get_current_user

router = APIRouter(
    prefix="/orders",
    tags=["orders"]
)

# Use get_db from database module
from ..database import get_db

CUTOFF_TIME = time(9, 0) # 9:00 AM

def is_holiday_or_weekend(order_date: date):
    # Weekend check (5=Saturday, 6=Sunday)
    if order_date.weekday() >= 5:
        return True
    # TODO: Add holiday list check here
    return False

def check_cutoff(order_date: date):
    now = datetime.now()
    today = now.date()
    
    if order_date < today:
        raise HTTPException(status_code=400, detail="Cannot order for past dates")
    
    if order_date == today:
        if now.time() > CUTOFF_TIME:
            raise HTTPException(status_code=400, detail="Order cut-off time (9:00 AM) has passed for today")

@router.post("/", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create a new order"""
    # 1. Check Holiday/Weekend
    if is_holiday_or_weekend(order.order_date):
        raise HTTPException(status_code=400, detail="Cannot order on weekends or holidays")

    # 2. Check Cut-off time
    check_cutoff(order.order_date)
    
    # 3. Verify vendor exists
    vendor = db.query(models.Vendor).filter(models.Vendor.id == order.vendor_id).first()
    if not vendor or not vendor.is_active:
        raise HTTPException(status_code=404, detail="Vendor not found or inactive")
    
    # 4. Verify menu item exists and belongs to vendor
    menu_item = db.query(models.VendorMenuItem).filter(
        models.VendorMenuItem.id == order.vendor_menu_item_id,
        models.VendorMenuItem.vendor_id == order.vendor_id
    ).first()
    if not menu_item or not menu_item.is_active:
        raise HTTPException(status_code=404, detail="Menu item not found or inactive")
    
    # 5. Check if menu item is available on this day
    weekday = order.order_date.weekday()
    if menu_item.weekday is not None and menu_item.weekday != weekday:
        raise HTTPException(status_code=400, detail=f"This menu item is not available on {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][weekday]}")
    
    # 6. Check if order already exists for this date
    existing_order = db.query(models.Order).filter(
        models.Order.user_id == current_user.id,
        models.Order.order_date == order.order_date
    ).first()
    if existing_order:
        raise HTTPException(status_code=400, detail="You already have an order for this date")
    
    # 7. Create Order
    db_order = models.Order(
        user_id=current_user.id,
        vendor_id=order.vendor_id,
        vendor_menu_item_id=order.vendor_menu_item_id,
        order_date=order.order_date,
        status="Pending"
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.post("/batch", response_model=List[schemas.Order])
def create_batch_orders(batch: schemas.OrderBatchCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create multiple orders at once"""
    created_orders = []
    
    for order_data in batch.orders:  
        # Check if order already exists for this date
        existing_order = db.query(models.Order).filter(
            models.Order.user_id == current_user.id,
            models.Order.order_date == order_data.order_date
        ).first()
        
        if existing_order:
            continue
        
        # Basic validation (without throwing exceptions for batch)
        if is_holiday_or_weekend(order_data.order_date):
            continue
        
        try:
            check_cutoff(order_data.order_date)
        except HTTPException as e:
            continue
        
        # Verify vendor and menu item
        vendor = db.query(models.Vendor).filter(models.Vendor.id == order_data.vendor_id).first()
        if not vendor or not vendor.is_active:
            continue
        
        menu_item = db.query(models.VendorMenuItem).filter(
            models.VendorMenuItem.id == order_data.vendor_menu_item_id,
            models.VendorMenuItem.vendor_id == order_data.vendor_id
        ).first()
        if not menu_item or not menu_item.is_active:
            continue
        
        # Check weekday availability
        weekday = order_data.order_date.weekday()
        if menu_item.weekday is not None and menu_item.weekday != weekday:
            continue
        
        # Create order
        db_order = models.Order(
            user_id=current_user.id,
            vendor_id=order_data.vendor_id,
            vendor_menu_item_id=order_data.vendor_menu_item_id,
            order_date=order_data.order_date,
            status="Pending"
        )
        db.add(db_order)
        created_orders.append(db_order)
    
    db.commit()
    for order in created_orders:
        db.refresh(order)
    
    return created_orders

@router.get("/", response_model=List[schemas.OrderWithDetails])
def read_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get all orders for current user"""
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()
    
    result = []
    for order in orders:
        vendor = db.query(models.Vendor).filter(models.Vendor.id == order.vendor_id).first()
        menu_item = db.query(models.VendorMenuItem).filter(models.VendorMenuItem.id == order.vendor_menu_item_id).first()
        
        order_dict = {
            "id": order.id,
            "user_id": order.user_id,
            "vendor_id": order.vendor_id,
            "vendor_menu_item_id": order.vendor_menu_item_id,
            "order_date": order.order_date,
            "created_at": order.created_at,
            "status": order.status,
            "vendor_name": vendor.name if vendor else None,
            "menu_item_name": menu_item.name if menu_item else None,
            "menu_item_price": menu_item.price if menu_item else None
        }
        result.append(order_dict)
    
    return result

@router.delete("/{order_id}")
def cancel_order(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Cancel an order"""
    db_order = db.query(models.Order).filter(models.Order.id == order_id, models.Order.user_id == current_user.id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check cancellation cut-off
    check_cutoff(db_order.order_date)
    
    db.delete(db_order)
    db.commit()
    return {"message": "Order cancelled"}
