import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AddFunctionModal from "./AddFunctionModal";

type Family = {
  id: string;
  guest_count: number;
};

type FamilyAttendance = {
  function_id: string;
  guest_family_id: string;
  attendance_status: string | null;
};

type IndividualAttendance = {
  function_id: string;
  guest_id: string;
  attendance_status: string | null;
};

export default async function FunctionsPage() {
  const { data: functions, error } = await supabase
    .from("functions")
    .select(
      "id, name, function_date, venue, start_time, end_time, sequence_number, wedding_id"
    )
    .order("sequence_number");

  if (error) {
    console.error("Functions query failed:", error);
  }

  const functionList = functions ?? [];

  const weddingIds = [
    ...new Set(
      functionList
        .map((fn) => fn.wedding_id)
        .filter(Boolean)
    ),
  ];

  let families: Family[] = [];

  if (weddingIds.length > 0) {
    const { data, error: familyError } = await supabase
      .from("guest_families")
      .select("id, guest_count")
      .in("wedding_id", weddingIds);

    if (familyError) {
      console.error(
        "Function dashboard families query failed:",
        familyError
      );
    } else {
      families = data ?? [];
    }
  }

  const familyCountMap = new Map<string, number>();

  families.forEach((family) => {
    familyCountMap.set(
      family.id,
      family.guest_count ?? 0
    );
  });

  const functionIds = functionList.map((fn) => fn.id);

  let familyAttendance: FamilyAttendance[] = [];
  let individualAttendance: IndividualAttendance[] = [];

  if (functionIds.length > 0) {
    const [familyAttendanceResult, individualAttendanceResult] =
      await Promise.all([
        supabase
          .from("family_function_attendance")
          .select(
            "function_id, guest_family_id, attendance_status"
          )
          .in("function_id", functionIds),

        supabase
          .from("guest_function_attendance")
          .select(
            "function_id, guest_id, attendance_status"
          )
          .in("function_id", functionIds),
      ]);

    if (familyAttendanceResult.error) {
      console.error(
        "Family attendance query failed:",
        familyAttendanceResult.error
      );
    } else {
      familyAttendance =
        familyAttendanceResult.data ?? [];
    }

    if (individualAttendanceResult.error) {
      console.error(
        "Individual attendance query failed:",
        individualAttendanceResult.error
      );
    } else {
      individualAttendance =
        individualAttendanceResult.data ?? [];
    }
  }

  const attendanceByFunction = new Map<
    string,
    { attending: number; records: number }
  >();

  for (const record of familyAttendance) {
    const current =
      attendanceByFunction.get(record.function_id) ?? {
        attending: 0,
        records: 0,
      };

    current.records += 1;

    if (
      record.attendance_status?.toLowerCase() ===
      "attending"
    ) {
      current.attending +=
        familyCountMap.get(record.guest_family_id) ?? 0;
    }

    if (
      record.attendance_status?.toLowerCase() ===
      "checked_in"
    ) {
      current.attending +=
        familyCountMap.get(record.guest_family_id) ?? 0;
    }

    attendanceByFunction.set(
      record.function_id,
      current
    );
  }

  for (const record of individualAttendance) {
    const current =
      attendanceByFunction.get(record.function_id) ?? {
        attending: 0,
        records: 0,
      };

    current.records += 1;

    if (
      record.attendance_status?.toLowerCase() ===
        "attending" ||
      record.attendance_status?.toLowerCase() ===
        "checked_in"
    ) {
      current.attending += 1;
    }

    attendanceByFunction.set(
      record.function_id,
      current
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Wedding Functions
            </h1>

            <p className="mt-2 text-slate-600">
              Priyena Wedding Planner
            </p>
          </div>

          <AddFunctionModal />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {functionList.map((fn) => {
            const stats =
              attendanceByFunction.get(fn.id) ?? {
                attending: 0,
                records: 0,
              };

            return (
              <Link
                key={fn.id}
                href={`/functions/${fn.id}`}
                className="rounded-xl bg-white p-6 shadow transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {fn.name}
                    </h2>

                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <div>
                        Date:{" "}
                        {fn.function_date || "Not set"}
                      </div>

                      <div>
                        Venue:{" "}
                        {fn.venue || "Not set"}
                      </div>

                      <div>
                        Time:{" "}
                        {fn.start_time
                          ? `${fn.start_time}${
                              fn.end_time
                                ? ` – ${fn.end_time}`
                                : ""
                            }`
                          : "Not set"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-100 px-4 py-3 text-center">
                    <div className="text-2xl font-bold">
                      {stats.attending}
                    </div>

                    <div className="text-xs text-slate-500">
                      attending
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4 text-sm text-slate-600">
                  Attendance records: {stats.records}
                </div>
              </Link>
            );
          })}
        </div>

        {functionList.length === 0 && (
          <div className="mt-8 rounded-xl bg-white p-8 text-center shadow">
            No wedding functions found.
          </div>
        )}

      </div>
    </main>
  );
}
