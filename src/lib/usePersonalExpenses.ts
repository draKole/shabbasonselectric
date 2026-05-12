import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PersonalExpense = {
  id: string;
  expense_date: string;
  amount: number;
  category: string;
  method: string;
  notes: string | null;
  recurring: boolean;
  related_bill_id: string | null;
  is_income: boolean;
  created_at: string;
};

export const PERSONAL_EXPENSE_CATEGORIES = [
  "Rent / Housing",
  "Food",
  "Gas (personal)",
  "Car Payment",
  "Insurance (personal)",
  "Phone (personal)",
  "Child / Family",
  "Debt Payment",
  "Emergency",
  "Savings",
  "Investing",
  "Fun / Spending",
  "Other",
];

export const PERSONAL_INCOME_CATEGORIES = [
  "Owner Draw",
  "Refund",
  "Gift",
  "Other Income",
];

export function usePersonalExpenses(from: string, to: string) {
  const [items, setItems] = useState<PersonalExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("personal_expenses")
      .select("*")
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { reload(); }, [reload]);

  const expenses = items.filter(i => !i.is_income);
  const income = items.filter(i => i.is_income);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalIncome = income.reduce((s, e) => s + Number(e.amount || 0), 0);
  const ownerDraw = income.filter(i => i.category === "Owner Draw").reduce((s, e) => s + Number(e.amount || 0), 0);
  const otherIncome = totalIncome - ownerDraw;

  return { items, expenses, income, totalExpenses, totalIncome, ownerDraw, otherIncome, loading, reload };
}
