const data = {
  unit: '1 Serve',
  category: 'c_food',
  rating: 4.8,
  name: 'Royal Biryani Combo',
  state: 'Bihar',
  emoji: '🥘',
  price: 349
};

const d = data;
const title = (d.title) ?? (d.name) ?? "";
const title2 = (d.title) || (d.name) || "";
console.log("Title with ??:", title);
console.log("Title with ||:", title2);
