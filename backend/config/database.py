import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/quickcart")

# Parse DB name from URI or default to quickcart
client = AsyncIOMotorClient(MONGODB_URI)
db_name = "quickcart"
if "/" in MONGODB_URI.split("?")[0]:
    parts = MONGODB_URI.split("?")[0].split("/")
    if parts[-1]:
        db_name = parts[-1]

db = client[db_name]

def get_database():
    return db

def serialize_mongo(obj):
    if isinstance(obj, list):
        return [serialize_mongo(item) for item in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if isinstance(v, (dict, list)):
                out[k] = serialize_mongo(v)
            elif hasattr(v, "__class__") and v.__class__.__name__ == "ObjectId":
                out[k] = str(v)
            elif hasattr(v, "isoformat"):
                out[k] = v.isoformat()
            else:
                out[k] = v
        return out
    if hasattr(obj, "__class__") and obj.__class__.__name__ == "ObjectId":
        return str(obj)
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return obj

