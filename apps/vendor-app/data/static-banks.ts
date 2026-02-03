export const STATIC_BANKS = [
  {
    id: "0310efab-4219-457e-bdb2-43ca421d0875",
    name: "Access Bank",
    code: "044",
  },
  {
    id: "f53936ea-1b98-4ff6-b092-4e5e18618eae",
    name: "First Bank",
    code: "011",
  },
  { id: "0d1c01f9-a92e-461a-acd0-a8dafea3fa8d", name: "GTBank", code: "058" },
  { id: "e31dd084-2ed7-4bef-b76b-77ac7de3678a", name: "UBA", code: "033" },
  {
    id: "410b2085-ede4-4b2c-a01a-d832d0265a59",
    name: "Zenith Bank",
    code: "057",
  },
];

export type Bank = {
  id: string;
  name: string;
  code: string;
};
