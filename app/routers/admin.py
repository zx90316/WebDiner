from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, datetime
import json
from .. import models, schemas, database
from .auth import get_current_user, get_password_hash
from ..models import User, Department, Division, Vendor, VendorMenuItem, SpecialDay

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

@router.get("/stats")
def get_stats(date: date = None, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    target_date = date if date else date.today()
    orders = db.query(models.Order).filter(models.Order.order_date == target_date).all()
    
    grand_total_orders = 0
    grand_total_price = 0
    
    # Structure: { vendor_name: { "total_price": 0, "total_count": 0, "items": { item_name: { "count": 0, "price": 0 } } } }
    vendor_stats = {}
    
    for order in orders:
        grand_total_orders += 1
        
        # Handle new style orders (Vendor based)
        if order.vendor_menu_item_id:
            menu_item = db.query(models.VendorMenuItem).get(order.vendor_menu_item_id)
            if menu_item:
                vendor_name = menu_item.vendor.name if menu_item.vendor else "Unknown Vendor"
                price = menu_item.price
                quantity = 1 # Default to 1
                
                grand_total_price += price * quantity
                
                if vendor_name not in vendor_stats:
                    vendor_stats[vendor_name] = {
                        "total_price": 0,
                        "total_count": 0,
                        "items": {}
                    }
                
                vendor_stats[vendor_name]["total_price"] += price * quantity
                vendor_stats[vendor_name]["total_count"] += quantity
                
                if menu_item.name not in vendor_stats[vendor_name]["items"]:
                    vendor_stats[vendor_name]["items"][menu_item.name] = {"count": 0, "price": price, "description": menu_item.description}
                
                vendor_stats[vendor_name]["items"][menu_item.name]["count"] += quantity
        
        # Handle legacy orders with JSON items
        elif order.items:
            try:
                items = json.loads(order.items)
                vendor_name = "Legacy/General"
                
                for item in items:
                    menu_item = db.query(models.MenuItem).get(item['menu_item_id'])
                    if menu_item:
                        price = menu_item.price
                        quantity = item['quantity']
                        
                        grand_total_price += price * quantity
                        
                        if vendor_name not in vendor_stats:
                            vendor_stats[vendor_name] = {
                                "total_price": 0,
                                "total_count": 0,
                                "items": {}
                            }
                        
                        vendor_stats[vendor_name]["total_price"] += price * quantity
                        vendor_stats[vendor_name]["total_count"] += quantity # This counts items, not orders, which is slightly inconsistent but okay for stats
                        
                        if menu_item.name not in vendor_stats[vendor_name]["items"]:
                            vendor_stats[vendor_name]["items"][menu_item.name] = {"count": 0, "price": price}
                        
                        vendor_stats[vendor_name]["items"][menu_item.name]["count"] += quantity
            except (TypeError, json.JSONDecodeError):
                pass

    # Convert to list for frontend
    vendors_list = []
    for v_name, v_data in vendor_stats.items():
        items_list = [
            {
                "name": i_name, 
                "description": i_data.get("description", ""),
                "count": i_data["count"], 
                "subtotal": i_data["count"] * i_data["price"]
            }
            for i_name, i_data in v_data["items"].items()
        ]
        items_list.sort(key=lambda x: x["count"], reverse=True)
        
        vendors_list.append({
            "name": v_name,
            "total_orders": v_data["total_count"], # Note: for legacy this is item count sum
            "total_price": v_data["total_price"],
            "items": items_list
        })
    
    vendors_list.sort(key=lambda x: x["total_price"], reverse=True)

    return {
        "date": target_date,
        "total_orders": grand_total_orders,
        "total_price": grand_total_price,
        "vendors": vendors_list
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

# User Management Endpoints
@router.get("/users", response_model=List[schemas.User])
def get_users(skip: int = 0, limit: int = 200, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    db_user = db.query(models.User).filter(models.User.employee_id == user.employee_id).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Employee ID already registered")
    
    hashed_password = get_password_hash(user.password)
    
    # Role validation: Only sysadmin can create admin/sysadmin
    if user.role in ["admin", "sysadmin"] and current_user.role != "sysadmin":
        raise HTTPException(status_code=403, detail="Only System Admins can create admin users")
        
    # Default role if not provided or if restricted
    if not user.role:
        user.role = "user"
        
    new_user = models.User(
        employee_id=user.employee_id,
        name=user.name,
        extension=user.extension,
        email=user.email,
        department_id=user.department_id,
        hashed_password=hashed_password,
        role=user.role,
        is_admin=(user.role in ["admin", "sysadmin"]), # Keep backward compatibility
        title=user.title,  # 職稱
        is_department_head=user.is_department_head  # 是否為部門主管
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Permission check: Admin cannot modify Admin/SysAdmin
    if current_user.role != "sysadmin" and db_user.role in ["admin", "sysadmin"]:
        raise HTTPException(status_code=403, detail="Admins cannot modify other Admins or System Admins")

    update_data = user_update.dict(exclude_unset=True)
    
    # Role update validation
    if "role" in update_data:
        new_role = update_data["role"]
        if new_role in ["admin", "sysadmin"] and current_user.role != "sysadmin":
             raise HTTPException(status_code=403, detail="Only System Admins can assign admin roles")
        
        # Sync is_admin for backward compatibility
        update_data["is_admin"] = (new_role in ["admin", "sysadmin"])

    if "password" in update_data:
        # Permission check for password update
        # Only System Admin can change other users' passwords via this endpoint
        # Users should use /auth/change-password for their own password
        if current_user.role != "sysadmin":
             raise HTTPException(status_code=403, detail="Only System Admins can reset user passwords")

        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Permission check: Admin cannot delete Admin/SysAdmin
    if current_user.role != "sysadmin" and db_user.role in ["admin", "sysadmin"]:
        raise HTTPException(status_code=403, detail="Admins cannot delete other Admins or System Admins")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted"}

# ========== Division (處別) Management Endpoints ==========

@router.get("/divisions", response_model=List[schemas.Division])
def get_divisions(db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    """取得所有處別列表"""
    return db.query(models.Division).filter(models.Division.is_active == True).order_by(
        models.Division.display_column,
        models.Division.display_order
    ).all()

@router.get("/divisions/{division_id}", response_model=schemas.DivisionWithDepartments)
def get_division_with_departments(division_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    """取得處別及其所屬部門"""
    division = db.query(models.Division).filter(models.Division.id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    
    departments = db.query(models.Department).filter(
        models.Department.division_id == division_id,
        models.Department.is_active == True
    ).order_by(models.Department.display_order).all()
    
    return {
        **division.__dict__,
        "departments": departments
    }

@router.post("/divisions", response_model=schemas.Division)
def create_division(division: schemas.DivisionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    """新增處別"""
    existing = db.query(models.Division).filter(models.Division.name == division.name).first()
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Division already exists")
        # Reactivate if was soft-deleted
        existing.is_active = True
        existing.display_column = division.display_column
        existing.display_order = division.display_order
        db.commit()
        db.refresh(existing)
        return existing
    
    new_division = models.Division(
        name=division.name,
        is_active=True,
        display_column=division.display_column,
        display_order=division.display_order
    )
    db.add(new_division)
    db.commit()
    db.refresh(new_division)
    return new_division

@router.put("/divisions/{division_id}", response_model=schemas.Division)
def update_division(
    division_id: int,
    division_update: schemas.DivisionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_admin)
):
    """更新處別資訊"""
    division = db.query(models.Division).filter(models.Division.id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    
    update_data = division_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(division, key, value)
    
    db.commit()
    db.refresh(division)
    return division

@router.delete("/divisions/{division_id}")
def delete_division(division_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    """刪除處別（軟刪除）"""
    division = db.query(models.Division).filter(models.Division.id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    
    # Check if there are departments under this division
    dept_count = db.query(models.Department).filter(
        models.Department.division_id == division_id,
        models.Department.is_active == True
    ).count()
    
    if dept_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete division with {dept_count} active departments")
    
    division.is_active = False
    db.commit()
    return {"message": "Division deleted"}

# ========== Department (部門) Management Endpoints ==========

@router.get("/departments", response_model=List[schemas.Department])
def get_departments(db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    """取得所有部門列表"""
    return db.query(models.Department).filter(models.Department.is_active == True).all()

@router.get("/departments/by-division/{division_id}", response_model=List[schemas.Department])
def get_departments_by_division(division_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    """取得指定處別下的所有部門"""
    return db.query(models.Department).filter(
        models.Department.division_id == division_id,
        models.Department.is_active == True
    ).order_by(models.Department.display_order).all()

@router.post("/departments", response_model=schemas.Department)
def create_department(dept: schemas.DepartmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    """新增部門"""
    existing = db.query(models.Department).filter(models.Department.name == dept.name).first()
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Department already exists")
        # Reactivate if was soft-deleted
        existing.is_active = True
        existing.division_id = dept.division_id
        existing.display_column = dept.display_column
        existing.display_order = dept.display_order
        db.commit()
        db.refresh(existing)
        return existing
    
    new_dept = models.Department(
        name=dept.name,
        is_active=True,
        division_id=dept.division_id,
        display_column=dept.display_column,
        display_order=dept.display_order
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return new_dept

@router.put("/departments/{dept_id}", response_model=schemas.Department)
def update_department(
    dept_id: int, 
    dept_update: schemas.DepartmentUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(check_admin)
):
    """更新部門資訊（含顯示位置）"""
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = dept_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)
    
    db.commit()
    db.refresh(dept)
    return dept

@router.delete("/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    dept.is_active = False
    db.commit()
    return {"message": "Department deleted"}

# Order Management Endpoints
@router.get("/orders/daily_details")
def get_daily_order_details(date: date = None, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    target_date = date if date else date.today()
    
    # Get all active users
    users = db.query(models.User).filter(models.User.is_active == True).order_by(models.User.employee_id.asc()).all()
    
    # Get all departments for lookup
    departments = db.query(models.Department).all()
    dept_map = {d.id: d.name for d in departments}
    
    # Get all orders for the date
    orders = db.query(models.Order).filter(models.Order.order_date == target_date).all()
    user_orders = {order.user_id: order for order in orders}
    
    result = []
    for user in users:
        order = user_orders.get(user.id)
        order_info = {
            "user_id": user.id,
            "employee_id": user.employee_id,
            "name": user.name,
            "department": dept_map.get(user.department_id) if user.department_id else None,
            "order_id": order.id if order else None,
            "item_name": "未選",
            "vendor_name": "",
            "vendor_color": "",
            "vendor_id": None,
            "item_id": None
        }
        
        if order:
            if order.vendor_menu_item_id:
                menu_item = db.query(models.VendorMenuItem).get(order.vendor_menu_item_id)
                if menu_item:
                    order_info["item_name"] = menu_item.name
                    order_info["vendor_name"] = menu_item.vendor.name
                    order_info["vendor_color"] = menu_item.vendor.color
                    order_info["vendor_id"] = menu_item.vendor.id
                    order_info["item_id"] = menu_item.id
            elif order.items: # Legacy support
                try:
                    items = json.loads(order.items)
                    if items:
                        item_id = items[0]['menu_item_id']
                        menu_item = db.query(models.MenuItem).get(item_id)
                        if menu_item:
                            order_info["item_name"] = menu_item.name
                            order_info["vendor_name"] = "Legacy"
                except:
                    pass
        
        result.append(order_info)
        
    return result

@router.put("/orders/user_order")
def update_user_order(
    order_update: schemas.UserOrderUpdate,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(check_admin)
):
    user_id = order_update.user_id
    order_date = order_update.order_date
    vendor_id = order_update.vendor_id
    item_id = order_update.item_id
    is_cancel = order_update.is_cancel
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check for existing order
    existing_order = db.query(models.Order).filter(
        models.Order.user_id == user_id,
        models.Order.order_date == order_date
    ).first()

    if is_cancel:
        if existing_order:
            db.delete(existing_order)
            db.commit()
        return {"message": "Order cancelled"}

    if not vendor_id or not item_id:
         raise HTTPException(status_code=400, detail="Vendor ID and Item ID required")

    # Verify item exists
    menu_item = db.query(models.VendorMenuItem).filter(
        models.VendorMenuItem.id == item_id,
        models.VendorMenuItem.vendor_id == vendor_id
    ).first()
    
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    if existing_order:
        existing_order.vendor_id = vendor_id
        existing_order.vendor_menu_item_id = item_id
        existing_order.items = None # Clear legacy items
    else:
        new_order = models.Order(
            user_id=user_id,
            vendor_id=vendor_id,
            vendor_menu_item_id=item_id,
            order_date=order_date,
            status="Confirmed"
        )
        db.add(new_order)
    
    db.commit()
    return {"message": "Order updated"}

# --- Special Day Management ---

@router.get("/special_days", response_model=List[schemas.SpecialDay])
def get_special_days(db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    return db.query(SpecialDay).all()

@router.post("/special_days", response_model=schemas.SpecialDay)
def create_special_day(day: schemas.SpecialDayCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    db_day = db.query(SpecialDay).filter(SpecialDay.date == day.date).first()
    if db_day:
        # Update existing
        db_day.is_holiday = day.is_holiday
        db_day.description = day.description
    else:
        # Create new
        db_day = SpecialDay(**day.dict())
        db.add(db_day)
    
    db.commit()
    db.refresh(db_day)
    return db_day

@router.delete("/special_days/{date_str}")
def delete_special_day(date_str: str, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    # Parse date string
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    db_day = db.query(SpecialDay).filter(SpecialDay.date == target_date).first()
    if not db_day:
        raise HTTPException(status_code=404, detail="Special day not found")
    
    db.delete(db_day)
    db.commit()
    return {"message": "Special day deleted"}

# ========== Order Announcement (訂餐公告) ==========

@router.get("/order_announcement")
def get_order_announcement(date: date = None, db: Session = Depends(get_db), current_user: models.User = Depends(check_admin)):
    """
    取得訂餐公告資料 - 以品項為單位，顯示訂購人員
    回傳格式: [{ vendor_name, vendor_color, item_name, item_description, price, orders: [{ employee_id, name }] }]
    """
    from datetime import date as date_type
    target_date = date if date else date_type.today()
    
    # 取得該日期所有訂單
    orders = db.query(models.Order).filter(models.Order.order_date == target_date).all()
    
    # 以 vendor_menu_item_id 為 key 來聚合訂單
    item_orders = {}
    
    for order in orders:
        if not order.vendor_menu_item_id:
            continue  # 跳過舊式訂單
            
        menu_item = db.query(models.VendorMenuItem).get(order.vendor_menu_item_id)
        if not menu_item:
            continue
            
        user = db.query(models.User).get(order.user_id)
        if not user:
            continue
        
        item_key = order.vendor_menu_item_id
        
        if item_key not in item_orders:
            item_orders[item_key] = {
                "vendor_id": menu_item.vendor_id,
                "vendor_name": menu_item.vendor.name if menu_item.vendor else "未知廠商",
                "vendor_color": menu_item.vendor.color if menu_item.vendor else "#6B7280",
                "item_id": menu_item.id,
                "item_name": menu_item.name,
                "item_description": menu_item.description or "",
                "orders": []
            }
        
        item_orders[item_key]["orders"].append({
            "employee_id": user.employee_id,
            "name": user.name
        })
    
    # 轉換為 list 並排序 (依照廠商名稱、品項名稱)
    result = list(item_orders.values())
    result.sort(key=lambda x: (x["vendor_name"], x["item_name"]))
    
    # 每個品項內的訂購人員依工號排序
    for item in result:
        item["orders"].sort(key=lambda x: x["employee_id"])
    
    return {
        "date": target_date,
        "items": result
    }