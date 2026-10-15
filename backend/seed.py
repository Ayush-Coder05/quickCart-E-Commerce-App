import os
import re
import bcrypt
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/quickcart")

def normalize_id(val: str) -> str:
    s = val.lower().replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")

def hash_pw(password: str) -> str:
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

# 36 Indian States and Union Territories
INDIAN_STATES = [
    "Andaman & Nicobar Islands",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Dadra & Nagar Haveli and Daman & Diu",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu & Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Ladakh",
    "Lakshadweep",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
]

# Verified high-quality matching picture URLs by item keyword
PICTURE_MAP = {
    "apple": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600",
    "banana": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600",
    "mango": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600",
    "orange": "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600",
    "tomato": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600",
    "potato": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600",
    "onion": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600",
    "spinach": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600",
    "palak": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600",
    "atta": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
    "rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600",
    "oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600",
    "dal": "https://images.unsplash.com/photo-1585994192701-f1a505c8574a?w=600",
    "milk": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600",
    "butter": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600",
    "bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
    "egg": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600",
    "cheese": "https://images.unsplash.com/photo-1624806992066-5ffcf7ca186b?w=600",
    "paneer": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600",
    "curd": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600",
    "doi": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600",
    "ghee": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600",
    "chips": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600",
    "namkeen": "https://images.unsplash.com/photo-1621996346565-e3d5d628169e?w=600",
    "sev": "https://images.unsplash.com/photo-1621996346565-e3d5d628169e?w=600",
    "bakarwadi": "https://images.unsplash.com/photo-1621996346565-e3d5d628169e?w=600",
    "biscuit": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600",
    "cookie": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600",
    "coke": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600",
    "cola": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600",
    "juice": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600",
    "coffee": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600",
    "tea": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600",
    "noodle": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600",
    "maggi": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600",
    "oats": "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600",
    "medicine": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600",
    "tablet": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600",
    "spray": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600",
    "handwash": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600",
    "soap": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600",
    "paste": "https://images.unsplash.com/photo-1559591937-e62fb330bc1f?w=600",
    "shampoo": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600",
    "detergent": "https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600",
    "earphone": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    "battery": "https://images.unsplash.com/photo-1619725002198-6a689b72f41d?w=600",
    "diaper": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600",
    "dog": "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600",
    "cat": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600",
    "sweet": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    "mithai": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    "rasgulla": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    "petha": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    "peda": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    "pak": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    "chilli": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600",
    "chutney": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600",
    "pickle": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600",
    "sauce": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600",
    "masala": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600",
    "spices": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600",
    "parotta": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600",
    "biryani": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600",
    "cashew": "https://images.unsplash.com/photo-1508061252224-43775270e0a1?w=600",
    "almond": "https://images.unsplash.com/photo-1508061252224-43775270e0a1?w=600",
    "walnut": "https://images.unsplash.com/photo-1508061252224-43775270e0a1?w=600",
    "honey": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600",
    "saffron": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    "energy": "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600",
    "default": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600"
}

def get_picture_for_name(name: str) -> str:
    lower = name.lower()
    for key, url in PICTURE_MAP.items():
        if key in lower:
            return url
    return PICTURE_MAP["default"]

