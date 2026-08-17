export type Role = "admin" | "staff";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
}

export interface Bus {
  id: string;
  active: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export interface Expense {
  id: string;
  expense_date: string; // YYYY-MM-DD
  category_id: string;
  vehicle_tag: string; // '' | 'ALL' | '9342' | '9342;9343'
  amount: number;
  remarks: string | null;
  category?: Category;
}

export interface IncomeEntry {
  id: string;
  year: number;
  month: number; // 1-12
  bus_id: string;
  week_no: number; // 1-5
  amount: number;
}

export interface YearSettings {
  year: number;
  opening_balance: number;
}
