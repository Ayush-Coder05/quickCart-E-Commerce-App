import re
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId

from config.database import db
from utils.security import require_admin

router = APIRouter(prefix="/api/products", tags=["products"])

class ProductCreate(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    price: float
    categoryId: str
    categoryName: Optional[str] = ""
    stateName: Optional[str] = ""
    stateId: Optional[str] = ""
    city: Optional[str] = ""
    tags: Optional[list] = []
    rating: Optional[float] = 4.5
    label: Optional[str] = ""
    availability: Optional[str] = "available"
    imageUrl: Optional[str] = ""
    emoji: Optional[str] = "Bag"
    stock: Optional[int] = 50

@router.get("")
async def get_products(
    stateName: Optional[str] = None,
    stateId: Optional[str] = None,
    city: Optional[str] = None,
    categoryId: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100
):
    conditions = []

    if stateName:
        regex = re.compile(f"^{re.escape(stateName.strip())}$", re.IGNORECASE)
        conditions.append({
            "$or": [
                {"stateName": regex},
                {"stateName": ""},
                {"stateName": "All"},
                {"stateName": None},
                {"stateName": {"$exists": False}}
            ]
        })
    elif stateId:
        regex = re.compile(f"^{re.escape(stateId.strip())}$", re.IGNORECASE)
        conditions.append({
            "$or": [
                {"stateId": regex},
                {"stateId": ""},
                {"stateId": "all"},
                {"stateId": None},
                {"stateId": {"$exists": False}}
            ]
        })

    if city:
        conditions.append({"city": re.compile(f"^{re.escape(city.strip())}$", re.IGNORECASE)})

    if categoryId and categoryId.lower() != "all":
        conditions.append({"categoryId": categoryId})

    if search:
        s_regex = re.compile(re.escape(search), re.IGNORECASE)
        conditions.append({
            "$or": [
                {"title": s_regex},
                {"description": s_regex},
                {"tags": s_regex},
                {"categoryName": s_regex}
            ]
        })

    query = {"$and": conditions} if conditions else {}

    cursor = db.products.find(query).limit(limit)
    products = await cursor.to_list(length=limit)

    # Fallback if state filter returned 0 products: return all products
    if len(products) == 0 and stateName:
        fb_query = {}
        if search:
            s_regex = re.compile(re.escape(search), re.IGNORECASE)
            fb_query = {"$or": [{"title": s_regex}, {"description": s_regex}]}
        products = await db.products.find(fb_query).limit(limit).to_list(length=limit)

    for p in products:
        p["_id"] = str(p["_id"])
        if "id" not in p or not p["id"]:
            p["id"] = p["_id"]

    return {"success": True, "products": products}

@router.get("/{product_id}")
async def get_product_by_id(product_id: str):
    query = {"id": product_id}
    if ObjectId.is_valid(product_id):
        query = {"$or": [{"id": product_id}, {"_id": ObjectId(product_id)}]}

    product = await db.products.find_one(query)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product["_id"] = str(product["_id"])
    if "id" not in product:
        product["id"] = product["_id"]
    return {"success": True, "product": product}

@router.post("")
async def create_product(product: ProductCreate, admin: dict = Depends(require_admin)):
    data = product.dict()
    if not data.get("id"):
        data["id"] = f"prod_{int(time.time() * 1000)}"

    result = await db.products.insert_one(data)
    data["_id"] = str(result.inserted_id)
    return {"success": True, "product": data}

@router.put("/{product_id}")
async def update_product(product_id: str, updates: dict, admin: dict = Depends(require_admin)):
    query = {"id": product_id}
    if ObjectId.is_valid(product_id):
        query = {"$or": [{"id": product_id}, {"_id": ObjectId(product_id)}]}

    updates.pop("_id", None)
    result = await db.products.update_one(query, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    updated = await db.products.find_one(query)
    updated["_id"] = str(updated["_id"])
    return {"success": True, "product": updated}

@router.delete("/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(require_admin)):
    query = {"id": product_id}
    if ObjectId.is_valid(product_id):
        query = {"$or": [{"id": product_id}, {"_id": ObjectId(product_id)}]}

    result = await db.products.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product deleted successfully"}