# Regional specialties for major Indian states
STATE_SPECIALTIES = {
    "Maharashtra": [
        {"title": "Ratnagiri Alphonso Hapus Mangoes", "categoryId": "c_fruits_veg", "categoryName": "Fresh Fruits & Veggies", "price": 499, "label": "1 Dozen", "emoji": "🥭", "desc": "Authentic GI-tagged sweet Alphonso mangoes from Devgad orchards."},
        {"title": "Chitale Bandhu Pune Bakarwadi", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 95, "label": "250g", "emoji": "🥨", "desc": "Famous crispy spiral snack with sweet-spicy coconut stuffing."},
        {"title": "Mumbai Vada Pav Special Lasun Chutney", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 45, "label": "100g", "emoji": "🌶️", "desc": "Spicy dry garlic coconut chutney for authentic street taste."},
        {"title": "Nagpur Fresh Juicy Sweet Oranges", "categoryId": "c_fruits_veg", "categoryName": "Fresh Fruits & Veggies", "price": 75, "label": "1 kg", "emoji": "🍊", "desc": "Vitamin C rich, freshly plucked Nagpur santra oranges."},
    ],
    "Delhi": [
        {"title": "Delhi Special Chole Bhature Khada Masala", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 65, "label": "100g", "emoji": "🍲", "desc": "Traditional spicy Old Delhi blend for authentic dark chole curry."},
        {"title": "Bikanervala Pure Kaju Katli Sweet Box", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 320, "label": "250g", "emoji": "🍬", "desc": "Made with 100% pure premium cashews and silver vark."},
        {"title": "Mother Dairy Classic Full Cream Milk", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 68, "label": "1 L", "emoji": "🥛", "desc": "Creamy rich pasteurized milk, the staple of Delhi homes."},
        {"title": "Murthal Style Desi White Butter", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 140, "label": "200g", "emoji": "🧈", "desc": "Fresh unsalted white butter, perfect over hot paranthas."},
    ],
    "Karnataka": [
        {"title": "Coorg Arabica Pure Filter Coffee Powder", "categoryId": "c_beverages", "categoryName": "Cold Drinks & Juices", "price": 195, "label": "250g", "emoji": "☕", "desc": "80:20 plantation roast coffee blend with rich aromatic chicory."},
        {"title": "Mysore Special Royal Melt Ghee Mysore Pak", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 240, "label": "250g", "emoji": "🍮", "desc": "Silky gram flour dessert drenched in pure desi ghee."},
        {"title": "Nandini Toned Fresh Milk Pouch", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 42, "label": "1 L", "emoji": "🥛", "desc": "Karnataka's beloved fresh dairy milk sourced directly from farmers."},
        {"title": "Byadgi Whole Mild Wrinkled Red Chillies", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 120, "label": "200g", "emoji": "🌶️", "desc": "Famous Karnataka chillies known for deep red color and gentle heat."},
    ],
    "Tamil Nadu": [
        {"title": "Chennai Degree Strong Filter Coffee Decoction", "categoryId": "c_beverages", "categoryName": "Cold Drinks & Juices", "price": 120, "label": "200ml", "emoji": "☕", "desc": "Authentic ready-to-use strong south Indian coffee decoction."},
        {"title": "Aachi Chettinad Kulambu Masala", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 55, "label": "100g", "emoji": "🍛", "desc": "Aromatic Tamil Chettinad spice blend for flavorful curries."},
        {"title": "ID Fresh Traditional Idli & Dosa Batter", "categoryId": "c_instant", "categoryName": "Instant & Packaged Food", "price": 85, "label": "1 kg Pouch", "emoji": "🥞", "desc": "Naturally fermented stone-ground batter for soft fluffy idlis."},
        {"title": "Manapparai Crunchy Butter Murukku", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 60, "label": "150g", "emoji": "🥨", "desc": "Traditional spiral crispy snack prepared with pure rice flour and sesame."},
    ],
    "Uttar Pradesh": [
        {"title": "Agra Royal Special Taj Petha", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 110, "label": "500g", "emoji": "🧊", "desc": "Juicy translucent ash-gourd sweet candy flavored with rose water."},
        {"title": "Malihabadi Sweet Dussehri Mangoes", "categoryId": "c_fruits_veg", "categoryName": "Fresh Fruits & Veggies", "price": 180, "label": "1 kg", "emoji": "🥭", "desc": "Legendary sweet Lucknow mangoes with a rich heavenly aroma."},
        {"title": "Mathura Brij Classic Khoya Peda", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 260, "label": "250g", "emoji": "🍬", "desc": "Caramelized roasted mawa pedas sprinkled with cardamom sugar."},
        {"title": "Kacchi Ghani Pure Mustard Oil (Sarson)", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 155, "label": "1 L", "emoji": "🛢️", "desc": "Cold pressed pungent mustard oil essential for UP cooking."},
    ],
    "Gujarat": [
        {"title": "Surati Nylon Khaman Dhokla Instant Mix", "categoryId": "c_instant", "categoryName": "Instant & Packaged Food", "price": 65, "label": "200g", "emoji": "🧽", "desc": "Make super spongy, moist Gujarati khaman dhoklas in 15 minutes."},
        {"title": "Gir Girnar Kesar Sweet Mangoes", "categoryId": "c_fruits_veg", "categoryName": "Fresh Fruits & Veggies", "price": 380, "label": "1 kg", "emoji": "🥭", "desc": "Queen of mangoes with intense orange pulp and saffron aroma."},
        {"title": "Crispy Roasted Methi Khakhra", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 75, "label": "200g Pack", "emoji": "🍘", "desc": "Healthy vacuum-packed roasted wheat crisps seasoned with fenugreek."},
        {"title": "Amul Gold Creamy High-Protein Milk", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 68, "label": "1 L", "emoji": "🥛", "desc": "Standardized fresh buffalo and cow milk from Anand, Gujarat."},
    ],
    "West Bengal": [
        {"title": "Kolkata Traditional Spongy Rasgulla Can", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 160, "label": "1 kg Can", "emoji": "🍡", "desc": "Melt-in-mouth soft cottage cheese balls simmered in light sugar syrup."},
        {"title": "Mother Dairy Kolkata Mishti Doi Pot", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 45, "label": "100g", "emoji": "🍯", "desc": "Classic Bengali caramelized sweet yogurt in a traditional clay pot feel."},
        {"title": "Gobindobhog Aromatic Payesh Rice", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 110, "label": "1 kg", "emoji": "🍚", "desc": "Short grain fragrant rice specially grown for Bengali khichuri and kheer."},
        {"title": "Kasundi Traditional Pungent Mustard Sauce", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 85, "label": "250ml", "emoji": "🧴", "desc": "Fermented sharp Bengali mustard relish perfect for snacks and cutlets."},
    ],
    "Punjab": [
        {"title": "Amritsari Special Pindi Chana Masala", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 60, "label": "100g", "emoji": "🍲", "desc": "Authentic roasted spice blend for dark tangy Punjabi chickpea curry."},
        {"title": "Verka Pure Desi Ghee Tub", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 340, "label": "500ml", "emoji": "🧈", "desc": "Aromatic golden cow ghee prepared in Punjab cooperative dairies."},
        {"title": "Makkai Ka Atta (Pure Yellow Corn Flour)", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 65, "label": "1 kg", "emoji": "🌽", "desc": "Stone-ground yellow corn flour for hot winter makki di rotis."},
        {"title": "Haldiram Sarson Ka Saag (Ready To Eat)", "categoryId": "c_instant", "categoryName": "Instant & Packaged Food", "price": 140, "label": "450g", "emoji": "🥬", "desc": "Traditional slow-simmered mustard greens with green chilies and garlic."},
    ],
    "Rajasthan": [
        {"title": "Bikaneri Handmade Spicy Moth Bhujia", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 65, "label": "200g", "emoji": "🥨", "desc": "Crispy snack made with dew-bean flour and rich black pepper spices."},
        {"title": "Rajasthani Moong Dal Papad (Badi)", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 90, "label": "200g", "emoji": "🍘", "desc": "Sun-dried crispy lentil papad spiced with asafoetida and black pepper."},
        {"title": "Jodhpur Pyaaz Ki Kachori (Frozen Pack)", "categoryId": "c_instant", "categoryName": "Instant & Packaged Food", "price": 120, "label": "Pack of 4", "emoji": "🥟", "desc": "Flaky puff pastry stuffed with spicy caramelized onion masala."},
        {"title": "Desert Ker Sangri Special Marwari Mix", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 280, "label": "200g", "emoji": "🌿", "desc": "Traditional dried berries and desert beans for royal Marwari sabzi."},
    ],
    "Madhya Pradesh": [
        {"title": "Indore Famous Ratlami Laung Sev", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 70, "label": "250g", "emoji": "🥨", "desc": "Classic clove-spiced crispy chickpea flour sev, the pride of Malwa."},
        {"title": "Sanchi Pure Cow Milk Ghee", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 310, "label": "500ml", "emoji": "🧈", "desc": "Fresh cow ghee packed with nutrition from MP State Dairy."},
        {"title": "Ujjain Special Khatta Meetha Poha Sev", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 65, "label": "250g", "emoji": "🍿", "desc": "Crunchy sweet-and-sour namkeen mix best served over Indori poha."},
        {"title": "Malwa Sharbati Whole Wheat Grains", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 260, "label": "5 kg", "emoji": "🌾", "desc": "Sun-kissed Golden Sehore wheat grains from the fertile Malwa plateau."},
    ],
    "Kerala": [
        {"title": "Kerala Nendran Banana Chips in Pure Coconut Oil", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 110, "label": "200g", "emoji": "🍌", "desc": "Crisp yellow plantain chips fried freshly in pure aromatic coconut oil."},
        {"title": "Malabar Tellicherry Whole Black Peppercorns", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 160, "label": "100g", "emoji": "🌿", "desc": "Bold pungent black peppercorns from the hills of Wayanad, Kerala."},
        {"title": "ID Fresh Frozen Malabar Parotta", "categoryId": "c_instant", "categoryName": "Instant & Packaged Food", "price": 95, "label": "Pack of 5 (350g)", "emoji": "🫓", "desc": "Flaky, layered traditional Kerala parottas ready in 3 minutes."},
        {"title": "Kera Pure Virgin Cold Pressed Coconut Oil", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 185, "label": "500ml", "emoji": "🥥", "desc": "100% unrefined pure coconut oil for healthy coastal cooking and hair."},
    ],
    "Telangana": [
        {"title": "Nawab Special Hyderabadi Dum Biryani Masala", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 85, "label": "100g", "emoji": "🥘", "desc": "Royal spice potpourri with shahi jeera, star anise and saffron notes."},
        {"title": "Guntur Hot Sun-Dried Red Chilli Flakes", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 75, "label": "150g", "emoji": "🌶️", "desc": "Intensely spicy chillies ground coarse for fiery curries and chutneys."},
        {"title": "Priya Gongura Roselle Leaves Pickle", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 90, "label": "300g", "emoji": "🫙", "desc": "Tangy sorrel leaf pickle prepared with roasted mustard and garlic."},
        {"title": "Vijaya Pasteurised Toned Milk", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 38, "label": "500ml", "emoji": "🥛", "desc": "Fresh daily milk from Telangana state dairy federation."},
    ],
    "Bihar": [
        {"title": "Roasted Chana Sattu Powder", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 75, "label": "500g", "emoji": "🌾", "desc": "High-protein roasted Bengal gram flour for energy drinks and litti."},
        {"title": "Mithila Premium Jumbo Foxnuts (Makhana)", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 280, "label": "250g", "emoji": "🍿", "desc": "GI-tagged superfood hand-harvested from lotus ponds of Darbhanga."},
        {"title": "Bhagalpur Katarni Fragrant Rice", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 130, "label": "1 kg", "emoji": "🍚", "desc": "Naturally scented indigenous small grain rice from Bihar."},
        {"title": "Jharna Traditional Cow Ghee", "categoryId": "c_dairy", "categoryName": "Dairy, Bread & Eggs", "price": 350, "label": "500ml", "emoji": "🧈", "desc": "Rich aroma clarified butter essential for litti chokha feast."},
    ],
    "Himachal Pradesh": [
        {"title": "Kinnaur Mountain Fresh Red Apples", "categoryId": "c_fruits_veg", "categoryName": "Fresh Fruits & Veggies", "price": 160, "label": "4 pcs", "emoji": "🍎", "desc": "High altitude orchard apples with deep burgundy skin and crunchy sweet bite."},
        {"title": "Himachal Golden Wild Apricot Jam", "categoryId": "c_instant", "categoryName": "Instant & Packaged Food", "price": 145, "label": "350g", "emoji": "🍑", "desc": "Real sun-ripened Himalayan wild apricot spread with no artificial flavors."},
        {"title": "Chamba Hill Red Kidney Beans (Rajma)", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 170, "label": "500g", "emoji": "🥣", "desc": "Small tender mountain rajma that melts in the mouth with rich flavor."},
        {"title": "Natural Himalayan Raw Apple Cider Vinegar", "categoryId": "c_medical", "categoryName": "Pharmacy & Wellness", "price": 299, "label": "500ml", "emoji": "🍾", "desc": "Raw, unfiltered ACV with the natural mother culture intact."},
    ],
    "Goa": [
        {"title": "Goan Royal Jumbo Cashews W320", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 380, "label": "250g", "emoji": "🥜", "desc": "Large whole crunchy cashew nuts grown in the lush orchards of North Goa."},
        {"title": "Goan Fiery Balchao Curry Paste", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 135, "label": "200g", "emoji": "🥘", "desc": "Portuguese-influenced spicy tangy marinade for prawns and paneer."},
        {"title": "Bebinca Traditional 7-Layer Goan Dessert", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 190, "label": "250g", "emoji": "🥞", "desc": "Authentic layered pudding baked with rich coconut milk, ghee and nutmeg."},
        {"title": "Pure Goan Palm Toddy Vinegar", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 95, "label": "500ml", "emoji": "🧴", "desc": "Naturally brewed coconut vinegar indispensable for Goan vindaloo."},
    ],
    "Jammu & Kashmir": [
        {"title": "Pampore Grade-1 Kashmiri Kesar (Saffron)", "categoryId": "c_grocery", "categoryName": "Grocery & Staples", "price": 380, "label": "1 Gram", "emoji": "✨", "desc": "Pure red stigmas with intense floral aroma and deep golden tint."},
        {"title": "Kashmiri Kagzi Thin-Shell Raw Walnuts", "categoryId": "c_snacks", "categoryName": "Snacks & Munchies", "price": 290, "label": "250g", "emoji": "🌰", "desc": "Fresh snow-fed valley walnuts with high natural omega-3 oil content."},
        {"title": "Kashmiri Royal Shahi Kahwa Tea Mix", "categoryId": "c_beverages", "categoryName": "Cold Drinks & Juices", "price": 220, "label": "150g", "emoji": "🍵", "desc": "Green tea leaves blended with cinnamon, green cardamom and sliced almonds."},
        {"title": "Kashmiri Delicious Sweet Red Apples", "categoryId": "c_fruits_veg", "categoryName": "Fresh Fruits & Veggies", "price": 140, "label": "1 kg", "emoji": "🍎", "desc": "Hand-picked valley apples with honey-sweet juiciness."},
    ],
}

