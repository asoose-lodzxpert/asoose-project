import { Promotion } from "@/components/home/PromotionsCarousel";

export const PROMOTIONS: Promotion[] = [
  {
    id: "promo-1",
    title: "20% off your first order",
    code: "WELCOME20",
    iconName: "pizza",
    textColor: "#000",
    actionText: "Order Now",
  },
  {
    id: "promo-2",
    title: "Free delivery today",
    code: "FREESHIP",
    iconImage: require("@/assets/images/icon.png"),
    backgroundImage: require("@/assets/images/promo-bg.jpg"),
    textColor: "#FFF",
    actionText: "Shop Now",
  },
  {
    id: "promo-3",
    title: "Groceries in 30 mins",
    iconName: "bag",
    textColor: "#000",
    actionText: "Browse",
  },
];

export const POPULAR = Array.from({ length: 6 }).map((_, i) => ({
  id: `popular-${i}`,
  name: "Mario’s Pizza",
  rating: 4.8,
  eta: "25–35 min",
  fee: 2.99,
  tags: ["Pizza", "Italian"],
}));

export const TOP = Array.from({ length: 6 }).map((_, i) => ({
  id: `popular-${i}`,
  name: "Mario’s Pizza",
  rating: 4.8,
  eta: "25–35 min",
  fee: 2.99,
  tags: ["Pizza", "Italian"],
}));

export const RESTAURANTS = Array.from({ length: 20 }).map((_, i) => ({
  id: `rest-${i}`,
  name: `Top Restaurant ${i + 1}`,
  rating: 4.6,
  eta: "30–40 min",
  fee: 3.5,
  tags: ["Fast Food", "Burgers"],
}));
