import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { T } from '../../globals.js';

export default function CategoryManager({ cats, onClose, onSave }) {
  const [list, setList] = useState(cats || []);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("expense");
  const [editIdx, setEditIdx] = useState(null);
  const [editName, setEditName] = useState("");

  const save = () => { onSave(list); onClose(); };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 24 }}>
      <div className="lg-modal" onClick={(e) => e.stopPropagation()} style={{ width: 460, maxHeight: "82vh", overflowY: "auto", background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 20, padding: 26, boxShadow: "0 24px 64px rgba(17,24,39,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.gold}18`, display: "grid", placeItems: "center" }}><Tag size={16} color={T.goldDeep} /></div>
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 800 }}>Categories</div>
          </div>
          <button onClick={onClose} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 9, padding: 8, cursor: "pointer", color: T.sub }}><X size={16} /></button>
        </div>

        {/* Add new */}
        <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name…"
            style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 11, padding: "10px 13px", color: T.ink, fontSize: 14, fontFamily: T.body, outline: "none" }}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && (setList([...list, { name: newName.trim(), type: newType }]), setNewName(""))} />
          <div style={{ display: "flex", background: T.panel2, borderRadius: 11, padding: 3, gap: 2, border: `1px solid ${T.line}` }}>
            {["expense", "income"].map((tp) => (
              <button key={tp} onClick={() => setNewType(tp)} className="lg-btn"
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: T.mono, fontSize: 11, fontWeight: 600, background: newType === tp ? T.ink : "transparent", color: newType === tp ? T.bg : T.sub }}>{tp}</button>
            ))}
          </div>
          <button onClick={() => { if (!newName.trim()) return; setList([...list, { name: newName.trim(), type: newType }]); setNewName(""); }} className="lg-btn"
            style={{ background: T.accent, border: "none", borderRadius: 11, padding: "0 16px", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 14 }}>+</button>
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[{ label: "EXPENSE", type: "expense" }, { label: "INCOME", type: "income" }].map(({ label, type }) => (
            <div key={type}>
              <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, padding: "8px 4px 5px" }}>{label}</div>
              {list.filter((c) => c.type === type).map((cat, idx) => {
                const absIdx = list.indexOf(cat);
                return (
                  <div key={absIdx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.panel2, borderRadius: 10, marginBottom: 4 }}>
                    {editIdx === absIdx ? (
                      <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { setList(list.map((c, i) => i === absIdx ? { ...c, name: editName } : c)); setEditIdx(null); } if (e.key === "Escape") setEditIdx(null); }}
                        onBlur={() => { if (editName.trim()) setList(list.map((c, i) => i === absIdx ? { ...c, name: editName } : c)); setEditIdx(null); }}
                        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13.5, fontFamily: T.body, color: T.ink }} />
                    ) : (
                      <span onClick={() => { setEditIdx(absIdx); setEditName(cat.name); }} style={{ flex: 1, fontSize: 13.5, cursor: "text" }}>{cat.name}</span>
                    )}
                    <span style={{ fontSize: 11, color: T.faint, fontFamily: T.mono }}>{type === "expense" ? "↓" : "↑"}</span>
                    <button onClick={() => setList(list.filter((_, i) => i !== absIdx))} className="lg-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, padding: 3, display: "grid", borderRadius: 6 }}><X size={13} /></button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <button onClick={save} className="lg-btn" style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 13, background: T.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: T.body, boxShadow: `0 4px 16px ${T.accent}50` }}>Save categories</button>
      </div>
    </div>
  );
}
