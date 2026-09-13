import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import FunctionAttendanceActions from "./FunctionAttendanceActions";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function FunctionDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const {
    data: functionData,
    error: functionError,
  } = await supabase
    .from("functions")
    .select(
      "id, name, function_date, venue, start_time, end_time, sequence_number, wedding_id"
    )
    .eq("id", id)
    .single();

  if (functionError || !functionData) {
    console.error("Function query failed:", functionError);
    notFound();
  }

  const [familiesResult, individualsResult] = await Promise.all([
    supabase
      .from("guest_families")
      .select(
        "id, family_name, primary_contact_name, guest_count, rsvp_status, vip_status"
      )
      .eq("wedding_id", functionData.wedding_id)
      .order("family_name"),

    supabase
      .from("guests")
      .select(
        "id, full_name, rsvp_status, vip_status"
      )
      .eq("wedding_id", functionData.wedding_id)
      .is("guest_family_id", null)
      .order("full_name"),
  ]);

  if (familiesResult.error) {
    console.error(
      "Function families query failed:",
      familiesResult.error
    );
  }

  if (individualsResult.error) {
    console.error(
      "Function individual guests query failed:",
      individualsResult.error
    );
  }

  const families = (familiesResult.data ?? []) as Family[];
  const individuals = (individualsResult.data ?? []) as IndividualGuest[];

  const [familyAttendanceResult, individualAttendanceResult] =
    await Promise.all([
      supabase
        .from("family_function_attendance")
        .select(
          "guest_family_id, attendance_status, checked_in_at"
        )
        .eq("function_id", id),

      supabase
        .from("guest_function_attendance")
        .select(
          "guest_id, attendance_status, checked_in_at"
        )
        .eq("function_id", id),
    ]);

  if (familyAttendanceResult.error) {
    console.error(
      "Family attendance query failed:",
      familyAttendanceResult.error
    );
  }

  if (individualAttendanceResult.error) {
    console.error(
      "Individual attendance query failed:",
      individualAttendanceResult.error
    );
  }

  const familyAttendance =
    (familyAttendanceResult.data ?? []) as FamilyAttendance[];

  const individualAttendance =
    (individualAttendanceResult.data ??
      []) as IndividualAttendance[];

  const familyAttendanceMap = new Map(
    familyAttendance.map((item) => [
      item.guest_family_id,
      {
        attendance_status: item.attendance_status,
        checked_in_at: item.checked_in_at,
      },
    ])
  );

  const individualAttendanceMap = new Map(
    individualAttendance.map((item) => [
      item.guest_id,
      {
        attendance_status: item.attendance_status,
        checked_in_at: item.checked_in_at,
      },
    ])
  );

  const totalFamilyPersons = families.reduce(
    (total, family) => total + (family.guest_count ?? 0),
    0
  );

  const totalIndividualPersons = individuals.length;

  const totalPersons =
    totalFamilyPersons + totalIndividualPersons;

  let attendingCount = 0;
  let checkedInCount = 0;
  let notAttendingCount = 0;
  let pendingCount = 0;

  for (const family of families) {
    const status =
      familyAttendanceMap.get(family.id)?.attendance_status ||
      "pending";

    const count = family.guest_count ?? 0;

    if (status === "attending") {
      attendingCount += count;
    } else if (status === "checked_in") {
      checkedInCount += count;
    } else if (status === "not_attending") {
      notAttendingCount += count;
    } else {
      pendingCount += count;
    }
  }

  for (const individual of individuals) {
    const status =
      individualAttendanceMap.get(individual.id)?.attendance_status ||
      "pending";

    if (status === "attending") {
      attendingCount += 1;
    } else if (status === "checked_in") {
      checkedInCount += 1;
    } else if (status === "not_attending") {
      notAttendingCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6 flex flex-wrap gap-4">
          <Link
            href="/functions"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Wedding Functions
          </Link>

          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex flex-col justify-between gap-6 md:flex-row">
            <div>
              <h1 className="text-3xl font-bold">
                {functionData.name}
              </h1>

              <p className="mt-1 text-slate-500">
                Function Attendance
              </p>

              <div className="mt-4 space-y-1 text-sm text-slate-600">
                <div>
                  Date:{" "}
                  {functionData.function_date || "Not set"}
                </div>

                <div>
                  Venue:{" "}
                  {functionData.venue || "Not set"}
                </div>

                <div>
                  Time:{" "}
                  {functionData.start_time
                    ? `${functionData.start_time}${
                        functionData.end_time
                          ? ` – ${functionData.end_time}`
                          : ""
                      }`
                    : "Not set"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-lg bg-slate-100 p-4 text-center">
                <div className="text-2xl font-bold">
                  {totalPersons}
                </div>
                <div className="text-xs text-slate-500">
                  Persons
                </div>
              </div>

              <div className="rounded-lg bg-green-100 p-4 text-center">
                <div className="text-2xl font-bold text-green-800">
                  {attendingCount}
                </div>
                <div className="text-xs text-green-700">
                  Attending
                </div>
              </div>

              <div className="rounded-lg bg-orange-100 p-4 text-center">
                <div className="text-2xl font-bold text-orange-800">
                  {pendingCount}
                </div>
                <div className="text-xs text-orange-700">
                  Pending
                </div>
              </div>

              <div className="rounded-lg bg-blue-100 p-4 text-center">
                <div className="text-2xl font-bold text-blue-800">
                  {checkedInCount}
                </div>
                <div className="text-xs text-blue-700">
                  Checked In
                </div>
              </div>

              <div className="rounded-lg bg-red-100 p-4 text-center">
                <div className="text-2xl font-bold text-red-800">
                  {notAttendingCount}
                </div>
                <div className="text-xs text-red-700">
                  Not Attending
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">
              Guest Attendance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage attendance by family invitation or direct guest.
            </p>
          </div>

          <FunctionAttendanceActions
            functionId={functionData.id}
            families={families}
            individuals={individuals}
            familyAttendance={familyAttendance}
            individualAttendance={individualAttendance}
          />
        </div>

      </div>
    </main>
  );
}
