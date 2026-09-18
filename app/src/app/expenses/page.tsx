"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DateInput from "@/components/DateInput";
import { formatDate } from "@/lib/dateUtils";

type Category = {
  id: string;
  name: string;
  display_order: number;
};

type BudgetItem = {
  id: string;
  category_id: string;
  description: string;
};

type Expense = {
  id: string;
  budget_item_id: string | null;
  category_id: string | null;
  payment_amount: number;
  payment_date: string | null;
  notes: string | null;
  paid_by: string | null;
  budget_items?: {
    description: string;
  }[] | null;
  budget_categories?: {
    name: string;
  }[] | null;
};

export default function ExpensesPage() {
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budgetItemId, setBudgetItemId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paidBy, setPaidBy] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("id")
      .eq("name", "Priyena Wedding")
      .limit(1)
      .maybeSingle();

    if (weddingError || !wedding) {
      setError("Wedding information could not be loaded.");
      setLoading(false);
      return;
    }

    setWeddingId(wedding.id);

    const [
      { data: categoryData, error: categoryError },
      { data: itemData, error: itemError },
      { data: expenseData, error: expenseError },
    ] = await Promise.all([
      supabase
        .from("budget_categories")
        .select("id, name, display_order")
        .eq("wedding_id", wedding.id)
        .eq("active", true)
        .order("display_order", { ascending: true }),

      supabase
        .from("budget_items")
        .select("id, category_id, description")
        .eq("wedding_id", wedding.id)
        .order("created_at", { ascending: true }),

      supabase
        .from("budget_payments")
        .select(
          `
            id,
            budget_item_id,
            category_id,
            payment_amount,
            payment_date,
            notes,
            paid_by,
            budget_items(description),
            budget_categories(name)
          `
        )
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (categoryError) {
      setError(categoryError.message);
    } else {
      setCategories(categoryData ?? []);
    }

    if (itemError) {
      setError(itemError.message);
    } else {
      setBudgetItems(itemData ?? []);
    }

    if (expenseError) {
      setError(expenseError.message);
    } else {
      setExpenses((expenseData ?? []) as Expense[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.payment_amount || 0),
    0
  );

  const budgetedExpenses = expenses
    .filter((expense) => expense.category_id || expense.budget_item_id)
    .reduce(
      (sum, expense) => sum + Number(expense.payment_amount || 0),
      0
    );

  const notBudgetedExpenses = expenses
    .filter(
      (expense) => !expense.category_id && !expense.budget_item_id
    )
    .reduce(
      (sum, expense) => sum + Number(expense.payment_amount || 0),
      0
    );

  function resetForm() {
    setDate("");
    setCategoryId("");
    setBudgetItemId("");
    setAmount("");
    setNotes("");
    setPaidBy("");
    setShowForm(false);
    setEditingExpenseId(null);
    setError("");
  }

  async function saveExpense() {
    setError("");

    if (!weddingId) {
      setError("Wedding information could not be loaded.");
      return;
    }

    if (!date) {
      setError("Please enter the expense date.");
      return;
    }

    if (!budgetItemId) {
      setError("Please select a budget item.");
      return;
    }

    if (budgetItemId === "not-planned" && !categoryId) {
      setError("Please select a category for the unplanned expense.");
      return;
    }

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSaving(true);

    const isNotBudgeted = budgetItemId === "not-budgeted";
    const isNotPlanned = budgetItemId === "not-planned";

    const expenseData = {
      budget_item_id:
        !isNotBudgeted && !isNotPlanned
          ? budgetItemId
          : null,
      category_id: isNotBudgeted ? null : categoryId,
      payment_amount: numericAmount,
      payment_date: date,
      notes: notes.trim() || null,
      paid_by: paidBy,
    };

    if (editingExpenseId) {
      const { error: updateError } = await supabase
        .from("budget_payments")
        .update(expenseData)
        .eq("id", editingExpenseId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("budget_payments")
        .insert(expenseData);

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    resetForm();
    await loadData();
  }

  function editExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setDate(expense.payment_date ?? "");
    setAmount(String(expense.payment_amount ?? ""));
    setNotes(expense.notes ?? "");
    setPaidBy(expense.paid_by ?? "");

    if (expense.budget_item_id) {
      setBudgetItemId(expense.budget_item_id);
      const selectedItem = budgetItems.find(
        (item) => item.id === expense.budget_item_id
      );
      setCategoryId(selectedItem?.category_id ?? expense.category_id ?? "");
    } else if (expense.category_id) {
      setBudgetItemId("not-planned");
      setCategoryId(expense.category_id);
    } else {
      setBudgetItemId("not-budgeted");
      setCategoryId("not-budgeted");
    }

    setError("");
    setShowForm(true);
  }

  async function deleteExpense(id: string) {
    if (!window.confirm("Delete this expense?")) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("budget_payments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Expenses
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track money actually spent on the wedding.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            className="rounded-xl bg-[#7f2935] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#69212c]"
          >
            {showForm ? "Close" : "+ Add Expense"}
          </button>
        </div>

        {showForm && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingExpenseId ? "Edit Expense" : "Add Expense"}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Paid By
                  </label>
                  <select
                    value={paidBy}
                    onChange={(event) => setPaidBy(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">Select person</option>
                    <option value="Priyesh">Priyesh</option>
                    <option value="Shobhna">Shobhna</option>
                    <option value="Priyena">Priyena</option>
                    <option value="Shobhit">Shobhit</option>
                  </select>
                </div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date
                </label>
                <DateInput
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Budget Item
                </label>
                <select
                  value={budgetItemId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setBudgetItemId(value);

                    if (value === "not-budgeted") {
                      setCategoryId("not-budgeted");
                      return;
                    }

                    if (value === "not-planned") {
                      setCategoryId("");
                      return;
                    }

                    const selectedItem = budgetItems.find(
                      (item) => item.id === value
                    );

                    setCategoryId(selectedItem?.category_id ?? "");
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select budget item</option>
                  {budgetItems.map((item) => {
                    const category = categories.find(
                      (category) => category.id === item.category_id
                    );

                    return (
                      <option key={item.id} value={item.id}>
                        {category
                          ? `${category.name} — ${item.description}`
                          : item.description}
                      </option>
                    );
                  })}
                  <option value="not-planned">Not Planned</option>
                  <option value="not-budgeted">Not Budgeted</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={!budgetItemId || budgetItemId !== "not-planned"}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">
                    {budgetItemId === "not-planned"
                      ? "Select category"
                      : "Automatically selected"}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  {budgetItemId === "not-budgeted" && (
                    <option value="not-budgeted">Not Budgeted</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="What was this expense for?"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveExpense}
                disabled={saving}
                className="rounded-xl bg-[#7f2935] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : editingExpenseId ? "Save Changes" : "Save Expense"}
              </button>
            </div>
          </section>
        )}

        {error && !showForm && (
          <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Expenses</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              ₹{totalExpenses.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Budgeted Expenses</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              ₹{budgetedExpenses.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Not Budgeted</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              ₹{notBudgetedExpenses.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Expense History
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No expenses recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenses.map((expense) => {
                const category =
                  expense.category_id === "not-budgeted"
                    ? "Not Budgeted"
                    : categories.find(
                        (category) => category.id === expense.category_id
                      )?.name ??
                      expense.budget_categories?.[0]?.name ??
                      (expense.category_id ? "Category" : "Not Budgeted");

                const item =
                  expense.budget_items?.[0]?.description ??
                  (expense.category_id ? "Not Planned" : "—");

                return (
                  <div
                    key={expense.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {expense.notes || item}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {expense.payment_date
                          ? formatDate(expense.payment_date)
                          : "No date"}{" "}
                        · {category} · {item} · Paid By: {expense.paid_by || "—"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="font-semibold text-slate-900">
                        ₹{Number(expense.payment_amount).toLocaleString("en-IN")}
                      </span>
                      <button
                        type="button"
                        onClick={() => editExpense(expense)}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExpense(expense.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
