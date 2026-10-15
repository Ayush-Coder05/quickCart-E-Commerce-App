import time
import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any
from bson import ObjectId

from config.database import db, serialize_mongo
from utils.security import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/orders", tags=["orders"])

class OrderItem(BaseModel):
    id: str
    title: str
    quantity: int
    price: float
    imageUrl: Optional[str] = ""

class CreateOrderRequest(BaseModel):
    cartItems: List[OrderItem]
    selectedAddress: dict
    grandTotal: float
    itemTotal: float
    deliveryFee: float
    freeDelivery: Optional[bool] = False
    paymentMethod: Optional[str] = "Cash on Delivery"

class StatusUpdateRequest(BaseModel):
    status: str

@router.post("")
async def create_order(req: CreateOrderRequest, user: dict = Depends(get_current_user)):
    order_id = f"order_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
    estimated_delivery = datetime.now(timezone.utc) + timedelta(minutes=45)

    order_doc = {
        "orderId": order_id,
        "userId": str(user["_id"]),
        "userEmail": user.get("email", ""),
        "items": [item.dict() for item in req.cartItems],
        "total": req.grandTotal,
        "subtotal": req.itemTotal,
        "deliveryCharge": req.deliveryFee,
        "freeDelivery": bool(req.freeDelivery),
        "status": "confirmed",
        "paymentMethod": req.paymentMethod,
        "estimatedDelivery": estimated_delivery,
        "deliveryAddress": req.selectedAddress,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }

    res = await db.orders.insert_one(order_doc)
    order_doc["_id"] = str(res.inserted_id)

    return {
        "success": True,
        "orderId": order_id,
        "order": serialize_mongo(order_doc),
        "estimatedDelivery": estimated_delivery.isoformat(),
    }

@router.get("/stats")
async def get_order_stats(user: dict = Depends(get_current_user_optional)):
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({
        "status": {"$in": ["confirmed", "preparing", "packed", "outForDelivery"]}
    })
    
    delivered_orders = await db.orders.find({"status": "delivered"}).to_list(1000)
    delivered_rev = sum(o.get("total", 0) for o in delivered_orders)

    recent_orders = await db.orders.find().sort("createdAt", -1).limit(10).to_list(10)
    low_stock_items = await db.products.find({"stock": {"$lte": 5}}).limit(10).to_list(10)
    total_users = await db.users.count_documents({})
    available_items = await db.products.count_documents({"availability": "available"})

    return {
        "success": True,
        "stats": {
            "totalUsers": total_users,
            "totalOrders": total_orders,
            "deliveredRev": delivered_rev,
            "availableItems": available_items,
            "pendingOrders": pending_orders,
        },
        "recentOrders": serialize_mongo(recent_orders),
        "lowStockItems": serialize_mongo(low_stock_items),
    }

@router.get("")
async def get_orders(user: dict = Depends(get_current_user_optional)):
    query = {} if (not user or user.get("role") == "admin") else {"userId": str(user["_id"])}
    orders = await db.orders.find(query).sort("createdAt", -1).to_list(200)
    return {"success": True, "orders": serialize_mongo(orders)}

@router.get("/{order_id}")
async def get_order_by_id(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user.get("role") != "admin" and order.get("userId") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    order["_id"] = str(order["_id"])
    return {"success": True, "order": order}

@router.patch("/{order_id}/status")
async def update_order_status(order_id: str, req: StatusUpdateRequest, user: dict = Depends(get_current_user_optional)):
    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user and user.get("role") != "admin":
        if order.get("userId") != str(user.get("_id")):
            raise HTTPException(status_code=403, detail="Forbidden")
        if req.status != "cancelled" or order.get("status") == "delivered":
            raise HTTPException(status_code=400, detail="Cannot modify this order.")

    await db.orders.update_one(
        {"orderId": order_id},
        {"$set": {"status": req.status, "updatedAt": datetime.now(timezone.utc)}}
    )

    updated = await db.orders.find_one({"orderId": order_id})
    return {"success": True, "order": serialize_mongo(updated)}
