import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { todayISO, fmtDateShort, fmtMoney } from "./utils";
import type { Bus, Category, Expense } from "./types";

function VehicleTagPicker({
  buses,
  mode,
  setMode,
  specific,
  setSpecific,
}: {
  buses: Bus[];
  mode: "general" | "all" | "specific";
  setMode: (m: "general" | "all" | "specific") => void;
  specific: string[];
  setSpecific: (fn: (prev: string[]) => string[]) => void;
}) {
  const toggle = (id: string) => {
    setMode("specific" as any);
    setSpecific((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  return (
    <div className="field">
      <span>Applies To</span>
      <div className="chip-row">
        <button
          type="button"
          className={`chip-btn ${mode === "general" ? "on" : ""}`}
          onClick={() => {
            setMode("general");
            setSpecific(() => []);
          }}
        >
          General
        </button>
        <button
          type="button"
          className={`chip-btn ${mode === "all" ? "on" : ""}`}
          onClick={() => {
            setMode("all");
            setSpecific(() => []);
          }}
        >
          All Buses
        </button>
        {buses.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`chip-btn ${mode === "specific" && specific.includes(b.id) ? "on" : ""}`}
            onClick={() => toggle(b.id)}
          >
            {b.id}
          </button>
        ))}
      </div>
      <p className="foot-note">
        General = company cost, not tied to a bus · All Buses = split evenly across the fleet · pick 2+
        buses to split between just those
      </p>
    </div>
  );
}

export default function ExpenseLogPage() {
  const { session } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [mode, setMode] = useState<"general" | "all" | "specific">("general");
  const [specific, setSpecific] = useState<string[]>([]);
  const [entries, setEntries] = useState<Expense[]>([]);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("buses").select("*").eq("active", true).order("sort_order"),
      supabase.from("categories").select("*").eq("active", true).order("sort_order"),
    ]).then(([busRes, catRes]) => {
      const b = (busRes.data as Bus[]) || [];
      const c = (catRes.data as Category[]) || [];
      setBuses(b);
      setCategories(c);
      if (c.length) setCategoryId(c[0].id);
    });
  }, []);

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function loadEntries() {
    setLoading(true);
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("expenses")
      .select("*, category:categories(*)")
      .gte("expense_date", start)
      .lt("expense_date", nextMonth)
      .order("expense_date", { ascending: false });
    setEntries((data as any) || []);
    setLoading(false);
  }

  async function submit() {
    const amt = Number(amount) || 0;
    if (!categoryId || amt <= 0) return;
    const vehicleTag = mode === "general" ? "" : mode === "all" ? "ALL" : specific.slice().sort().join(";");
    await supabase.from("expenses").insert({
      expense_date: date,
      category_id: categoryId,
      vehicle_tag: vehicleTag,
      amount: amt,
      remarks: remarks || null,
      created_by: session?.user.id,
    });
    setAmount("");
    setRemarks("");
    setMode("general");
    setSpecific([]);
    loadEntries();
  }

  async function removeEntry(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    loadEntries();
  }

  const monthTotal = entries.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <>
      <div className="card">
        <h3>New Expense</h3>
        <div className="form-grid">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount (৳)</span>
            <input
              type="number"
              min={0}
              step="any"
              value={amount}
              placeholder="0"
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Remarks</span>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="optional" />
          </label>
        </div>
        <VehicleTagPicker buses={buses} mode={mode} setMode={setMode} specific={specific} setSpecific={setSpecific} />
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn btn-primary" onClick={submit}>
            + Add Expense
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Expense Log</h3>
          <div className="row" style={{ gap: 10, width: "auto" }}>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            <span className="pill bad">{fmtMoney(monthTotal)}</span>
          </div>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="empty">No expenses logged this month.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Applies To</th>
                  <th className="num">Amount</th>
                  <th>Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDateShort(e.expense_date)}</td>
                    <td>{e.category?.name}</td>
                    <td>
                      <span className="pill">{e.vehicle_tag || "General"}</span>
                    </td>
                    <td className="num" style={{ color: "var(--negative)", fontWeight: 700 }}>
                      {fmtMoney(Number(e.amount))}
                    </td>
                    <td>{e.remarks || <span className="muted">—</span>}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => removeEntry(e.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
