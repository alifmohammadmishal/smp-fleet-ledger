import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { fmtMoney, MONTH_NAMES } from "./utils";
import type { Bus, IncomeEntry } from "./types";

export default function IncomePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [buses, setBuses] = useState<Bus[]>([]);
  const [rows, setRows] = useState<Record<string, number[]>>({}); // busId -> [wk1..wk5]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("buses")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setBuses((data as Bus[]) || []));
  }, []);

  useEffect(() => {
    if (buses.length) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buses, year, month]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("income_entries")
      .select("*")
      .eq("year", year)
      .eq("month", month);
    const map: Record<string, number[]> = {};
    buses.forEach((b) => (map[b.id] = [0, 0, 0, 0, 0]));
    ((data as IncomeEntry[]) || []).forEach((e) => {
      if (!map[e.bus_id]) map[e.bus_id] = [0, 0, 0, 0, 0];
      map[e.bus_id][e.week_no - 1] = Number(e.amount);
    });
    setRows(map);
    setLoading(false);
  }

  async function updateWeek(busId: string, weekIdx: number, value: string) {
    const n = Number(value) || 0;
    setRows((prev) => {
      const next = { ...prev, [busId]: [...(prev[busId] || [0, 0, 0, 0, 0])] };
      next[busId][weekIdx] = n;
      return next;
    });
    await supabase.from("income_entries").upsert(
      { year, month, bus_id: busId, week_no: weekIdx + 1, amount: n },
      { onConflict: "year,month,bus_id,week_no" }
    );
  }

  const totalIncome = Object.values(rows).reduce((a, wk) => a + wk.reduce((x, y) => x + y, 0), 0);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Income by Vehicle (Weekly)</h3>
        <div className="row" style={{ gap: 8, width: "auto" }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())}
            style={{ width: 90 }}
          />
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bus</th>
                <th className="num">Wk 1</th>
                <th className="num">Wk 2</th>
                <th className="num">Wk 3</th>
                <th className="num">Wk 4</th>
                <th className="num">Wk 5</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((b) => {
                const wk = rows[b.id] || [0, 0, 0, 0, 0];
                const total = wk.reduce((a, x) => a + x, 0);
                return (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.id}</strong>
                    </td>
                    {wk.map((v, i) => (
                      <td key={i} className="num">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={v || ""}
                          placeholder="0"
                          onChange={(e) => updateWeek(b.id, i, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="num" style={{ color: "var(--positive)", fontWeight: 700 }}>
                      {fmtMoney(total)}
                    </td>
                  </tr>
                );
              })}
              <tr className="row-total">
                <td style={{ fontWeight: 700, color: "var(--navy)" }}>TOTAL</td>
                <td colSpan={5}></td>
                <td className="num" style={{ fontWeight: 700, color: "var(--positive)" }}>
                  {fmtMoney(totalIncome)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
