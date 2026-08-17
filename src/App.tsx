import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabaseClient";
import AuthScreen from "./Auth";
import ExpenseLogPage from "./ExpenseLogPage";
import IncomePage from "./IncomePage";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";

const TABS = [
  { key: "expenses", label: "Expense Log" },
  { key: "income", label: "Income" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings", adminOnly: true },
];

export default function App() {
  const { session, profile, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState("expenses");

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div>
            <h1>SaintMartin Paribahan Transport</h1>
            <p>Fleet Ledger{profile ? ` — ${profile.role === "admin" ? "Admin" : "Staff"}` : ""}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
            Sign Out
          </button>
        </div>
      </header>

      <nav className="app-nav">
        {visibleTabs.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === "expenses" && <ExpenseLogPage />}
        {tab === "income" && <IncomePage />}
        {tab === "reports" && <ReportsPage />}
        {tab === "settings" && isAdmin && <SettingsPage />}
      </main>
    </div>
  );
}
