import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api, withVid } from "./api";
import type { Booking } from "./Types";
import { Trash2 } from "lucide-react";

type NewBooking = {
  position: string;
  fromDate: string;
  toDate: string;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

export default function App() {
  const [vid, setVid] = useState("");
  const [savingVid, setSavingVid] = useState(false);

  const [position, setPosition] = useState("SBSP_APP");
  const [fromDate, setFromDate] = useState<string>(() =>
    dayjs().add(1, "hour").minute(0).second(0).millisecond(0).toISOString()
  );
  const [toDate, setToDate] = useState<string>(() =>
    dayjs().add(2, "hour").minute(0).second(0).millisecond(0).toISOString()
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fromLocal = useMemo(
    () => dayjs(fromDate).format("YYYY-MM-DDTHH:mm"),
    [fromDate]
  );
  const toLocal = useMemo(
    () => dayjs(toDate).format("YYYY-MM-DDTHH:mm"),
    [toDate]
  );

  useEffect(() => {
    const stored = localStorage.getItem("ivao_vid");
    if (stored) setVid(stored);
  }, []);

  useEffect(() => {
    refresh();
  }, [vid]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await api.get<Booking[]>("/bookings/future", withVid(vid || ""));
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveVid() {
    setSavingVid(true);
    try {
      localStorage.setItem("ivao_vid", vid);
      await refresh();
    } finally {
      setSavingVid(false);
    }
  }

  async function createBooking() {
    setCreating(true);
    const payload: NewBooking = {
      position,
      fromDate,
      toDate,
    };
    try {
      await api.post("/bookings", payload, withVid(vid));
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function deleteBooking(id: number) {
    try {
      await api.delete(`/bookings/${id}`, withVid(vid));
      setBookings((prev) => prev.filter((b) => (b as any).id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      { }
      <header className="border-b border-white/10 bg-neutral-950/60 backdrop-blur">
        <Container>
          <div className="py-5 flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              IVAO <span className="text-indigo-400">Bookings</span>
            </h1>

            <div className="flex items-center gap-2">
              <input
                value={vid}
                onChange={(e) => setVid(e.target.value)}
                placeholder="Your IVAO VID"
                className="w-48 rounded-xl bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
              />
              <button
                onClick={saveVid}
                disabled={!vid || savingVid}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition",
                  "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600"
                )}
              >
                {savingVid ? "Saving..." : "Save VID"}
              </button>
            </div>
          </div>
        </Container>
      </header>

      { }
      <main className="py-8">
        <Container>
          <div className="space-y-8">
          { }
          <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-lg">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-neutral-400 mb-1">Position</label>
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
                  placeholder="e.g. SBSP_APP"
                />
              </div>

              <div className="min-w-[220px]">
                <label className="block text-xs text-neutral-400 mb-1">Start</label>
                <input
                  type="datetime-local"
                  value={fromLocal}
                  onChange={(e) => setFromDate(dayjs(e.target.value).toISOString())}
                  className="w-full rounded-xl bg-neutral-950 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
                />
              </div>

              <div className="min-w-[220px]">
                <label className="block text-xs text-neutral-400 mb-1">End</label>
                <input
                  type="datetime-local"
                  value={toLocal}
                  onChange={(e) => setToDate(dayjs(e.target.value).toISOString())}
                  className="w-full rounded-xl bg-neutral-950 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
                />
              </div>

              <button
                onClick={createBooking}
                disabled={!vid || creating}
                className={cn(
                  "rounded-xl px-5 py-2.5 text-sm font-semibold transition",
                  "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
                )}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </section>

          { }
          <section className="rounded-2xl border border-white/10 bg-neutral-900/60 shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold">Upcoming</h2>
              <button
                onClick={refresh}
                className="rounded-xl px-4 py-2 text-sm font-medium bg-neutral-800 hover:bg-neutral-700 transition"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="text-left text-xs uppercase tracking-wide text-neutral-400">
                  <tr className="[&>th]:px-5 [&>th]:py-3 border-b border-white/10">
                    <th>ID</th>
                    <th>Position</th>
                    <th>Time in</th>
                    <th>Time out</th>
                    <th>VID</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {bookings.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-neutral-400">
                        No upcoming bookings.
                      </td>
                    </tr>
                  )}

                  {bookings.map((b) => (
                    <tr
                      key={(b as any).id}
                      className="border-b border-white/5 hover:bg-neutral-800/40 transition"
                    >
                      <td className="px-5 py-3">{(b as any).id}</td>
                      <td className="px-5 py-3">
                        {(b as any).position ||
                          (b as any).posicao ||
                          (b as any).posição ||
                          b.position}
                      </td>
                      <td className="px-5 py-3">
                        {dayjs((b as any).start || (b as any).fromDate).format("YYYY-MM-DD HH:mm")}
                      </td>
                      <td className="px-5 py-3">
                        {dayjs((b as any).end || (b as any).toDate).format("YYYY-MM-DD HH:mm")}
                      </td>
                      <td className="px-5 py-3">{(b as any).vid}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => deleteBooking((b as any).id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-red-600/90 hover:bg-red-600 transition"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          </div>
        </Container>
      </main>
    </div>
  );
}
