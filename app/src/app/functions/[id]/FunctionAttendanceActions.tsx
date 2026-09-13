"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Family = {
  id: string;
  family_name: string;
  primary_contact_name: string | null;
  guest_count: number;
  rsvp_status: string | null;
  vip_status: boolean;
};

type IndividualGuest = {
  id: string;
  full_name: string;
  rsvp_status: string | null;
  vip_status: boolean;
};

type FamilyAttendance = {
  guest_family_id: string;
  attendance_status: string | null;
  checked_in_at: string | null;
};

type IndividualAttendance = {
  guest_id: string;
  attendance_status: string | null;
  checked_in_at: string | null;
};

type Props = {
  functionId: string;
  families: Family[];
  individuals: IndividualGuest[];
  familyAttendance: FamilyAttendance[];
  individualAttendance: IndividualAttendance[];
};

const STATUS_OPTIONS = [
  {
    value: "attending",
    label: "Attending",
  },
  {
    value: "not_attending",
    label: "Not Attending",
  },
  {
    value: "checked_in",
    label: "Checked In",
  },
  {
    value: "pending",
    label: "Pending",
  },
];

export default function FunctionAttendanceActions({
  functionId,
  families,
  individuals,
  familyAttendance,
  individualAttendance,
}: Props) {
  const router = useRouter();

  const initialStatuses = new Map<string, string>();

  familyAttendance.forEach((item) => {
    initialStatuses.set(
      `family:${item.guest_family_id}`,
      item.attendance_status || "pending"
    );
  });

  individualAttendance.forEach((item) => {
    initialStatuses.set(
      `individual:${item.guest_id}`,
      item.attendance_status || "pending"
    );
  });

  const [statuses, setStatuses] =
    useState<Map<string, string>>(initialStatuses);

  const [savingUnit, setSavingUnit] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  async function updateFamilyAttendance(
    familyId: string,
    status: string
  ) {
    const key = `family:${familyId}`;

    setSavingUnit(key);
    setError("");

    if (status === "pending") {
      const { error: deleteError } = await supabase
        .from("family_function_attendance")
        .delete()
        .eq("guest_family_id", familyId)
        .eq("function_id", functionId);

      if (deleteError) {
        console.error(
          "Family attendance reset failed:",
          deleteError
        );
        setError("Unable to update family attendance.");
        setSavingUnit(null);
        return;
      }

      setStatuses((previous) => {
        const next = new Map(previous);
        next.delete(key);
        return next;
      });
    } else {
      const checkedInAt =
        status === "checked_in"
          ? new Date().toISOString()
          : null;

      const { error: upsertError } = await supabase
        .from("family_function_attendance")
        .upsert(
          {
            guest_family_id: familyId,
            function_id: functionId,
            attendance_status: status,
            checked_in_at: checkedInAt,
          },
          {
            onConflict: "guest_family_id,function_id",
          }
        );

      if (upsertError) {
        console.error("Family attendance update failed:", {
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code,
          error: upsertError,
        });
        setError(
          `Unable to update family attendance: ${
            upsertError.message || "Unknown database error"
          }`
        );
        setSavingUnit(null);
        return;
      }

      setStatuses((previous) => {
        const next = new Map(previous);
        next.set(key, status);
        return next;
      });
    }

    setSavingUnit(null);
    router.refresh();
  }

  async function updateIndividualAttendance(
    guestId: string,
    status: string
  ) {
    const key = `individual:${guestId}`;

    setSavingUnit(key);
    setError("");

    if (status === "pending") {
      const { error: deleteError } = await supabase
        .from("guest_function_attendance")
        .delete()
        .eq("guest_id", guestId)
        .eq("function_id", functionId);

      if (deleteError) {
        console.error(
          "Individual attendance reset failed:",
          deleteError
        );
        setError("Unable to update guest attendance.");
        setSavingUnit(null);
        return;
      }

      setStatuses((previous) => {
        const next = new Map(previous);
        next.delete(key);
        return next;
      });
    } else {
      const checkedInAt =
        status === "checked_in"
          ? new Date().toISOString()
          : null;

      const { error: upsertError } = await supabase
        .from("guest_function_attendance")
        .upsert(
          {
            guest_id: guestId,
            function_id: functionId,
            attendance_status: status,
            checked_in_at: checkedInAt,
          },
          {
            onConflict: "guest_id,function_id",
          }
        );

      if (upsertError) {
        console.error(
          "Individual attendance update failed:",
          upsertError
        );
        setError("Unable to update guest attendance.");
        setSavingUnit(null);
        return;
      }

      setStatuses((previous) => {
        const next = new Map(previous);
        next.set(key, status);
        return next;
      });
    }

    setSavingUnit(null);
    router.refresh();
  }

  function StatusButtons({
    status,
    saving,
    onUpdate,
  }: {
    status: string;
    saving: boolean;
    onUpdate: (status: string) => void;
  }) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            disabled={saving}
            onClick={() => onUpdate(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              status === option.value
                ? option.value === "attending"
                  ? "bg-green-600 text-white"
                  : option.value === "not_attending"
                    ? "bg-red-600 text-white"
                    : option.value === "checked_in"
                      ? "bg-blue-600 text-white"
                      : "bg-orange-500 text-white"
                : option.value === "attending"
                  ? "bg-green-50 text-green-800 hover:bg-green-100"
                  : option.value === "not_attending"
                    ? "bg-red-50 text-red-800 hover:bg-red-100"
                    : option.value === "checked_in"
                      ? "bg-blue-50 text-blue-800 hover:bg-blue-100"
                      : "bg-orange-50 text-orange-800 hover:bg-orange-100"
            }`}
          >
            {option.label}
          </button>
        ))}

        {saving && (
          <span className="ml-1 text-xs text-slate-500">
            Saving...
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Family invitations */}
      <section>
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="text-lg font-semibold">
              Family Invitations
            </h3>

            <p className="text-sm text-slate-500">
              Attendance is recorded for the family as one invitation unit.
            </p>
          </div>
        </div>

        <div className="divide-y">
          {families.map((family) => {
            const key = `family:${family.id}`;

            const status =
              statuses.get(key) || "pending";

            const saving = savingUnit === key;

            return (
              <div
                key={family.id}
                className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-slate-900">
                      {family.family_name}
                    </div>

                    {family.vip_status && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        VIP
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Head:{" "}
                    {family.primary_contact_name ||
                      "Not specified"}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    <strong className="text-slate-700">
                      {family.guest_count}
                    </strong>{" "}
                    {family.guest_count === 1
                      ? "person"
                      : "persons"}
                    {" · "}
                    RSVP:{" "}
                    <span className="capitalize">
                      {family.rsvp_status || "pending"}
                    </span>
                  </div>
                </div>

                <StatusButtons
                  status={status}
                  saving={saving}
                  onUpdate={(nextStatus) =>
                    updateFamilyAttendance(
                      family.id,
                      nextStatus
                    )
                  }
                />
              </div>
            );
          })}
        </div>

        {families.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500">
            No family invitations found.
          </div>
        )}
      </section>

      {/* Individual guests */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="text-lg font-semibold">
              Direct Guests
            </h3>

            <p className="text-sm text-slate-500">
              Guests who are not part of a family group.
            </p>
          </div>
        </div>

        <div className="divide-y">
          {individuals.map((guest) => {
            const key = `individual:${guest.id}`;

            const status =
              statuses.get(key) || "pending";

            const saving = savingUnit === key;

            return (
              <div
                key={guest.id}
                className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-slate-900">
                      {guest.full_name}
                    </div>

                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      Individual
                    </span>

                    {guest.vip_status && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        VIP
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    1 person · RSVP:{" "}
                    <span className="capitalize">
                      {guest.rsvp_status || "pending"}
                    </span>
                  </div>
                </div>

                <StatusButtons
                  status={status}
                  saving={saving}
                  onUpdate={(nextStatus) =>
                    updateIndividualAttendance(
                      guest.id,
                      nextStatus
                    )
                  }
                />
              </div>
            );
          })}
        </div>

        {individuals.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500">
            No direct guests found.
          </div>
        )}
      </section>
    </div>
  );
}
