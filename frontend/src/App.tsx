import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Trash2, Pencil, Save, X } from "lucide-react";
import { api, withVid } from "./api";
import type { Booking } from "./Types";

dayjs.extend(utc);

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function fmtInputUTC(iso: string) {
  return dayjs.utc(iso).format("YYYY-MM-DDTHH:mm");
}
function parseInputUTC(v: string) {
  return dayjs.utc(v).toISOString();
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">{children}</div>
  );
}

type ConfirmState = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  infoOnly?: boolean;
} | null;

function ConfirmModal({
  state,
  onClose,
}: {
  state: ConfirmState;
  onClose: () => void;
}) {
  if (!state) return null;
  const {
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    infoOnly,
  } = state;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        {message && <p className="text-sm text-neutral-300 mb-4">{message}</p>}
        <div
          className={cn(
            "flex gap-2",
            infoOnly ? "justify-end" : "justify-between"
          )}
        >
          {!infoOnly && (
            <button
              onClick={() => {
                onCancel?.();
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 px-4 py-2 text-sm"
            >
              <X className="h-4 w-4" />
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm"
          >
            {infoOnly ? (
              <X className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {infoOnly ? "OK" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

type NewBooking = {
  position: string;
  fromDate: string;
  toDate: string;
};

export default function App() {
  const [vid, setVid] = useState("");
  const [savingVid, setSavingVid] = useState(false);

  const [position, setPosition] = useState("SBSP_APP");
  const [fromDate, setFromDate] = useState<string>(() =>
    dayjs.utc().add(1, "hour").minute(0).second(0).millisecond(0).toISOString()
  );
  const [toDate, setToDate] = useState<string>(() =>
    dayjs.utc().add(2, "hour").minute(0).second(0).millisecond(0).toISOString()
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    position: string;
    fromDate: string;
    toDate: string;
  } | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const [nowUTC, setNowUTC] = useState<string>(
    dayjs.utc().format("YYYY-MM-DD HH:mm:ss [UTC]")
  );
  useEffect(() => {
    const id = setInterval(() => {
      setNowUTC(dayjs.utc().format("YYYY-MM-DD HH:mm:ss [UTC]"));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("ivao_vid");
    if (stored) setVid(stored);
  }, []);
  useEffect(() => {
    refresh();
  }, [vid]);

  const fromLocal = useMemo(() => fmtInputUTC(fromDate), [fromDate]);
  const toLocal = useMemo(() => fmtInputUTC(toDate), [toDate]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await api.get<Booking[]>(
        "/bookings/future",
        withVid(vid || "")
      );
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

  function validateWindow(startISO: string, endISO: string): string | null {
    const start = dayjs.utc(startISO);
    const end = dayjs.utc(endISO);
    const now = dayjs.utc();

    if (!start.isValid() || !end.isValid()) return "Invalid date(s).";
    if (!end.isAfter(start)) return "End date must be after start date (UTC).";
    if (start.isBefore(now)) return "Start date must be in the future (UTC).";
    if (end.diff(start, "minute") < 30)
      return "Minimum booking length is 30 minutes.";
    return null;
  }

  function askCreate() {
    const err = validateWindow(fromDate, toDate);
    if (err) {
      setConfirm({
        title: "Invalid booking window",
        message: err,
        infoOnly: true,
      });
      return;
    }

    setConfirm({
      title: "Create booking?",
      message: `Position ${position} • ${dayjs
        .utc(fromDate)
        .format("YYYY-MM-DD HH:mm")} → ${dayjs
        .utc(toDate)
        .format("YYYY-MM-DD HH:mm")} (UTC)`,
      confirmText: "Create",
      onConfirm: createBooking,
    });
  }

  async function createBooking() {
    setCreating(true);
    const payload: NewBooking = { position, fromDate, toDate };
    try {
      await api.post("/bookings", payload, withVid(vid));
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(b: any) {
    setEditId(b.id);
    setEditForm({
      position: b.position || b.posicao || b.posição || "",
      fromDate: b.fromDate || b.start,
      toDate: b.toDate || b.end,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm(null);
  }

  function askSaveEdit() {
    if (!editId || !editForm) return;
    const err = validateWindow(editForm.fromDate, editForm.toDate);
    if (err) {
      setConfirm({
        title: "Invalid booking window",
        message: err,
        infoOnly: true,
      });
      return;
    }
    setConfirm({
      title: "Save changes?",
      message: `Position ${editForm.position} • ${dayjs
        .utc(editForm.fromDate)
        .format("YYYY-MM-DD HH:mm")} → ${dayjs
        .utc(editForm.toDate)
        .format("YYYY-MM-DD HH:mm")} (UTC)`,
      confirmText: "Save",
      onConfirm: saveEdit,
      onCancel: () => {},
    });
  }

  async function saveEdit() {
    if (!editId || !editForm) return;
    try {
      await api.put(
        `/bookings/${editId}`,
        {
          position: editForm.position,
          fromDate: editForm.fromDate,
          toDate: editForm.toDate,
        },
        withVid(vid)
      );
      setEditId(null);
      setEditForm(null);
      await refresh();
    } catch (err) {
      console.error(err);
    }
  }

  function askDelete(id: number) {
    setConfirm({
      title: "Delete booking?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      onConfirm: () => deleteBooking(id),
      onCancel: () => {},
    });
  }

  async function deleteBooking(id: number) {
    try {
      await api.delete(`/bookings/${id}`, withVid(vid));
      setBookings((prev) => prev.filter((b: any) => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-950 text-neutral-100">
      {}
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

      {}
      <main className="flex-1 py-8 space-y-8">
        <Container>
          <div className="space-y-8">
            {}
            <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-lg">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-neutral-400 mb-1">
                    Position
                  </label>
                  <input
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
                    placeholder="e.g. SBSP_APP"
                  />
                </div>

                <div className="min-w-[220px]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-neutral-400">
                      Start
                    </label>
                    <span className="text-[10px] text-neutral-400">UTC</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={fromLocal}
                    min={fmtInputUTC(dayjs.utc().toISOString())}
                    onChange={(e) => setFromDate(parseInputUTC(e.target.value))}
                    className="w-full rounded-xl bg-neutral-950 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
                  />
                </div>

                <div className="min-w-[220px]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-neutral-400">
                      End
                    </label>
                    <span className="text-[10px] text-neutral-400">UTC</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={toLocal}
                    min={fmtInputUTC(dayjs.utc().toISOString())}
                    onChange={(e) => setToDate(parseInputUTC(e.target.value))}
                    className="w-full rounded-xl bg-neutral-950 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
                  />
                </div>

                <button
                  onClick={askCreate}
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

            {}
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
                      <th className="text-right pr-5">Actions</th>
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

                    {bookings.map((b: any) => {
                      const isMine = String(b.vid) === String(vid);
                      const isEditing = editId === b.id;

                      if (isEditing && editForm) {
                        return (
                          <tr key={b.id} className="border-b border-white/5">
                            <td className="px-5 py-3">{b.id}</td>
                            <td className="px-5 py-3">
                              <input
                                value={editForm.position}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    position: e.target.value,
                                  })
                                }
                                className="w-40 rounded-lg bg-neutral-950 border border-white/10 px-2 py-1 text-sm outline-none focus:ring-2 ring-indigo-500"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <input
                                type="datetime-local"
                                value={fmtInputUTC(editForm.fromDate)}
                                min={fmtInputUTC(dayjs.utc().toISOString())}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    fromDate: parseInputUTC(e.target.value),
                                  })
                                }
                                className="rounded-lg bg-neutral-950 border border-white/10 px-2 py-1 text-sm outline-none focus:ring-2 ring-indigo-500"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <input
                                type="datetime-local"
                                value={fmtInputUTC(editForm.toDate)}
                                min={fmtInputUTC(dayjs.utc().toISOString())}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    toDate: parseInputUTC(e.target.value),
                                  })
                                }
                                className="rounded-lg bg-neutral-950 border border-white/10 px-2 py-1 text-sm outline-none focus:ring-2 ring-indigo-500"
                              />
                            </td>
                            <td className="px-5 py-3">{b.vid}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={askSaveEdit}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 transition"
                                  title="Save"
                                >
                                  <Save className="h-4 w-4" /> Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 transition"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" /> Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={b.id}
                          className="border-b border-white/5 hover:bg-neutral-800/40 transition"
                        >
                          <td className="px-5 py-3">{b.id}</td>
                          <td className="px-5 py-3">
                            {b.position || b.posicao || b.posição}
                          </td>
                          <td className="px-5 py-3">
                            {dayjs
                              .utc(b.start || b.fromDate)
                              .format("YYYY-MM-DD HH:mm")}
                          </td>
                          <td className="px-5 py-3">
                            {dayjs
                              .utc(b.end || b.toDate)
                              .format("YYYY-MM-DD HH:mm")}
                          </td>
                          <td className="px-5 py-3">{b.vid}</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-2">
                              {isMine && (
                                <>
                                  <button
                                    onClick={() => beginEdit(b)}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 transition"
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" /> Edit
                                  </button>
                                  <button
                                    onClick={() => askDelete(b.id)}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-red-600/90 hover:bg-red-600 transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </Container>
      </main>

      {}
      <footer className="mt-auto border-t border-white/10 text-center text-[11px] text-neutral-500 py-3">
        <Container>
          <div className="items-center">
            <span>{nowUTC}</span>
          </div>
        </Container>
      </footer>

      {}
      <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
