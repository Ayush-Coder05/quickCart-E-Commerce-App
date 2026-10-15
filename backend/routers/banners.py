from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from config.database import db
from utils.security import require_admin

router = APIRouter(prefix="/api/banners", tags=["banners"])

class BannerCreate(BaseModel):
    id: Optional[str] = None
    title: str
    subtitle: Optional[str] = ""
    imageUrl: Optional[str] = ""
    emoji: Optional[str] = ""
    gradientColors: Optional[List[str]] = []
    order: Optional[int] = 0

import re

@router.get("")
async def get_banners(stateName: Optional[str] = None):
    query = {}
    if stateName:
        regex = re.compile(f"^{re.escape(stateName)}$", re.IGNORECASE)
        query = {
            "$or": [
                {"stateName": regex},
                {"stateName": ""},
                {"stateName": "All"},
                {"stateName": None},
                {"stateName": {"$exists": False}},
            ]
        }
    banners = await db.banners.find(query).sort("order", 1).to_list(100)
    if len(banners) == 0 and stateName:
        banners = await db.banners.find({}).sort("order", 1).to_list(100)

    for b in banners:
        b["_id"] = str(b["_id"])
        if "id" not in b or not b["id"]:
            b["id"] = b["_id"]
    return {"success": True, "banners": banners}

@router.post("")
async def create_banner(banner: BannerCreate, admin: dict = Depends(require_admin)):
    data = banner.dict()
    res = await db.banners.insert_one(data)
    data["_id"] = str(res.inserted_id)
    return {"success": True, "banner": data}

@router.put("/{banner_id}")
async def update_banner(banner_id: str, updates: dict, admin: dict = Depends(require_admin)):
    query = {"id": banner_id}
    if ObjectId.is_valid(banner_id):
        query = {"$or": [{"id": banner_id}, {"_id": ObjectId(banner_id)}]}

    updates.pop("_id", None)
    res = await db.banners.update_one(query, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")

    updated = await db.banners.find_one(query)
    updated["_id"] = str(updated["_id"])
    return {"success": True, "banner": updated}

@router.delete("/{banner_id}")
async def delete_banner(banner_id: str, admin: dict = Depends(require_admin)):
    query = {"id": banner_id}
    if ObjectId.is_valid(banner_id):
        query = {"$or": [{"id": banner_id}, {"_id": ObjectId(banner_id)}]}

    res = await db.banners.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"success": True, "message": "Banner deleted"}
