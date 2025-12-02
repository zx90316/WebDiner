"""
分機表 API Router

提供動態生成分機表的功能
- 處別依據 display_column 和 display_order 排列
- 部門依據 display_order 排列在其所屬處別下
- 部門內人員排序：主管優先，其次按工號由小到大

結構：處 (Division) → 部 (Department) → 人員 (User)
例如：管理處 → 行政服務部 → 劉國村、黃慧玲...
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc
from typing import List, Dict
from datetime import datetime
from .. import models, schemas
from ..database import get_db
from .auth import get_current_user

router = APIRouter(
    prefix="/extension-directory",
    tags=["extension-directory"]
)


def get_sorted_users(db: Session, department_id: int) -> List[schemas.ExtensionDirectoryUser]:
    """取得部門內排序後的使用者列表"""
    users = db.query(models.User).filter(
        models.User.department_id == department_id,
        models.User.is_active == True
    ).all()
    
    # 排序：主管優先，然後按工號由小到大
    sorted_users = sorted(
        users,
        key=lambda u: (
            not (u.is_department_head or False),  # 主管在前
            u.employee_id or ""  # 工號由小到大
        )
    )
    
    return [
        schemas.ExtensionDirectoryUser(
            employee_id=user.employee_id,
            name=user.name,
            extension=user.extension,
            title=user.title,
            is_department_head=user.is_department_head or False
        )
        for user in sorted_users
    ]


@router.get("/", response_model=schemas.ExtensionDirectory)
def get_extension_directory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    取得完整的分機表資料
    
    回傳結構：
    - columns: 4個欄位（0-3）
    - 每個欄位包含多個處別 (Division)
    - 每個處別包含該欄位中屬於該處別的部門
    - 每個部門包含排序後的使用者列表
    
    關鍵邏輯：
    - 部門的 display_column 決定部門顯示在哪一欄
    - 同一欄內的部門按所屬處別分組
    - 同一處別內的部門按 display_order 排序
    
    例如技術處的部門可能分布在不同欄位：
    - 第2欄：研究企畫一部、研究企畫二部
    - 第3欄：品質查核一部、品質查核二部、基準審查部
    """
    
    # 取得所有啟用的部門，按 display_column 和 display_order 排序
    departments = db.query(models.Department).filter(
        models.Department.is_active == True
    ).order_by(
        asc(models.Department.display_column),
        asc(models.Department.display_order)
    ).all()
    
    # 取得所有處別（用於查詢名稱）
    divisions = db.query(models.Division).filter(
        models.Division.is_active == True
    ).all()
    division_map = {d.id: d for d in divisions}
    
    # 建立 4 個欄位的資料結構
    # 結構：column -> division_id -> list of departments
    columns_dict: Dict[int, Dict[int, List]] = {
        0: {}, 1: {}, 2: {}, 3: {}
    }
    
    for dept in departments:
        col_index = dept.display_column or 0
        div_id = dept.division_id or 0  # 0 表示未分配處別
        
        if col_index not in columns_dict:
            col_index = 0
        
        if div_id not in columns_dict[col_index]:
            columns_dict[col_index][div_id] = []
        
        dept_data = schemas.ExtensionDirectoryDepartment(
            id=dept.id,
            name=dept.name,
            division_id=div_id if div_id else None,
            division_name=division_map[div_id].name if div_id and div_id in division_map else None,
            display_order=dept.display_order or 0,
            users=get_sorted_users(db, dept.id)
        )
        columns_dict[col_index][div_id].append(dept_data)
    
    # 轉換為最終結構
    final_columns: Dict[int, List[schemas.ExtensionDirectoryDivision]] = {
        0: [], 1: [], 2: [], 3: []
    }
    
    for col_index in range(4):
        # 取得該欄的所有處別ID，按處別的 display_order 排序
        div_ids_in_col = list(columns_dict[col_index].keys())
        
        # 排序處別：先按 display_order，未分配處別(0)放最後
        def get_div_order(div_id):
            if div_id == 0:
                return (999, 999)  # 未分配放最後
            div = division_map.get(div_id)
            if div:
                return (div.display_order or 0, div.id)
            return (999, div_id)
        
        div_ids_in_col.sort(key=get_div_order)
        
        for div_id in div_ids_in_col:
            dept_list = columns_dict[col_index][div_id]
            div = division_map.get(div_id) if div_id else None
            
            division_data = schemas.ExtensionDirectoryDivision(
                id=div_id,
                name=div.name if div else "未分類",
                display_column=col_index,
                display_order=div.display_order if div else 999,
                departments=dept_list
            )
            final_columns[col_index].append(division_data)
    
    # 建立回傳結構
    columns = [
        schemas.ExtensionDirectoryColumn(
            column_index=i,
            divisions=final_columns[i]
        )
        for i in range(4)
    ]
    
    return schemas.ExtensionDirectory(
        columns=columns,
        generated_at=datetime.now()
    )


