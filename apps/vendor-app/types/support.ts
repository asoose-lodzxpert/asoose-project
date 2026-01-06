export type HelpCategory =
  | "getting-started"
  | "orders"
  | "payments"
  | "menu"
  | "account";

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  content: string;
}

export interface HelpSection {
  id: HelpCategory;
  label: string;
  articles: HelpArticle[];
}

export interface HelpData {
  suggestions: string[];
  sections: HelpSection[];
}
