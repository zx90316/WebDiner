from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..routers.auth import get_current_user

router = APIRouter(
    prefix="/vendors",
    tags=["vendors"]
)

def check_admin(user: models.User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return user

@router.get("/", response_model=list[schemas.Vendor])
def get_vendors(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get all vendors"""
    vendors = db.query(models.Vendor).filter(models.Vendor.is_active == True).all()
    return vendors

@router.get("/{vendor_id}", response_model=schemas.Vendor)
def get_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get a specific vendor"""
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.post("/", response_model=schemas.Vendor)
def create_vendor(vendor: schemas.VendorCreate, db: Session = Depends(get_db), admin: models.User = Depends(check_admin)):
    """Create a new vendor (Admin only)"""
    # Check if vendor already exists
    existing = db.query(models.Vendor).filter(models.Vendor.name == vendor.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor already exists")
    
    db_vendor = models.Vendor(**vendor.dict())
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@router.put("/{vendor_id}", response_model=schemas.Vendor)
def update_vendor(vendor_id: int, vendor: schemas.VendorCreate, db: Session = Depends(get_db), admin: models.User = Depends(check_admin)):
    """Update a vendor (Admin only)"""
    db_vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    for key, value in vendor.dict().items():
        setattr(db_vendor, key, value)
    
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db), admin: models.User = Depends(check_admin)):
    """Delete a vendor (Admin only)"""
    db_vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Soft delete
    db_vendor.is_active = False
    db.commit()
    return {"message": "Vendor deleted successfully"}

# Vendor Menu Item endpoints
@router.get("/{vendor_id}/menu", response_model=list[schemas.VendorMenuItem])
def get_vendor_menu(vendor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get all menu items for a vendor"""
    menu_items = db.query(models.VendorMenuItem).filter(
        models.VendorMenuItem.vendor_id == vendor_id,
        models.VendorMenuItem.is_active == True
    ).all()
    return menu_items

@router.post("/{vendor_id}/menu", response_model=schemas.VendorMenuItem)
def create_vendor_menu_item(
    vendor_id: int, 
    menu_item: schemas.VendorMenuItemBase,
    db: Session = Depends(get_db), 
    admin: models.User = Depends(check_admin)
):
    """Create a menu item for a vendor (Admin only)"""
    # Verify vendor exists
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Validate weekday
    if menu_item.weekday is not None and (menu_item.weekday < 0 or menu_item.weekday > 4):
        raise HTTPException(status_code=400, detail="Weekday must be between 0 (Monday) and 4 (Friday), or null for all days")
    
    db_menu_item = models.VendorMenuItem(vendor_id=vendor_id, **menu_item.dict())
    db.add(db_menu_item)
    db.commit()
    db.refresh(db_menu_item)
    return db_menu_item

@router.put("/{vendor_id}/menu/{item_id}", response_model=schemas.VendorMenuItem)
def update_vendor_menu_item(
    vendor_id: int,
    item_id: int,
    menu_item: schemas.VendorMenuItemBase,
    db: Session = Depends(get_db),
    admin: models.User = Depends(check_admin)
):
    """Update a menu item (Admin only)"""
    db_item = db.query(models.VendorMenuItem).filter(
        models.VendorMenuItem.id == item_id,
        models.VendorMenuItem.vendor_id == vendor_id
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Validate weekday
    if menu_item.weekday is not None and (menu_item.weekday < 0 or menu_item.weekday > 4):
        raise HTTPException(status_code=400, detail="Weekday must be between 0 (Monday) and 4 (Friday), or null for all days")
    
    for key, value in menu_item.dict().items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{vendor_id}/menu/{item_id}")
def delete_vendor_menu_item(
    vendor_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(check_admin)
):
    """Delete a menu item (Admin only)"""
    db_item = db.query(models.VendorMenuItem).filter(
        models.VendorMenuItem.id == item_id,
        models.VendorMenuItem.vendor_id == vendor_id
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Soft delete
    db_item.is_active = False
    db.commit()
    return {"message": "Menu item deleted successfully"}

# Get available vendors for a specific date
@router.get("/available/{order_date}", response_model=list[dict])
def get_available_vendors(order_date: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get available vendors and their menu items for a specific date"""
    from datetime import datetime
    
    try:
        date_obj = datetime.strptime(order_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    weekday = date_obj.weekday()  # 0=Monday, 6=Sunday
    
    if weekday >= 5:  # Weekend
        return []
    
    vendors = db.query(models.Vendor).filter(models.Vendor.is_active == True).all()
    result = []
    
    for vendor in vendors:
        # Get menu items for this vendor that are either for all days or for this specific weekday
        menu_items = db.query(models.VendorMenuItem).filter(
            models.VendorMenuItem.vendor_id == vendor.id,
            models.VendorMenuItem.is_active == True,
            (models.VendorMenuItem.weekday == weekday) | (models.VendorMenuItem.weekday == None)
        ).all()
        
        if menu_items:
            result.append({
                "vendor": {
                    "id": vendor.id,
                    "name": vendor.name,
                    "description": vendor.description,
                    "color": vendor.color
                },
                "menu_items": [
                    {
                        "id": item.id,
                        "name": item.name,
                        "description": item.description,
                        "price": item.price
                    } for item in menu_items
                ]
            })
    
    return result
