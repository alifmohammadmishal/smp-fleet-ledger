import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { fmtMoney, MONTH_NAMES, expenseAppliesToBus, expenseShareForBus } from "./utils";
import type { Bus, Category, Expense, IncomeEntry, YearSettings } from "./types";

interface MonthStats {
  totalExpense: number;
  generalExpense: number;
  byCategory: Record<string, number>;
  perBusExpense: Record<string, number>;
  perBusIncome: Record<string, number>;
  totalIncome: number;
}

async function computeMonthStats(year: number, month: number, buses: Bus[]): Promise<MonthStats> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const [{ data: expenses }, { data: income }] = await Promise.all([
    supabase.from("expenses").select("*, category:categories(*)").gte("expense_date", start).lt("expense_date", nextMonth),
    supabase.from("income_entries").select("*").eq("year", year).eq("month", month),
  ]);

  const expList = (expenses as Expense[]) || [];
  const incList = (income as IncomeEntry[]) || [];

  const totalExpense = expList.reduce((a, e) => a + Number(e.amount), 0);
  const generalExpense = expList.filter((e) => !e.vehicle_tag).reduce((a, e) => a + Number(e.amount), 0);

  const byCategory: Record<string, number> = {};
  expList.forEach((e) => {
    const name = e.category?.name || "Uncategorized";
    byCategory[name] = (byCategory[name] || 0) + Number(e.amount);
  });

  const perBusExpense: Record<string, number> = {};
  buses.forEach((b) => {
    let exp = 0;
    expList.forEach((e) => {
      if (expenseAppliesToBus(e.vehicle_tag, b.id)) {
        exp += Number(e.amount) * expenseShareForBus(e.vehicle_tag, buses.length);
      }
    });
    perBusExpense[b.id] = exp;
  });

  const perBusIncome: Record<string, number> = {};
  buses.forEach((b) => (perBusIncome[b.id] = 0));
  incList.forEach((e) => {
    perBusIncome[e.bus_id] = (perBusIncome[e.bus_id] || 0) + Number(e.amount);
  });
  const totalIncome = Object.values(perBusIncome).reduce((a, b) => a + b, 0);

  return { totalExpense, generalExpense, byCategory, perBusExpense, perBusIncome, totalIncome };
}

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [yearSettings, setYearSettings] = useState<YearSettings>({ year, opening_balance: 0 });
  const [yearRows, setYearRows] = useState<
    { month: number; income: number; expense: number; opening: number; closing: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("buses").select("*").eq("active", true).order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
    ]).then(([b, c]) => {
      setBuses((b.data as Bus[]) || []);
      setCategories((c.data as Category[]) || []);
    });
  }, []);

  useEffect(() => {
    if (buses.length) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buses, year, month]);

  async function loadAll() {
    setLoading(true);
    const s = await computeMonthStats(year, month, buses);
    setStats(s);

    const { data: ys } = await supabase.from("year_settings").select("*").eq("year", year).maybeSingle();
    const opening = (ys as YearSettings) || { year, opening_balance: 0 };
    setYearSettings(opening);

    let running = opening.opening_balance;
    const rows = [];
    for (let m = 1; m <= 12; m++) {
      const ms = await computeMonthStats(year, m, buses);
      const o = running;
      const c = o + ms.totalIncome - ms.totalExpense;
      running = c;
      rows.push({ month: m, income: ms.totalIncome, expense: ms.totalExpense, opening: o, closing: c });
    }
    setYearRows(rows);
    setLoading(false);
  }

  async function updateOpeningBalance(val: string) {
    const n = Number(val) || 0;
    setYearSettings((prev) => ({ ...prev, opening_balance: n }));
    await supabase.from("year_settings").upsert({ year, opening_balance: n }, { onConflict: "year" });
    loadAll();
  }

  if (loading || !stats) {
    return (
      <div className="card">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const net = stats.totalIncome - stats.totalExpense;
  const yearTotalIncome = yearRows.reduce((a, r) => a + r.income, 0);
  const yearTotalExpense = yearRows.reduce((a, r) => a + r.expense, 0);
  const finalClosing = yearRows.length ? yearRows[yearRows.length - 1].closing : yearSettings.opening_balance;

  return (
    <>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Reports</h3>
          <div className="row" style={{ gap: 8, width: "auto" }}>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())} style={{ width: 90 }} />
          </div>
        </div>
        <div className="totalbar" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
          <div className="stat">
            <div className="label">Income</div>
            <div className="value good">{fmtMoney(stats.totalIncome)}</div>
          </div>
          <div className="stat">
            <div className="label">Expense</div>
            <div className="value bad">{fmtMoney(stats.totalExpense)}</div>
          </div>
          <div className="stat">
            <div className="label">Net</div>
            <div className={`value ${net >= 0 ? "good" : "bad"}`}>{fmtMoney(net)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Expense by Category</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="num">{fmtMoney(stats.byCategory[c.name] || 0)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--gold)" }}>
                <td style={{ fontWeight: 700, color: "var(--navy)" }}>Total</td>
                <td className="num" style={{ fontWeight: 700, color: "var(--bad)" }}>{fmtMoney(stats.totalExpense)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Income vs Expense by Vehicle</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bus</th>
                <th className="num">Income</th>
                <th className="num">Expense</th>
                <th className="num">Profit</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((b) => {
                const inc = stats.perBusIncome[b.id] || 0;
                const exp = stats.perBusExpense[b.id] || 0;
                const profit = inc - exp;
                return (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.id}</strong>
                    </td>
                    <td className="num">{fmtMoney(inc)}</td>
                    <td className="num" style={{ color: "var(--bad)" }}>{fmtMoney(exp)}</td>
                    <td className="num" style={{ fontWeight: 700, color: profit >= 0 ? "var(--good)" : "var(--bad)" }}>
                      {fmtMoney(profit)}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: "var(--cream)" }}>
                <td style={{ fontStyle: "italic", color: "var(--slate)" }}>General (not bus-specific)</td>
                <td></td>
                <td className="num" style={{ fontStyle: "italic", color: "var(--slate)" }}>{fmtMoney(stats.generalExpense)}</td>
                <td></td>
              </tr>
              <tr style={{ borderTop: "2px solid var(--gold)" }}>
                <td style={{ fontWeight: 700, color: "var(--navy)" }}>Company Total</td>
                <td className="num" style={{ fontWeight: 700, color: "var(--good)" }}>{fmtMoney(stats.totalIncome)}</td>
                <td className="num" style={{ fontWeight: 700, color: "var(--bad)" }}>{fmtMoney(stats.totalExpense)}</td>
                <td className="num" style={{ fontWeight: 700, color: net >= 0 ? "var(--good)" : "var(--bad)" }}>{fmtMoney(net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="foot-note">
          "All Buses" expenses are split evenly across {buses.length} buses inside each bus's Expense figure
          above — not added again in the company total.
        </p>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>{year} Year Summary</h3>
          {isAdmin && (
            <div className="row" style={{ gap: 8, width: "auto", fontSize: 13 }}>
              <span className="muted">Opening Balance (Jan 1):</span>
              <input
                type="number"
                value={yearSettings.opening_balance || ""}
                placeholder="0"
                onChange={(e) => updateOpeningBalance(e.target.value)}
                style={{ width: 120 }}
              />
            </div>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Income</th>
                <th className="num">Expense</th>
                <th className="num">Opening Bal.</th>
                <th className="num">Closing Bal.</th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((r) => (
                <tr key={r.month} style={{ background: r.month === month ? "var(--cream)" : "transparent" }}>
                  <td>
                    <strong>{MONTH_NAMES[r.month - 1]}</strong>
                  </td>
                  <td className="num">{fmtMoney(r.income)}</td>
                  <td className="num">{fmtMoney(r.expense)}</td>
                  <td className="num">{fmtMoney(r.opening)}</td>
                  <td className="num" style={{ fontWeight: 700, color: r.closing >= 0 ? "var(--good)" : "var(--bad)" }}>
                    {fmtMoney(r.closing)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--gold)" }}>
                <td style={{ fontWeight: 700, color: "var(--navy)" }}>TOTAL</td>
                <td className="num" style={{ fontWeight: 700, color: "var(--good)" }}>{fmtMoney(yearTotalIncome)}</td>
                <td className="num" style={{ fontWeight: 700, color: "var(--bad)" }}>{fmtMoney(yearTotalExpense)}</td>
                <td></td>
                <td className="num" style={{ fontWeight: 700, color: "var(--navy)" }}>{fmtMoney(finalClosing)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