# Standard essentials present in every single state
STANDARD_STATE_ITEMS = [
    {"name": "Aashirvaad Superior Sharbati Atta", "catId": "c_grocery", "catName": "Grocery & Staples", "price": 275, "label": "5 kg", "emoji": "🌾", "desc": "Made from MP grains for soft fluffy rotis."},
    {"name": "India Gate Feast Rozzana Basmati Rice", "catId": "c_grocery", "catName": "Grocery & Staples", "price": 389, "label": "5 kg", "emoji": "🍚", "desc": "Aromatic long-grain basmati rice."},
    {"name": "Fortune Sunlite Refined Sunflower Oil", "catId": "c_grocery", "catName": "Grocery & Staples", "price": 142, "label": "1 L", "emoji": "🛢️", "desc": "Light cooking oil enriched with Vitamins A & D."},
    {"name": "Tata Salt Vacuum Evaporated Iodized Salt", "catId": "c_grocery", "catName": "Grocery & Staples", "price": 28, "label": "1 kg", "emoji": "🧂", "desc": "India's trusted vacuum-evaporated iodised salt."},
    {"name": "Amul Taaza Toned Fresh Milk", "catId": "c_dairy", "catName": "Dairy, Bread & Eggs", "price": 68, "label": "1 L", "emoji": "🥛", "desc": "Pasteurized and homogenised toned milk."},
    {"name": "Amul Salted Pasteurized Butter", "catId": "c_dairy", "catName": "Dairy, Bread & Eggs", "price": 275, "label": "500 g", "emoji": "🧈", "desc": "Delicious salted butter made from fresh cream."},
    {"name": "Britannia 100% Whole Wheat Brown Bread", "catId": "c_dairy", "catName": "Dairy, Bread & Eggs", "price": 50, "label": "400 g", "emoji": "🍞", "desc": "Fresh whole wheat brown bread."},
    {"name": "Fresh Farm Brown Eggs", "catId": "c_dairy", "catName": "Dairy, Bread & Eggs", "price": 65, "label": "Pack of 6", "emoji": "🥚", "desc": "Antibiotic-free farm fresh eggs."},
    {"name": "Milky Mist Fresh Malai Paneer", "catId": "c_dairy", "catName": "Dairy, Bread & Eggs", "price": 115, "label": "200 g", "emoji": "🧀", "desc": "Super soft cottage cheese made from pasteurised milk."},
    {"name": "Crisp Royal Delicious Red Apples", "catId": "c_fruits_veg", "catName": "Fresh Fruits & Veggies", "price": 149, "label": "4 pcs", "emoji": "🍎", "desc": "Crisp, sweet, and juicy red apples."},
    {"name": "Robusta Golden Ripe Bananas", "catId": "c_fruits_veg", "catName": "Fresh Fruits & Veggies", "price": 58, "label": "1 Dozen", "emoji": "🍌", "desc": "Naturally ripened, energy-rich bananas."},
    {"name": "Farm Fresh Red Ripe Tomatoes", "catId": "c_fruits_veg", "catName": "Fresh Fruits & Veggies", "price": 35, "label": "1 kg", "emoji": "🍅", "desc": "Firm and juicy farm-harvested red hybrid tomatoes."},
    {"name": "Fresh Red Cooking Onions", "catId": "c_fruits_veg", "catName": "Fresh Fruits & Veggies", "price": 42, "label": "1 kg", "emoji": "🧅", "desc": "Crisp red onions with authentic pungent flavor."},
    {"name": "Pahadi Fresh Cooking Potatoes", "catId": "c_fruits_veg", "catName": "Fresh Fruits & Veggies", "price": 32, "label": "1 kg", "emoji": "🥔", "desc": "Dry and firm potatoes ideal for curries."},
    {"name": "Lay's India's Magic Masala Chips", "catId": "c_snacks", "catName": "Snacks & Munchies", "price": 20, "label": "50 g", "emoji": "🥔", "desc": "Crunchy sliced potato chips with spicy masala."},
    {"name": "Coca-Cola Original Soft Drink", "catId": "c_beverages", "catName": "Cold Drinks & Juices", "price": 40, "label": "750 ml", "emoji": "🥤", "desc": "World's favorite carbonated drink."},
    {"name": "Maggi 2-Minute Masala Instant Noodles", "catId": "c_instant", "catName": "Instant & Packaged Food", "price": 56, "label": "4 Pack", "emoji": "🍜", "desc": "Classic 2-minute instant noodles with tastemaker."},
    {"name": "Dolo 650 Paracetamol Tablets", "catId": "c_medical", "catName": "Pharmacy & Wellness", "price": 31, "label": "15 Tablets", "emoji": "💊", "desc": "Fast relief from fever and body aches."},
    {"name": "Dettol Original Germ Protection Handwash", "catId": "c_personal", "catName": "Personal Care & Hygiene", "price": 99, "label": "200 ml", "emoji": "🧼", "desc": "Provides 99.9% germ protection with pine fragrance."},
    {"name": "Surf Excel Matic Liquid Detergent", "catId": "c_household", "catName": "Cleaning & Household", "price": 220, "label": "1 L", "emoji": "🧺", "desc": "Tough stain removal in washing machines."},
    {"name": "boAt Bassheads 100 Wired Earphones", "catId": "c_electronics", "catName": "Electronics & Accessories", "price": 399, "label": "1 Unit", "emoji": "🎧", "desc": "Deep bass 10mm drivers with microphone."},
]

