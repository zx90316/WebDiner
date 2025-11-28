from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
import json
from .. import models, schemas, database
from .auth import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

# Use get_db from database module
from ..database import get_db

def check_admin(user: models.User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return user

@router.get("/stats/today")
def get_today_stats(db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    today = date.today()
    orders = db.query(models.Order).filter(models.Order.order_date == today).all()
    
    total_price = 0
    item_counts = {}
    
    for order in orders:
        items = json.loads(order.items)
        for item in items:
            menu_item = db.query(models.MenuItem).get(item['menu_item_id'])
            if menu_item:
                total_price += menu_item.price * item['quantity']
                item_counts[menu_item.name] = item_counts.get(menu_item.name, 0) + item['quantity']
                
    return {
        "date": today,
        "total_orders": len(orders),
        "total_price": total_price,
        "item_counts": item_counts
    }

@router.get("/reminders/missing")
def get_missing_orders(target_date: date = date.today(), db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    # Get all users
    all_users = db.query(models.User).filter(models.User.is_active == True).all() # Assuming is_active exists or filter all
    # Get users who ordered
    ordered_user_ids = db.query(models.Order.user_id).filter(models.Order.order_date == target_date).all()
    ordered_user_ids = [uid[0] for uid in ordered_user_ids]
    
    missing_users = []
    for user in all_users:
        if user.id not in ordered_user_ids:
            missing_users.append({
                "employee_id": user.employee_id,
                "name": user.name,
                "email": user.email
            })
            
    return missing_users

@router.post("/reminders/send")
def send_reminders(target_date: date = date.today(), db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    missing_users = get_missing_orders(target_date, db, current_user)
    
    # Mock sending email
    sent_count = 0
    for user in missing_users:
        print(f"Sending reminder to {user['email']} for date {target_date}")
        sent_count += 1
        
    return {"message": f"Sent reminders to {sent_count} users"}
