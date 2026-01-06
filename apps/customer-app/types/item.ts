export type Item = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  discount?: number | null;
  category: string;
};

// demo data
export const ITEMS: Item[] = [
  {
    id: "item1",
    name: "Organic Apples",
    price: 1200,
    image: null,
    discount: 10,
    category: "groceries",
  },
  {
    id: "item2",
    name: "Sushi Platter",
    price: 4500,
    image: null,
    discount: null,
    category: "restaurants",
  },
  {
    id: "item3",
    name: "Whole Wheat Bread",
    price: 800,
    image: null,
    discount: 5,
    category: "groceries",
  },
  {
    id: "item4",
    name: "Cheeseburger Meal",
    price: 2500,
    image: null,
    discount: null,
    category: "restaurants",
  },
  {
    id: "item5",
    name: "Vitamin C Tablets",
    price: 1500,
    image: null,
    discount: 15,
    category: "pharmacy",
  },
  {
    id: "item6",
    name: "Fresh Salmon Fillet",
    price: 5200,
    image: null,
    discount: null,
    category: "groceries",
  },
  {
    id: "item7",
    name: "Pepperoni Pizza",
    price: 3000,
    image: null,
    discount: 20,
    category: "restaurants",
  },
  {
    id: "item8",
    name: "Hand Sanitizer",
    price: 600,
    image: null,
    discount: null,
    category: "pharmacy",
  },
  {
    id: "item9",
    name: "Banana Bunch",
    price: 500,
    image: null,
    discount: 5,
    category: "groceries",
  },
  {
    id: "item10",
    name: "Grilled Chicken Salad",
    price: 2800,
    image: null,
    discount: null,
    category: "restaurants",
  },
];
