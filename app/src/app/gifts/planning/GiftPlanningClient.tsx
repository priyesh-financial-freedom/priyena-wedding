"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GiftType = {
  id: string;
  gift_name: string;
  gift_category: string | null;
  estimated_unit_cost: number;
  vendor_name: string | null;
  notes: string | null;
  active: boolean;
};

type GuestFamily = {
  id: string;
  family_name: string;
  city: string | null;
};

type GiftPlan = {
  id: string;
  guest_family_id: string | null;
  gift_type_id: string;
  quantity: number;
  status: "planned" | "packed" | "delivered";
  notes: string | null;
  created_at: string;
};

type Props = {
  weddingId: string;
  initialGiftTypes: GiftType[];
  initialFamilies: GuestFamily[];
  initialPlans: GiftPlan[];
};

type GiftTypeForm = {
  gift_name: string;
  gift_category: string;
  estimated_unit_cost: string;
  vendor_name: string;
  notes: string;
};

type GiftPlanForm = {
  guest_family_id: string;
  gift_type_id: string;
  quantity: string;
  status: "planned" | "packed" | "delivered";
  notes: string;
};

const emptyGiftTypeForm: GiftTypeForm = {
  gift_name: "",
  gift_category: "",
  estimated_unit_cost: "0",
  vendor_name: "",
  notes: "",
};

