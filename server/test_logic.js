const DEFAULT_CATEGORIES_LIST = [
  "Meat Shops", "Fish Markets", "Pet Shops", "Pet Grooming", "Mobile Shops", "Computer Stores",
  "Laptop Repair", "Mobile Repair", "Electronics", "Home Appliances", "Fashion",
  "Clothing Stores", "Footwear", "Jewellery", "Gift Shops", "Florists", "Sports Stores",
  "Toy Stores", "Stationery Stores", "Printing Press", "Advertising Agencies",
  "Digital Marketing", "Web Design", "Software Companies", "IT Services", "Cyber Cafes",
  "Temples", "Churches", "Mosques", "Tourist Attractions", "Theatres", "Cinema Halls",
  "Parks", "Museums", "Art Galleries", "Clubs", "NGOs", "Government Offices",
  "Police Stations", "Fire Stations", "Post Offices", "Gas Agencies", "Water Suppliers",
  "Electricity Services", "Waste Management", "Automobile Dealers", "Car Service Centers",
  "Bike Service Centers", "Tyre Shops", "Battery Dealers", "Auto Accessories",
  "Petrol Pumps", "EV Charging Stations", "Solar Energy", "CCTV Dealers", "Security Services",
  "AC Sales & Service", "Refrigerator Repair", "Washing Machine Repair", "Recruitment Agencies",
  "HR Consultants", "Exporters", "Importers", "Manufacturers", "Wholesalers", "Retailers",
  "Industrial Suppliers", "Agriculture", "Poultry Farms", "Dairy Farms", "Organic Stores",
  "Fish Farms", "Seed Suppliers", "Fertilizer Dealers", "Textile Mills", "Handloom Shops",
  "Tailors", "Boutiques", "Dance Academy", "Music Academy", "Driving Schools",
  "Language Institutes", "Child Care Centers", "Old Age Homes", "Rehabilitation Centers",
  "Astrology", "Numerology", "Passport Consultants", "Visa Consultants", "Others"
];

const dbNames = ['whatsapp'];
const deletedNames = [];
const deletedSet = new Set(deletedNames.map(n => n.toLowerCase()));

const merged = Array.from(new Set([...DEFAULT_CATEGORIES_LIST, ...dbNames]));

const filtered = merged
  .filter(c => c !== 'Others' && !deletedSet.has(c.toLowerCase()))
  .sort((a, b) => a.localeCompare(b));
  
filtered.push('Others');

console.log('Includes whatsapp?', filtered.includes('whatsapp'));
console.log('Index of whatsapp:', filtered.indexOf('whatsapp'));
console.log('Total items:', filtered.length);