@router.get("/divisions", response_model=List[schemas.Division])
def get_divisions_for_directory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """取得所有處別（含顯示位置資訊），用於管理介面"""
    return db.query(models.Division).filter(
        models.Division.is_active == True
    ).order_by(
        asc(models.Division.display_column),
        asc(models.Division.display_order)
    ).all()


@router.get("/departments", response_model=List[schemas.Department])
def get_departments_for_directory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """取得所有部門（含顯示位置資訊），用於管理介面"""
    return db.query(models.Department).filter(
        models.Department.is_active == True
    ).order_by(
        asc(models.Department.division_id),
        asc(models.Department.display_order)
    ).all()


@router.put("/divisions/{division_id}/position")
def update_division_position(
    division_id: int,
    display_column: int,
    display_order: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    更新處別在分機表中的顯示位置
    
    - division_id: 處別 ID
    - display_column: 欄位索引 (0-3)
    - display_order: 欄內排序順序
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="只有管理員可以修改處別位置")
    
    if display_column < 0 or display_column > 3:
        raise HTTPException(status_code=400, detail="display_column 必須在 0-3 之間")
    
    division = db.query(models.Division).filter(models.Division.id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="處別不存在")
    
    division.display_column = display_column
    division.display_order = display_order
    db.commit()
    db.refresh(division)
    
    return {"message": "處別位置已更新", "division": division.name}


@router.put("/departments/{dept_id}/position")
def update_department_position(
    dept_id: int,
    display_order: int,
    division_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    更新部門在分機表中的顯示位置
    
    - dept_id: 部門 ID
    - display_order: 在處別內的排序順序
    - division_id: (可選) 變更所屬處別
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="只有管理員可以修改部門位置")
    
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="部門不存在")
    
    dept.display_order = display_order
    if division_id is not None:
        dept.division_id = division_id
    
    db.commit()
    db.refresh(dept)
    
    return {"message": "部門位置已更新", "department": dept.name}


@router.put("/divisions/batch-position")
def batch_update_division_positions(
    positions: List[Dict],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    批次更新多個處別的顯示位置
    
    positions: [
        {"id": 1, "display_column": 0, "display_order": 0},
        {"id": 2, "display_column": 0, "display_order": 1},
        ...
    ]
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="只有管理員可以修改處別位置")
    
    updated = 0
    for pos in positions:
        division = db.query(models.Division).filter(
            models.Division.id == pos.get("id")
        ).first()
        
        if division:
            if "display_column" in pos:
                division.display_column = pos["display_column"]
            if "display_order" in pos:
                division.display_order = pos["display_order"]
            updated += 1
    
    db.commit()
    return {"message": f"已更新 {updated} 個處別的位置"}


@router.put("/departments/batch-position")
def batch_update_department_positions(
    positions: List[Dict],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    批次更新多個部門的顯示位置
    
    positions: [
        {"id": 1, "division_id": 1, "display_order": 0},
        {"id": 2, "division_id": 1, "display_order": 1},
        ...
    ]
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="只有管理員可以修改部門位置")
    
    updated = 0
    for pos in positions:
        dept = db.query(models.Department).filter(
            models.Department.id == pos.get("id")
        ).first()
        
        if dept:
            if "division_id" in pos:
                dept.division_id = pos["division_id"]
            if "display_order" in pos:
                dept.display_order = pos["display_order"]
            updated += 1
    
    db.commit()
    return {"message": f"已更新 {updated} 個部門的位置"}


@router.get("/users/{dept_id}", response_model=List[schemas.ExtensionDirectoryUser])
def get_department_users(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """取得指定部門的使用者列表（已排序）"""
    return get_sorted_users(db, dept_id)