const emptyGiftPlanForm: GiftPlanForm = {
  guest_family_id: "",
  gift_type_id: "",
  quantity: "1",
  status: "planned",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function labelStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function GiftPlanningClient({
  weddingId,
  initialGiftTypes,
  initialFamilies,
  initialPlans,
}: Props) {
  const router = useRouter();
  const [giftTypes] = useState(initialGiftTypes);
  const [families] = useState(initialFamilies);
  const [plans] = useState(initialPlans);

  const [giftTypeOpen, setGiftTypeOpen] = useState(false);
  const [editingGiftType, setEditingGiftType] = useState<GiftType | null>(null);
  const [giftTypeForm, setGiftTypeForm] = useState(emptyGiftTypeForm);

  const [planOpen, setPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<GiftPlan | null>(null);
  const [planForm, setPlanForm] = useState(emptyGiftPlanForm);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const giftTypeMap = useMemo(
    () => new Map(giftTypes.map((gift) => [gift.id, gift])),
    [giftTypes],
  );

  const familyMap = useMemo(
    () => new Map(families.map((family) => [family.id, family])),
    [families],
  );

  const allocationCountByGift = useMemo(() => {
    const counts = new Map<string, number>();
    plans.forEach((plan) => {
      counts.set(plan.gift_type_id, (counts.get(plan.gift_type_id) ?? 0) + 1);
    });
    return counts;
  }, [plans]);

  const familiesAssigned = new Set(
    plans.map((plan) => plan.guest_family_id).filter(Boolean),
  ).size;

  const requiredQuantity = plans.reduce(
    (sum, plan) => sum + Number(plan.quantity || 0),
    0,
  );

  const estimatedCost = plans.reduce((sum, plan) => {
    const gift = giftTypeMap.get(plan.gift_type_id);
    return (
      sum + Number(plan.quantity || 0) * Number(gift?.estimated_unit_cost || 0)
    );
  }, 0);

  const filteredPlans = plans.filter((plan) => {
    const family = plan.guest_family_id
      ? familyMap.get(plan.guest_family_id)
      : null;
    const gift = giftTypeMap.get(plan.gift_type_id);
    const haystack =
      `${family?.family_name ?? ""} ${family?.city ?? ""} ${gift?.gift_name ?? ""} ${plan.status}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  function openAddGiftType() {
    setEditingGiftType(null);
    setGiftTypeForm(emptyGiftTypeForm);
    setError("");
    setGiftTypeOpen(true);
  }

  function openEditGiftType(gift: GiftType) {
    setEditingGiftType(gift);
    setGiftTypeForm({
      gift_name: gift.gift_name,
      gift_category: gift.gift_category ?? "",
      estimated_unit_cost: String(gift.estimated_unit_cost ?? 0),
      vendor_name: gift.vendor_name ?? "",
      notes: gift.notes ?? "",
    });
    setError("");
    setGiftTypeOpen(true);
  }

  function closeGiftType() {
    setGiftTypeOpen(false);
    setEditingGiftType(null);
    setGiftTypeForm(emptyGiftTypeForm);
    setError("");
  }

  async function saveGiftType() {
    const giftName = giftTypeForm.gift_name.trim();
    const unitCost = Number(giftTypeForm.estimated_unit_cost || 0);

    if (!giftName) {
      setError("Gift name is required.");
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setError("Estimated unit cost must be zero or more.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      wedding_id: weddingId,
      gift_name: giftName,
      gift_category: giftTypeForm.gift_category.trim() || null,
      estimated_unit_cost: unitCost,
      vendor_name: giftTypeForm.vendor_name.trim() || null,
      notes: giftTypeForm.notes.trim() || null,
      active: true,
    };

    const result = editingGiftType
      ? await supabase
          .from("gift_types")
          .update(payload)
          .eq("id", editingGiftType.id)
      : await supabase.from("gift_types").insert(payload);

    if (result.error) {
      setError(
        result.error.code === "23505"
          ? "A gift with this name already exists."
          : result.error.message,
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    closeGiftType();
    router.refresh();
  }

  async function deleteGiftType(gift: GiftType) {
    const count = allocationCountByGift.get(gift.id) ?? 0;

    if (count > 0) {
      window.alert(
        `Cannot delete "${gift.gift_name}". ${count} ${count === 1 ? "assignment is" : "assignments are"} linked to this gift.`,
      );
      return;
    }

    if (!window.confirm(`Delete "${gift.gift_name}"?`)) return;

    const { error: deleteError } = await supabase
      .from("gift_types")
      .update({ active: false })
      .eq("id", gift.id);

    if (deleteError) {
      window.alert(`Unable to delete gift: ${deleteError.message}`);
      return;
    }

    router.refresh();
  }

  function openAddPlan() {
    setEditingPlan(null);
    setPlanForm({
      ...emptyGiftPlanForm,
      gift_type_id: giftTypes[0]?.id ?? "",
      guest_family_id: families[0]?.id ?? "",
    });
    setError("");
    setPlanOpen(true);
  }

  function openEditPlan(plan: GiftPlan) {
    setEditingPlan(plan);
    setPlanForm({
      guest_family_id: plan.guest_family_id ?? "",
      gift_type_id: plan.gift_type_id,
      quantity: String(plan.quantity),
      status: plan.status,
      notes: plan.notes ?? "",
    });
    setError("");
    setPlanOpen(true);
  }

  function closePlan() {
    setPlanOpen(false);
    setEditingPlan(null);
    setPlanForm(emptyGiftPlanForm);
    setError("");
  }

  async function savePlan() {
    const quantity = Number(planForm.quantity);

    if (!planForm.guest_family_id) {
      setError("Guest family is required.");
      return;
    }

    if (!planForm.gift_type_id) {
      setError("Gift is required.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      wedding_id: weddingId,
      guest_family_id: planForm.guest_family_id,
      guest_id: null,
      gift_type_id: planForm.gift_type_id,
      quantity,
      status: planForm.status,
      notes: planForm.notes.trim() || null,
    };

    const result = editingPlan
      ? await supabase
          .from("guest_gift_plan")
          .update(payload)
          .eq("id", editingPlan.id)
      : await supabase.from("guest_gift_plan").insert(payload);

    if (result.error) {
      setError(
        result.error.code === "23505"
          ? "This gift is already assigned to this family. Edit the existing assignment instead."
          : result.error.message,
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    closePlan();
    router.refresh();
  }

  async function deletePlan(plan: GiftPlan) {
    const family = plan.guest_family_id
      ? familyMap.get(plan.guest_family_id)
      : null;
    const gift = giftTypeMap.get(plan.gift_type_id);

    if (
      !window.confirm(
        `Delete ${gift?.gift_name ?? "gift"} assignment for ${family?.family_name ?? "this family"}?`,
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("guest_gift_plan")
      .delete()
      .eq("id", plan.id);

    if (deleteError) {
      window.alert(`Unable to delete assignment: ${deleteError.message}`);
      return;
    }

    router.refresh();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Guest Gift Planning
          </h1>
          <p className="mt-2 text-slate-500">
            Assign gifts family-wise to calculate requirements before
            procurement.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openAddGiftType}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Add Gift Type
          </button>
          <button
            type="button"
            onClick={openAddPlan}
            disabled={giftTypes.length === 0 || families.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Gift Assignment
          </button>
        </div>
      </div>

      <section className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Families Assigned" value={String(familiesAssigned)} />
        <Kpi label="Gift Types" value={String(giftTypes.length)} />
        <Kpi label="Required Quantity" value={String(requiredQuantity)} />
        <Kpi label="Estimated Cost" value={formatCurrency(estimatedCost)} />
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Gift Types</h2>
            <p className="mt-1 text-sm text-slate-500">
              Define the gifts available for family assignments.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 text-left">Gift</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-right">Unit Cost</th>
                <th className="px-6 py-3 text-center">Assignments</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {giftTypes.map((gift) => {
                const count = allocationCountByGift.get(gift.id) ?? 0;
                return (
                  <tr key={gift.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {gift.gift_name}
                    </td>
                    <td className="px-6 py-4">{gift.gift_category || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      {formatCurrency(Number(gift.estimated_unit_cost || 0))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          count > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditGiftType(gift)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteGiftType(gift)}
                          disabled={count > 0}
                          title={
                            count > 0
                              ? `${count} assignments use this gift`
                              : `Delete ${gift.gift_name}`
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                            count > 0
                              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                              : "border-red-200 text-red-600 hover:bg-red-50"
                          }`}
                        >
                          {count > 0 ? `In use (${count})` : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {giftTypes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Add a gift type before creating family assignments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Family Gift Assignments
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {plans.length} {plans.length === 1 ? "assignment" : "assignments"}{" "}
              planned.
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search family, city, gift or status"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500 sm:max-w-sm"
          />
        </div>

        <div className="divide-y md:hidden">
          {filteredPlans.map((plan) => {
            const family = plan.guest_family_id
              ? familyMap.get(plan.guest_family_id)
              : null;
            const gift = giftTypeMap.get(plan.gift_type_id);
            return (
              <div key={plan.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {family?.family_name ?? "Unknown family"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {family?.city || "City not specified"}
                    </p>
                  </div>
                  <StatusBadge status={plan.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Gift
                    </p>
                    <p className="mt-1 font-semibold">
                      {gift?.gift_name ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Quantity
                    </p>
                    <p className="mt-1 font-semibold">{plan.quantity}</p>
                  </div>
                </div>
                {plan.notes && (
                  <p className="mt-4 text-sm text-slate-600">{plan.notes}</p>
                )}
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditPlan(plan)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePlan(plan)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 text-left">Family</th>
                <th className="px-6 py-3 text-left">City</th>
                <th className="px-6 py-3 text-left">Gift</th>
                <th className="px-6 py-3 text-right">Qty</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Notes</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPlans.map((plan) => {
                const family = plan.guest_family_id
                  ? familyMap.get(plan.guest_family_id)
                  : null;
                const gift = giftTypeMap.get(plan.gift_type_id);
                return (
                  <tr key={plan.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {family?.family_name ?? "Unknown family"}
                    </td>
                    <td className="px-6 py-4">{family?.city || "-"}</td>
                    <td className="px-6 py-4">{gift?.gift_name ?? "-"}</td>
                    <td className="px-6 py-4 text-right">{plan.quantity}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="max-w-xs truncate px-6 py-4">
                      {plan.notes || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditPlan(plan)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deletePlan(plan)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPlans.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No matching gift assignments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {giftTypeOpen && (
        <Modal
          title={editingGiftType ? "Edit Gift Type" : "Add Gift Type"}
          onClose={closeGiftType}
        >
          <Field label="Gift Name *">
            <input
              autoFocus
              value={giftTypeForm.gift_name}
              onChange={(event) =>
                setGiftTypeForm({
                  ...giftTypeForm,
                  gift_name: event.target.value,
                })
              }
              className="input"
            />
          </Field>
          <Field label="Category">
            <input
              value={giftTypeForm.gift_category}
              onChange={(event) =>
                setGiftTypeForm({
                  ...giftTypeForm,
                  gift_category: event.target.value,
                })
              }
              className="input"
            />
          </Field>
          <Field label="Estimated Unit Cost">
            <input
              type="number"
              min="0"
              step="0.01"
              value={giftTypeForm.estimated_unit_cost}
              onChange={(event) =>
                setGiftTypeForm({
                  ...giftTypeForm,
                  estimated_unit_cost: event.target.value,
                })
              }
              className="input"
            />
          </Field>
          <Field label="Vendor">
            <input
              value={giftTypeForm.vendor_name}
              onChange={(event) =>
                setGiftTypeForm({
                  ...giftTypeForm,
                  vendor_name: event.target.value,
                })
              }
              className="input"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={giftTypeForm.notes}
              onChange={(event) =>
                setGiftTypeForm({ ...giftTypeForm, notes: event.target.value })
              }
              rows={3}
              className="input"
            />
          </Field>
          <ModalActions
            saving={saving}
            onCancel={closeGiftType}
            onSave={() => void saveGiftType()}
          />
        </Modal>
      )}

      {planOpen && (
        <Modal
          title={editingPlan ? "Edit Gift Assignment" : "Add Gift Assignment"}
          onClose={closePlan}
        >
          <Field label="Guest Family *">
            <select
              value={planForm.guest_family_id}
              onChange={(event) =>
                setPlanForm({
                  ...planForm,
                  guest_family_id: event.target.value,
                })
              }
              className="input"
            >
              <option value="">Select family</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.family_name}
                  {family.city ? ` - ${family.city}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gift *">
            <select
              value={planForm.gift_type_id}
              onChange={(event) =>
                setPlanForm({ ...planForm, gift_type_id: event.target.value })
              }
              className="input"
            >
              <option value="">Select gift</option>
              {giftTypes.map((gift) => (
                <option key={gift.id} value={gift.id}>
                  {gift.gift_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity *">
            <input
              type="number"
              min="1"
              step="1"
              value={planForm.quantity}
              onChange={(event) =>
                setPlanForm({ ...planForm, quantity: event.target.value })
              }
              className="input"
            />
          </Field>
          <Field label="Status *">
            <select
              value={planForm.status}
              onChange={(event) =>
                setPlanForm({
                  ...planForm,
                  status: event.target.value as GiftPlanForm["status"],
                })
              }
              className="input"
            >
              <option value="planned">Planned</option>
              <option value="packed">Packed</option>
              <option value="delivered">Delivered</option>
            </select>
          </Field>
          <Field label="Notes">
            <textarea
              value={planForm.notes}
              onChange={(event) =>
                setPlanForm({ ...planForm, notes: event.target.value })
              }
              rows={3}
              className="input"
            />
          </Field>
          <ModalActions
            saving={saving}
            onCancel={closePlan}
            onSave={() => void savePlan()}
          />
        </Modal>
      )}

      {error && (
        <div className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-lg">
          {error}
        </div>
      )}

      <style jsx global>{`
        .input {
          margin-top: 0.375rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: rgb(100 116 139);
        }
      `}</style>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: GiftPlan["status"] }) {
  const style =
    status === "delivered"
      ? "bg-green-100 text-green-800"
      : status === "packed"
        ? "bg-blue-100 text-blue-800"
        : "bg-amber-100 text-amber-800";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
      {labelStatus(status)}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-slate-700"
          >
            x
          </button>
        </div>
        <div className="space-y-4 px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ModalActions({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 border-t pt-5">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
