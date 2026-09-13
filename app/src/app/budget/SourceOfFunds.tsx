"use client";

import DateInput from "@/components/DateInput";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type FundingSource = {
  id: string;
  source_name: string;
  relationship: string | null;
  planned_amount: number;
  received_amount: number;
  expected_date: string | null;
  notes: string | null;
};

const emptyForm = {
  source_name: "",
  relationship: "",
  planned_amount: "",
  received_amount: "",
  expected_date: "",
  notes: "",
};

export default function SourceOfFunds() {
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [budgetTotal, setBudgetTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("id")
      .eq("name", "Priyena Wedding")
      .single();

    if (weddingError || !wedding) {
      setError("Wedding information could not be loaded.");
      setLoading(false);
      return;
    }

    const [{ data: fundingData, error: fundingError }, { data: budgetData }] =
      await Promise.all([
        supabase
          .from("funding_sources")
          .select(
            "id, source_name, relationship, planned_amount, received_amount, expected_date, notes"
          )
          .eq("wedding_id", wedding.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("budget_items")
          .select("budget_amount")
          .eq("wedding_id", wedding.id),
      ]);

    if (fundingError) {
      setError(fundingError.message);
      setSources([]);
    } else {
      setSources((fundingData || []) as FundingSource[]);
    }

    setBudgetTotal(
      (budgetData || []).reduce(
        (sum, item) => sum + Number(item.budget_amount || 0),
        0
      )
    );

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const planned = sources.reduce(
      (sum, source) => sum + Number(source.planned_amount || 0),
      0
    );

    const received = sources.reduce(
      (sum, source) => sum + Number(source.received_amount || 0),
      0
    );

    return {
      planned,
      received,
      balance: planned - received,
      fundingGap: Math.max(budgetTotal - planned, 0),
      fundingSurplus: Math.max(planned - budgetTotal, 0),
    };
  }, [sources, budgetTotal]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setIsOpen(true);
  };

  const openEdit = (source: FundingSource) => {
    setEditingId(source.id);
    setForm({
      source_name: source.source_name,
      relationship: source.relationship || "",
      planned_amount: String(source.planned_amount || ""),
      received_amount: String(source.received_amount || ""),
      expected_date: source.expected_date || "",
      notes: source.notes || "",
    });
    setError("");
    setIsOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const saveSource = async () => {
    if (!form.source_name.trim()) {
      setError("Please enter the source name.");
      return;
    }

    const planned = Number(form.planned_amount || 0);
    const received = Number(form.received_amount || 0);

    if (planned < 0 || received < 0) {
      setError("Amounts cannot be negative.");
      return;
    }

    if (received > planned) {
      setError("Received amount cannot be greater than planned amount.");
      return;
    }

    setSaving(true);
    setError("");

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("id")
      .eq("name", "Priyena Wedding")
      .single();

    if (weddingError || !wedding) {
      setError("Wedding information could not be loaded.");
      setSaving(false);
      return;
    }

    const payload = {
      wedding_id: wedding.id,
      source_name: form.source_name.trim(),
      relationship: form.relationship.trim() || null,
      planned_amount: planned,
      received_amount: received,
      expected_date: form.expected_date || null,
      notes: form.notes.trim() || null,
    };

    const result = editingId
      ? await supabase
          .from("funding_sources")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("funding_sources").insert(payload);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    closeModal();
    await loadData();
  };

  const deleteSource = async (source: FundingSource) => {
    const confirmed = window.confirm(
      `Delete "${source.source_name}" from Source of Funds?`
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("funding_sources")
      .delete()
      .eq("id", source.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
  };

  return (
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">
            Source of Funds
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Track where the wedding funds are coming from.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 sm:w-auto"
        >
          + Add Source
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-stone-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Funds Planned
          </div>
          <div className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(totals.planned)}
          </div>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Funds Received
          </div>
          <div className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(totals.received)}
          </div>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Yet to Receive
          </div>
          <div className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(totals.balance)}
          </div>
        </div>
      </div>

      {budgetTotal > 0 && (
        <div className="mt-4 rounded-xl border border-stone-200 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-stone-900">
                Funding Position
              </div>
              <div className="text-xs text-stone-500">
                Total budgeted: {formatCurrency(budgetTotal)}
              </div>
            </div>

            <div className="text-sm font-semibold text-stone-900">
              {totals.fundingGap > 0
                ? `${formatCurrency(totals.fundingGap)} funding gap`
                : totals.fundingSurplus > 0
                  ? `${formatCurrency(totals.fundingSurplus)} above budget`
                  : "Fully funded"}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-stone-500">
          Loading sources of funds...
        </div>
      ) : sources.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-stone-300 p-8 text-center">
          <div className="text-sm font-medium text-stone-700">
            No funding sources added yet
          </div>
          <div className="mt-1 text-xs text-stone-500">
            Add the people or families who will contribute towards the wedding.
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {sources.map((source) => {
            const planned = Number(source.planned_amount || 0);
            const received = Number(source.received_amount || 0);
            const balance = planned - received;

            return (
              <div
                key={source.id}
                className="rounded-xl border border-stone-200 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-900">
                      {source.source_name}
                    </div>

                    {source.relationship && (
                      <div className="mt-0.5 text-sm text-stone-500">
                        {source.relationship}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:min-w-[560px]">
                    <div>
                      <div className="text-xs text-stone-500">Planned</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {formatCurrency(planned)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-stone-500">Received</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {formatCurrency(received)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-stone-500">Balance</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {formatCurrency(balance)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-stone-500">Expected</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {source.expected_date
                          ? new Date(
                              `${source.expected_date}T00:00:00`
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 lg:shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(source)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSource(source)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[95vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-stone-900">
                {editingId ? "Edit Source of Funds" : "Add Source of Funds"}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-2xl leading-none text-stone-400 hover:text-stone-700"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Source *
                  </label>
                  <input
                    value={form.source_name}
                    onChange={(e) =>
                      setForm({ ...form, source_name: e.target.value })
                    }
                    placeholder="e.g. Priyesh"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-stone-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Relationship
                  </label>
                  <input
                    value={form.relationship}
                    onChange={(e) =>
                      setForm({ ...form, relationship: e.target.value })
                    }
                    placeholder="e.g. Father of Bride"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-stone-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">
                      Planned Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.planned_amount}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          planned_amount: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-stone-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">
                      Received Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.received_amount}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          received_amount: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-stone-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Expected Date
                  </label>
                  <DateInput
                    value={form.expected_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        expected_date: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-stone-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Optional"
                    className="w-full resize-none rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-stone-500"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-stone-200 px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveSource}
                disabled={saving}
                className="flex-1 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Source"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
