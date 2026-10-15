from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config.database import db
from utils.security import require_admin

router = APIRouter(prefix="/api/cities", tags=["cities"])

class CityCreate(BaseModel):
    name: str
    state: str
    active: Optional[bool] = True

class CityUpdate(BaseModel):
    name: Optional[str] = None
    state: Optional[str] = None
    active: Optional[bool] = None

@router.get("")
async def get_cities():
    cities = await db.cities.find().sort([("state", 1), ("name", 1)]).to_list(200)
    for c in cities:
        c["_id"] = str(c["_id"])
        c["id"] = c["_id"]
    return {"success": True, "cities": cities}

@router.post("")
async def create_city(req: CityCreate, admin: dict = Depends(require_admin)):
    data = req.dict()
    data["createdAt"] = datetime.now(timezone.utc)
    data["updatedAt"] = datetime.now(timezone.utc)
    res = await db.cities.insert_one(data)
    data["_id"] = str(res.inserted_id)
    data["id"] = data["_id"]
    return {"success": True, "city": data}

@router.put("/{city_id}")
async def update_city(city_id: str, updates: CityUpdate, admin: dict = Depends(require_admin)):
    query = {"_id": ObjectId(city_id)} if ObjectId.is_valid(city_id) else {"_id": city_id}
    data = {k: v for k, v in updates.dict().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    data["updatedAt"] = datetime.now(timezone.utc)
    res = await db.cities.update_one(query, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="City not found")

    city = await db.cities.find_one(query)
    if city:
        city["_id"] = str(city["_id"])
        city["id"] = city["_id"]
    return {"success": True, "city": city}

@router.delete("/{city_id}")
async def delete_city(city_id: str, admin: dict = Depends(require_admin)):
    query = {"_id": ObjectId(city_id)} if ObjectId.is_valid(city_id) else {"_id": city_id}
    res = await db.cities.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    return {"success": True, "message": "City deleted successfully"}
