export type Vendor = {
  id: string;
  name: string;
  rating: number;
  eta: string;
  tags: string[];

  cover?: string | null;
  logo?: string | null;
  discount?: number | null;
};
