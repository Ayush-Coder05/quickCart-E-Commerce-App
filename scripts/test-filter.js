const products = [
  { id: '1', title: 'Universal Car Phone Mount', categoryId: 'c_electronics' },
  { id: '2', title: 'Dual USB Car Charger', categoryId: 'c_electronics' },
  { id: '3', title: 'Fresh Red Tomatoes', categoryId: 'Veg' },
];

let selectedCat = 'c_medical';
let search = '';

const filtered = products.filter((p) => {
  const matchCat = selectedCat === "all" || p.categoryId === selectedCat;
  const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
  return matchCat && matchSearch;
});

console.log("Filtered length:", filtered.length);
console.log("Filtered items:", filtered);
