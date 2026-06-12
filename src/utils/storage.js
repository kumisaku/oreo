import { seed, blankState } from '../seed.js';
import { hasFirebase, db } from '../lib/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const KEY = "oreo:state:v9";

function lsLoad() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}
function lsSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

async function fbLoad(userId) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? snap.data().state : null;
}

async function fbSave(userId, state) {
  await setDoc(doc(db, 'users', userId), { state, updatedAt: new Date() });
}

export async function loadState(userId) {
  if (hasFirebase && userId) {
    try {
      const remote = await fbLoad(userId);
      if (remote) { lsSave(remote); return remote; }
      // New user — always start blank (no demo data)
      const fresh = blankState();
      await fbSave(userId, fresh);
      lsSave(fresh);
      return fresh;
    } catch {
      // Firestore unavailable — fall back to localStorage but only if it belongs to this user
      const cached = lsLoad();
      return cached || seed();
    }
  }
  // No Firebase — anonymous local mode
  const local = lsLoad();
  if (local) return local;
  const s = seed();
  lsSave(s);
  return s;
}

export async function saveState(state, userId) {
  lsSave(state);
  if (hasFirebase && userId) {
    try { await fbSave(userId, state); } catch {}
  }
}
