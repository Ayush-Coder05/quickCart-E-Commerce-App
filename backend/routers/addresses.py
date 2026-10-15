from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from config.database import db
from utils.security import get_current_user

router = APIRouter(prefix="/api/addresses", tags=["addresses"])

class AddressModel(BaseModel):
    houseFlat: str
    streetArea: str
    landmark: Optional[str] = ""
    city: str
    state: str
    postalCode: str
    recipientName: str
    phone: str
    label: Optional[str] = "Home"
    notes: Optional[str] = ""
    isDefault: Optional[bool] = False

@router.get("")
async def get_addresses(user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    addresses = await db.addresses.find({"userId": user_id}).sort([("isDefault", -1), ("createdAt", -1)]).to_list(100)
    for a in addresses:
        a["_id"] = str(a["_id"])
        a["id"] = a["_id"]
    return {"success": True, "addresses": addresses}

@router.post("")
async def create_address(addr: AddressModel, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    data = addr.dict()
    data["userId"] = user_id
    data["createdAt"] = datetime.now(timezone.utc)
    data["updatedAt"] = datetime.now(timezone.utc)

    if data.get("isDefault"):
        await db.addresses.update_many({"userId": user_id}, {"$set": {"isDefault": False}})
    else:
        count = await db.addresses.count_documents({"userId": user_id})
        if count == 0:
            data["isDefault"] = True

    res = await db.addresses.insert_one(data)
    data["_id"] = str(res.inserted_id)
    data["id"] = data["_id"]
    return {"success": True, "address": data}

@router.put("/{addr_id}")
async def update_address(addr_id: str, updates: dict, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    query = {"userId": user_id}
    if ObjectId.is_valid(addr_id):
        query["_id"] = ObjectId(addr_id)
    else:
        query["id"] = addr_id

    if updates.get("isDefault"):
        await db.addresses.update_many({"userId": user_id}, {"$set": {"isDefault": False}})

    updates["updatedAt"] = datetime.now(timezone.utc)
    updates.pop("_id", None)

    res = await db.addresses.update_one(query, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")

    updated = await db.addresses.find_one(query)
    updated["_id"] = str(updated["_id"])
    updated["id"] = updated["_id"]
    return {"success": True, "address": updated}

@router.delete("/{addr_id}")
async def delete_address(addr_id: str, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    query = {"userId": user_id}
    if ObjectId.is_valid(addr_id):
        query["_id"] = ObjectId(addr_id)
    else:
        query["id"] = addr_id

    res = await db.addresses.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"success": True, "message": "Address deleted"}
