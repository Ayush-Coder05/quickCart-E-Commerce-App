from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from config.database import db
from utils.security import require_admin

router = APIRouter(prefix="/api/categories", tags=["categories"])

class CategoryCreate(BaseModel):
    id: Optional[str] = None
    name: str
    icon: Optional[str] = "Cart"
    color: Optional[str] = "#16A34A"
    order: Optional[int] = 0
    isVisible: Optional[bool] = True
    isActive: Optional[bool] = True

@router.get("")
async def get_categories():
    categories = await db.categories.find().sort("order", 1).to_list(100)
    for c in categories:
        c["_id"] = str(c["_id"])
        if "id" not in c or not c["id"]:
            c["id"] = c["_id"]
    return {"success": True, "categories": categories}

@router.post("")
async def create_category(cat: CategoryCreate, admin: dict = Depends(require_admin)):
    data = cat.dict()
    if not data.get("id"):
        data["id"] = f"c_{data['name'].lower().replace(' ', '_')}"
    res = await db.categories.insert_one(data)
    data["_id"] = str(res.inserted_id)
    return {"success": True, "category": data}

@router.put("/{cat_id}")
async def update_category(cat_id: str, updates: dict, admin: dict = Depends(require_admin)):
    query = {"id": cat_id}
    if ObjectId.is_valid(cat_id):
        query = {"$or": [{"id": cat_id}, {"_id": ObjectId(cat_id)}]}

    updates.pop("_id", None)
    res = await db.categories.update_one(query, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    updated = await db.categories.find_one(query)
    updated["_id"] = str(updated["_id"])
    return {"success": True, "category": updated}

@router.delete("/{cat_id}")
async def delete_category(cat_id: str, admin: dict = Depends(require_admin)):
    query = {"id": cat_id}
    if ObjectId.is_valid(cat_id):
        query = {"$or": [{"id": cat_id}, {"_id": ObjectId(cat_id)}]}

    res = await db.categories.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True, "message": "Category deleted"}
