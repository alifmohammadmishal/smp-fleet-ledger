import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import type { Bus, Category, Profile } from "./types";

export default function SettingsPage() {
  const { profile } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
  const [newBus, setNewBus] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [{ data: b }, { data: c }, { data: t }] = await Promise.all([
      supabase.from("buses").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("profiles").select("*").order("created_at"),
    ]);
    setBuses((b as Bus[]) || []);
    setCategories((c as Category[]) || []);
    setTeam((t as Profile[]) || []);
  }

  async function addBus() {
    const id = newBus.trim();
    if (!id || buses.some((b) => b.id === id)) return;
    const sortOrder = buses.length + 1;
    const { data } = await supabase.from("buses").insert({ id, sort_order: sortOrder }).select().single();
    if (data) setBuses((prev) => [...prev, data as Bus]);
    setNewBus("");
  }
  async function toggleBusActive(id: string, active: boolean) {
    setBuses((prev) => prev.map((b) => (b.id === id ? { ...b, active } : b)));
    await supabase.from("buses").update({ active }).eq("id", id);
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name || categories.some((c) => c.name === name)) return;
    const sortOrder = categories.length + 1;
    const { data } = await supabase.from("categories").insert({ name, sort_order: sortOrder }).select().single();
    if (data) setCategories((prev) => [...prev, data as Category]);
    setNewCategory("");
  }
  async function toggleCategoryActive(id: string, active: boolean) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
    await supabase.from("categories").update({ active }).eq("id", id);
  }

  async function setRole(userId: string, role: "admin" | "staff") {
    setTeam((prev) => prev.map((p) => (p.id === userId ? { ...p, role } : p)));
    await supabase.from("profiles").update({ role }).eq("id", userId);
  }

  return (
    <>
      <div className="card">
        <h3>Fleet Vehicles</h3>
        <div className="head-list">
          {buses.map((b) => (
            <div key={b.id} className="head-item">
              <span style={{ opacity: b.active ? 1 : 0.4 }}>{b.id}</span>
              <input type="checkbox" checked={b.active} onChange={(e) => toggleBusActive(b.id, e.target.checked)} />
            </div>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input value={newBus} onChange={(e) => setNewBus(e.target.value)} placeholder="e.g. 6120" style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={addBus}>
            Add
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Expense Categories</h3>
        <div className="head-list" style={{ maxHeight: 260 }}>
          {categories.map((c) => (
            <div key={c.id} className="head-item">
              <span style={{ opacity: c.active ? 1 : 0.4 }}>{c.name}</span>
              <input type="checkbox" checked={c.active} onChange={(e) => toggleCategoryActive(c.id, e.target.checked)} />
            </div>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category"
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" onClick={addCategory}>
            Add
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Team</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {team.map((p) => (
                <tr key={p.id}>
                  <td>{p.full_name || <span className="muted">—</span>}</td>
                  <td>{p.email}</td>
                  <td>
                    <select
                      value={p.role}
                      disabled={p.id === profile?.id}
                      onChange={(e) => setRole(p.id, e.target.value as "admin" | "staff")}
                    >
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="foot-note">
          Staff can log expenses and income but can't change settings or delete records. Anyone who signs up
          on the app appears here as Staff automatically.
        </p>
      </div>
    </>
  );
}
