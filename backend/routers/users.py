from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config.database import db
from utils.security import hash_password, require_admin, get_current_user_optional

router = APIRouter(prefix="/api/users", tags=["users"])

class UserCreate(BaseModel):
    fullName: str
    email: str
    password: Optional[str] = "123456"
    mobile: Optional[str] = ""
    role: Optional[str] = "customer"

class UserUpdate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    role: Optional[str] = None

@router.get("")
async def get_users(admin: dict = Depends(get_current_user_optional)):
    users = await db.users.find({}, {"password": 0}).sort("createdAt", -1).to_list(200)
    for u in users:
        u["_id"] = str(u["_id"])
        u["id"] = u["_id"]
    return {"success": True, "users": users}

@router.post("")
async def create_user(req: UserCreate, admin: dict = Depends(require_admin)):
    email = req.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = {
        "fullName": req.fullName.strip(),
        "email": email,
        "password": hash_password(req.password or "123456"),
        "mobile": req.mobile.strip() if req.mobile else "",
        "role": req.role if req.role in ["admin", "customer", "user"] else "customer",
        "pushToken": "",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(new_user)
    new_user["_id"] = str(result.inserted_id)
    new_user["id"] = new_user["_id"]
    new_user.pop("password", None)
    return {"success": True, "user": new_user}

@router.put("/{user_id}")
async def update_user(user_id: str, updates: UserUpdate, admin: dict = Depends(require_admin)):
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    data = {k: v for k, v in updates.dict().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    data["updatedAt"] = datetime.now(timezone.utc)
    res = await db.users.update_one(query, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user = await db.users.find_one(query, {"password": 0})
    if user:
        user["_id"] = str(user["_id"])
        user["id"] = user["_id"]
    return {"success": True, "user": user}

@router.delete("/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    res = await db.users.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "User deleted successfully"}