def seed_database():
    print("🔌 Connecting to MongoDB:", MONGODB_URI)
    client = MongoClient(MONGODB_URI)
    try:
        db = client.get_default_database()
    except Exception:
        db = client["quickcart"]
    if db is None:
        db = client["quickcart"]
    print(f"📦 Connected to: {db.name}")

    now = datetime.now(timezone.utc)

    # 1. Categories
    categories = [
        {"id": "c_grocery",     "name": "Grocery & Staples",           "icon": "🛒", "color": "#16A34A", "order": 1, "isVisible": True, "isActive": True},
        {"id": "c_fruits_veg",  "name": "Fresh Fruits & Veggies",      "icon": "🍎", "color": "#22C55E", "order": 2, "isVisible": True, "isActive": True},
        {"id": "c_dairy",       "name": "Dairy, Bread & Eggs",         "icon": "🥛", "color": "#3B82F6", "order": 3, "isVisible": True, "isActive": True},
        {"id": "c_snacks",      "name": "Snacks & Munchies",           "icon": "🍟", "color": "#F97316", "order": 4, "isVisible": True, "isActive": True},
        {"id": "c_beverages",   "name": "Cold Drinks & Juices",        "icon": "🧃", "color": "#06B6D4", "order": 5, "isVisible": True, "isActive": True},
        {"id": "c_instant",     "name": "Instant & Packaged Food",     "icon": "🍜", "color": "#EAB308", "order": 6, "isVisible": True, "isActive": True},
        {"id": "c_medical",     "name": "Pharmacy & Wellness",         "icon": "💊", "color": "#EC4899", "order": 7, "isVisible": True, "isActive": True},
        {"id": "c_personal",    "name": "Personal Care & Hygiene",     "icon": "🧴", "color": "#8B5CF6", "order": 8, "isVisible": True, "isActive": True},
        {"id": "c_household",   "name": "Cleaning & Household",        "icon": "🧹", "color": "#64748B", "order": 9, "isVisible": True, "isActive": True},
        {"id": "c_electronics", "name": "Electronics & Accessories",   "icon": "🎧", "color": "#6366F1", "order": 10, "isVisible": True, "isActive": True},
        {"id": "c_baby",        "name": "Baby Care & Toys",            "icon": "🧸", "color": "#F43F5E", "order": 11, "isVisible": True, "isActive": True},
        {"id": "c_pet",         "name": "Pet Supplies & Food",         "icon": "🐾", "color": "#14B8A6", "order": 12, "isVisible": True, "isActive": True},
    ]
    db.categories.delete_many({})
    db.categories.insert_many(categories)
    print(f"✅ Seeded {len(categories)} categories")

    # 2. Banners (Global + State-Specific)
    banners = [
        {
            "id": "b_10min_global",
            "title": "⚡ 10-Minute Superfast Delivery",
            "subtitle": "Groceries, daily essentials & medicines at lightning speed",
            "imageUrl": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
            "emoji": "🚀",
            "gradientColors": ["#16A34A", "#15803D"],
            "stateName": "All",
            "order": 1,
        },
        {
            "id": "b_festive_global",
            "title": "🎉 Big Grocery Savings Festival!",
            "subtitle": "Up to 50% discount on cooking oils, atta, rice & snacks",
            "imageUrl": "https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=800",
            "emoji": "🛒",
            "gradientColors": ["#F59E0B", "#D97706"],
            "stateName": "All",
            "order": 2,
        },
        {
            "id": "b_fresh_global",
            "title": "🌿 Farm-Fresh Organic Harvest",
            "subtitle": "100% naturally grown crisp fruits & leafy greens",
            "imageUrl": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800",
            "emoji": "🥑",
            "gradientColors": ["#22C55E", "#16A34A"],
            "stateName": "All",
            "order": 3,
        },
    ]

    # Add localized banner for every Indian state
    for state in INDIAN_STATES:
        banners.append({
            "id": f"b_state_{normalize_id(state)}",
            "title": f"⚡ Fast Delivery in {state}!",
            "subtitle": f"Get local fresh staples & groceries delivered to your home in {state}",
            "imageUrl": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
            "emoji": "📍",
            "gradientColors": ["#2563EB", "#1D4ED8"],
            "stateName": state,
            "order": 1,
        })

    db.banners.delete_many({})
    db.banners.insert_many(banners)
    print(f"✅ Seeded {len(banners)} banners (Global + All 36 States)")

    # 3. Products for EVERY State with Exact Matching Pictures
    all_products = []

    # First, generate products for each of the 36 states
    for state in INDIAN_STATES:
        s_id = normalize_id(state)

        # Standard items for this state
        for item in STANDARD_STATE_ITEMS:
            img = get_picture_for_name(item["name"])
            prod_id = f"p_{s_id}_{normalize_id(item['name'])}"
            all_products.append({
                "id": prod_id,
                "title": f"{item['name']} ({state})",
                "categoryId": item["catId"],
                "categoryName": item["catName"],
                "price": item["price"],
                "label": item["label"],
                "rating": 4.6,
                "emoji": item["emoji"],
                "imageUrl": img,
                "stateName": state,
                "stateId": s_id,
                "city": "",
                "availability": "available",
                "stock": 50,
                "description": f"{item['desc']} Fresh local stock available in {state}.",
                "tags": ["Fast Delivery", "Daily Need", state],
                "createdAt": now,
                "updatedAt": now,
            })

        # Local specialty items if available for this state
        if state in STATE_SPECIALTIES:
            for spec in STATE_SPECIALTIES[state]:
                img = get_picture_for_name(spec["title"])
                prod_id = f"p_{s_id}_{normalize_id(spec['title'])}"
                all_products.append({
                    "id": prod_id,
                    "title": spec["title"],
                    "categoryId": spec["categoryId"],
                    "categoryName": spec["categoryName"],
                    "price": spec["price"],
                    "label": spec["label"],
                    "rating": 4.9,
                    "emoji": spec["emoji"],
                    "imageUrl": img,
                    "stateName": state,
                    "stateId": s_id,
                    "city": "",
                    "availability": "available",
                    "stock": 35,
                    "description": spec["desc"],
                    "tags": ["Local Specialty", "Authentic", state],
                    "createdAt": now,
                    "updatedAt": now,
                })

    # Also add universal / general products without state restriction (stateName = "All")
    for item in STANDARD_STATE_ITEMS:
        img = get_picture_for_name(item["name"])
        prod_id = f"p_all_{normalize_id(item['name'])}"
        all_products.append({
            "id": prod_id,
            "title": item["name"],
            "categoryId": item["catId"],
            "categoryName": item["catName"],
            "price": item["price"],
            "label": item["label"],
            "rating": 4.8,
            "emoji": item["emoji"],
            "imageUrl": img,
            "stateName": "All",
            "stateId": "all",
            "city": "",
            "availability": "available",
            "stock": 100,
            "description": item["desc"],
            "tags": ["Bestseller", "Top Rated"],
            "createdAt": now,
            "updatedAt": now,
        })

    db.products.delete_many({})
    db.products.insert_many(all_products)
    print(f"✅ Seeded {len(all_products)} products across all 36 Indian states with matching pictures!")

    # 4. Users (Admin + Ayush)
    admin_pw = hash_pw("Admin@123")
    customer_pw = hash_pw("Password123")

    users = [
        {
            "fullName": "Admin QuickCart",
            "email": "admin@quickcart.com",
            "password": admin_pw,
            "mobile": "9876543210",
            "role": "admin",
            "pushToken": "",
            "createdAt": now,
            "updatedAt": now
        },
        {
            "fullName": "Demo Customer",
            "email": "customer@quickcart.com",
            "password": customer_pw,
            "mobile": "9876543210",
            "role": "customer",
            "pushToken": "",
            "createdAt": now,
            "updatedAt": now
        }
    ]
    db.users.delete_many({})
    res_users = db.users.insert_many(users)
    customer_id = str(res_users.inserted_ids[1])
    print(f"✅ Seeded users (Admin & Demo Customer)")

    # 5. Delivery Addresses
    addresses = [
        {
            "userId": customer_id,
            "label": "Home",
            "recipientName": "Demo Customer",
            "phone": "9876543210",
            "houseFlat": "Flat 402, Royal Residency",
            "streetArea": "Near City Center Mall, MG Road",
            "landmark": "Opposite SBI Bank",
            "city": "Indore",
            "state": "Madhya Pradesh",
            "postalCode": "452001",
            "notes": "Ring bell twice, leave with guard if absent.",
            "isDefault": True,
            "createdAt": now,
            "updatedAt": now
        },
        {
            "userId": customer_id,
            "label": "Work",
            "recipientName": "Demo Customer",
            "phone": "9876543210",
            "houseFlat": "Tech Park Building 4, 3rd Floor",
            "streetArea": "IT Corridor, Super Corridor",
            "landmark": "Near TCS Campus",
            "city": "Indore",
            "state": "Madhya Pradesh",
            "postalCode": "452012",
            "notes": "Deliver at main reception desk.",
            "isDefault": False,
            "createdAt": now,
            "updatedAt": now
        }
    ]
    db.addresses.delete_many({})
    db.addresses.insert_many(addresses)
    print(f"✅ Seeded {len(addresses)} delivery addresses")

    # 6. Sample Orders
    orders = [
        {
            "orderId": f"order_{int((now - timedelta(days=1)).timestamp() * 1000)}_1021",
            "userId": customer_id,
            "userEmail": "customer@quickcart.com",
            "items": [
                {"id": "prod_milk", "title": "Amul Taaza Toned Fresh Milk", "quantity": 2, "price": 68, "imageUrl": PICTURE_MAP["milk"]},
                {"id": "prod_bread", "title": "Britannia 100% Whole Wheat Brown Bread", "quantity": 1, "price": 50, "imageUrl": PICTURE_MAP["bread"]},
                {"id": "prod_butter", "title": "Amul Salted Pasteurized Butter", "quantity": 1, "price": 275, "imageUrl": PICTURE_MAP["butter"]}
            ],
            "total": 461,
            "subtotal": 461,
            "deliveryCharge": 0,
            "freeDelivery": True,
            "status": "delivered",
            "paymentMethod": "Cash on Delivery",
            "estimatedDelivery": now - timedelta(days=1),
            "deliveryAddress": addresses[0],
            "createdAt": now - timedelta(days=1),
            "updatedAt": now - timedelta(days=1)
        },
        {
            "orderId": f"order_{int(now.timestamp() * 1000)}_8842",
            "userId": customer_id,
            "userEmail": "customer@quickcart.com",
            "items": [
                {"id": "prod_apple", "title": "Crisp Royal Delicious Red Apples", "quantity": 1, "price": 149, "imageUrl": PICTURE_MAP["apple"]},
                {"id": "prod_atta", "title": "Aashirvaad Superior Sharbati Atta", "quantity": 1, "price": 275, "imageUrl": PICTURE_MAP["atta"]},
                {"id": "prod_maggi", "title": "Maggi 2-Minute Masala Instant Noodles", "quantity": 2, "price": 56, "imageUrl": PICTURE_MAP["maggi"]}
            ],
            "total": 536,
            "subtotal": 536,
            "deliveryCharge": 0,
            "freeDelivery": True,
            "status": "confirmed",
            "paymentMethod": "Cash on Delivery",
            "estimatedDelivery": now + timedelta(minutes=30),
            "deliveryAddress": addresses[0],
            "createdAt": now,
            "updatedAt": now
        }
    ]
    db.orders.delete_many({})
    db.orders.insert_many(orders)
    print(f"✅ Seeded {len(orders)} sample orders")

    print("\n🎉 ALL-STATES DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    print(f"Total Products seeded: {len(all_products)}")
    print(f"Total Banners seeded:  {len(banners)}")
    print(f"States covered:        All 36 Indian States & UTs")

if __name__ == "__main__":
    seed_database()
