// src/app/main/cart/page.tsx
import { redirect } from "next/navigation";

export default function CartPage() {
  redirect("/main/checkout");
}
