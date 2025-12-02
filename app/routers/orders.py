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

def is_holiday_or_weekend(order_date: date, db: Session):
    # Check SpecialDay first
    special_day = db.query(models.SpecialDay).filter(models.SpecialDay.date == order_date).first()
    if special_day:
        return special_day.is_holiday

    # Weekend check (5=Saturday, 6=Sunday)
    if order_date.weekday() >= 5:
        return True
    return False

def check_cutoff(order_date: date):
    now = datetime.now()
    today = now.date()
    
    if order_date < today:
        raise HTTPException(status_code=400, detail="Cannot order for past dates")
    
    if order_date == today:
        if now.time() > CUTOFF_TIME:
            raise HTTPException(status_code=400, detail="Order cut-off time (9:00 AM) has passed for today")

@router.get("/special_days", response_model=List[schemas.SpecialDay])
def get_public_special_days(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.SpecialDay).all()

@router.post("/", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create a new order"""
    # 1. Check Holiday/Weekend
    if is_holiday_or_weekend(order.order_date, db):
        raise HTTPException(status_code=400, detail="Cannot order on weekends or holidays")

    # 2. Check Cut-off time
    check_cutoff(order.order_date)
    
    # 3. Verify vendor exists
    if not order.is_no_order:
        if not order.vendor_id:
             raise HTTPException(status_code=400, detail="Vendor ID required for normal orders")
             
        vendor = db.query(models.Vendor).filter(models.Vendor.id == order.vendor_id).first()
        if not vendor or not vendor.is_active:
            raise HTTPException(status_code=404, detail="Vendor not found or inactive")
        
        # 4. Verify menu item exists and belongs to vendor
        if not order.vendor_menu_item_id:
             raise HTTPException(status_code=400, detail="Menu Item ID required for normal orders")

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
        vendor_id=None if order.is_no_order else order.vendor_id,
        vendor_menu_item_id=None if order.is_no_order else order.vendor_menu_item_id,
        order_date=order.order_date,
        status="NoOrder" if order.is_no_order else "Pending"
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.post("/batch", response_model=List[schemas.Order])
def create_batch_orders(batch: schemas.OrderBatchCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create multiple orders at once (Optimized)"""
    if not batch.orders:
        return []

    # 1. Collect IDs and Dates
    dates = {o.order_date for o in batch.orders}
    vendor_ids = {o.vendor_id for o in batch.orders if o.vendor_id}
    menu_item_ids = {o.vendor_menu_item_id for o in batch.orders if o.vendor_menu_item_id}
    
    # 2. Prefetch Data
    # Existing orders
    existing_orders = db.query(models.Order).filter(
        models.Order.user_id == current_user.id,
        models.Order.order_date.in_(dates)
    ).all()
    existing_dates = {o.order_date for o in existing_orders}
    
    # Vendors
    vendors = db.query(models.Vendor).filter(models.Vendor.id.in_(vendor_ids)).all()
    vendor_map = {v.id: v for v in vendors}
    
    # Menu Items
    menu_items = db.query(models.VendorMenuItem).filter(models.VendorMenuItem.id.in_(menu_item_ids)).all()
    menu_item_map = {m.id: m for m in menu_items}
    
    created_orders = []
    
    for order_data in batch.orders:
        # Skip if order exists
        if order_data.order_date in existing_dates:
            continue
            
        # Basic validation
        if is_holiday_or_weekend(order_data.order_date, db):
            continue
            
        try:
            check_cutoff(order_data.order_date)
        except HTTPException:
            continue
            
        # Verify vendor/item if not "No Order"
        if not order_data.is_no_order:
            if not order_data.vendor_id or not order_data.vendor_menu_item_id:
                continue
                
            vendor = vendor_map.get(order_data.vendor_id)
            if not vendor or not vendor.is_active:
                continue
                
            menu_item = menu_item_map.get(order_data.vendor_menu_item_id)
            if not menu_item or not menu_item.is_active:
                continue
                
            if menu_item.vendor_id != order_data.vendor_id:
                continue
                
            # Check weekday availability
            weekday = order_data.order_date.weekday()
            if menu_item.weekday is not None and menu_item.weekday != weekday:
                continue
        
        # Create order object
        db_order = models.Order(
            user_id=current_user.id,
            vendor_id=None if order_data.is_no_order else order_data.vendor_id,
            vendor_menu_item_id=None if order_data.is_no_order else order_data.vendor_menu_item_id,
            order_date=order_data.order_date,
            status="NoOrder" if order_data.is_no_order else "Pending"
        )
        db.add(db_order)
        created_orders.append(db_order)
    
    if created_orders:
        try:
            db.commit()
            for order in created_orders:
                db.refresh(order)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return created_orders

@router.get("/", response_model=List[schemas.OrderWithDetails])
def read_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get all orders for current user"""
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()
    
    result = []
    for order in orders:
        vendor = None
        menu_item = None
        
        if order.vendor_id:
            vendor = db.query(models.Vendor).filter(models.Vendor.id == order.vendor_id).first()
        
        if order.vendor_menu_item_id:
            menu_item = db.query(models.VendorMenuItem).filter(models.VendorMenuItem.id == order.vendor_menu_item_id).first()
        
        order_dict = {
            "id": order.id,
            "user_id": order.user_id,
            "vendor_id": order.vendor_id,
            "vendor_menu_item_id": order.vendor_menu_item_id,
            "order_date": order.order_date,
            "created_at": order.created_at,
            "status": order.status,
            "vendor_name": vendor.name if vendor else ("不訂餐" if order.status == "NoOrder" else None),
            "vendor_color": vendor.color if vendor else None,
            "menu_item_name": menu_item.name if menu_item else ("不訂餐" if order.status == "NoOrder" else None),
            "menu_item_description": menu_item.description if menu_item else None,
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
