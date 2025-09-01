import { useEffect, useMemo, useState } from 'react';
import { api, withVid } from './api';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

type Booking = {
  id: number;
  position: string;
  fromDate: string;
  toDate: string;
  vid: string;
};

function isoTomorrow(hour: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}
const fmt = (s: string) => dayjs.utc(s).format('YYYY-MM-DD HH:mm[Z]');

export default function App() {
  const [vid, setVid] = useState(localStorage.getItem('ivaoVid') || '');
  const [position, setPosition] = useState('SBSP_APP');
  const [fromDate, setFromDate] = useState(isoTomorrow(10));
  const [toDate, setToDate] = useState(isoTomorrow(11));

  const [future, setFuture] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { fetchFuture(); }, []);
  const canCreate = useMemo(() => !!vid && !!position && !!fromDate && !!toDate, [vid, position, fromDate, toDate]);

  function toast(text: string) { setMsg(text); setTimeout(() => setMsg(null), 1500); }
  function saveVid() { localStorage.setItem('ivaoVid', vid); toast('VID salvo!'); }

  async function fetchFuture() {
    setBusy(true);
    try {
      const { data } = await api.get<Booking[]>('/bookings/future');
      setFuture(data);
    } finally { setBusy(false); }
  }

  async function createBooking() {
    if (!vid) return alert('Informe seu IVAO VID');
    setBusy(true);
    try {
      const { data } = await api.post<Booking>('/bookings', { position, fromDate, toDate }, withVid(vid));
      toast(`Criado id ${data.id}`);
      await fetchFuture();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro ao criar');
    } finally { setBusy(false); }
  }

  async function deleteBooking(id: number) {
    if (!vid) return alert('Informe seu IVAO VID');
    if (!confirm(`Remover booking ${id}?`)) return;
    setBusy(true);
    try {
      await api.delete(`/bookings/${id}`, withVid(vid));
      toast(`Removido id ${id}`);
      await fetchFuture();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro ao remover');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
      <h1>IVAO Bookings</h1>

      {/* VID */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
        <input placeholder="Seu IVAO VID" value={vid} onChange={e => setVid(e.target.value)} />
        <button onClick={saveVid}>Salvar VID</button>
      </section>
      {msg && <div style={{ marginTop: 8, color: '#0a7' }}>{msg}</div>}
      <hr style={{ margin: '16px 0' }} />

      {/* Criar */}
      <h2>Novo Booking</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 8 }}>
        <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Position" />
        <input value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="fromDate (ISO)" />
        <input value={toDate} onChange={e => setToDate(e.target.value)} placeholder="toDate (ISO)" />
        <button onClick={() => { setFromDate(isoTomorrow(10)); setToDate(isoTomorrow(11)); }}>Amanhã 10–11Z</button>
        <button disabled={!canCreate || busy} onClick={createBooking}>Criar</button>
      </div>

      {/* Futuros */}
      <h2 style={{ marginTop: 24 }}>Futuros</h2>
      <button disabled={busy} onClick={fetchFuture}>Atualizar</button>
      <table width="100%" cellPadding={6} style={{ marginTop: 8, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">ID</th>
            <th align="left">Posição</th>
            <th align="left">Início (UTC)</th>
            <th align="left">Fim (UTC)</th>
            <th align="left">VID</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {future.map((b) => (
            <tr key={b.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{b.id}</td>
              <td>{b.position}</td>
              <td>{fmt(b.fromDate)}</td>
              <td>{fmt(b.toDate)}</td>
              <td>{b.vid}</td>
              <td><button onClick={() => deleteBooking(b.id)}>Excluir</button></td>
            </tr>
          ))}
          {future.length === 0 && (
            <tr><td colSpan={6}>Sem reservas futuras.</td></tr>
          )}
        </tbody>
      </table>

      {busy && <div style={{ marginTop: 8, color: '#999' }}>Carregando…</div>}
    </div>
  );
}
