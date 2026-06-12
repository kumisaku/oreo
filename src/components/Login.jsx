import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.js';
import { Sparkles } from 'lucide-react';

export default function Login({ theme: T }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setError('Sign-in failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, display: 'grid', placeItems: 'center', fontFamily: T.body, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(145deg, ${T.orange}, #ec6a2e)`, display: 'grid', placeItems: 'center', boxShadow: `0 6px 20px ${T.orange}55` }}>
            <span style={{ fontFamily: T.display, fontWeight: 800, color: '#fff', fontSize: 24, lineHeight: 1 }}>O</span>
          </div>
          <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 28, letterSpacing: -0.6, color: T.ink }}>Oreo</span>
        </div>

        <div style={{ background: T.panelSolid, borderRadius: 20, border: `1px solid ${T.line}`, padding: 32, boxShadow: T.shadowLg }}>
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: -0.4, marginBottom: 8 }}>Welcome back</div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>Sign in to sync your finances across all your devices.</div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: T.red, marginBottom: 16, padding: '10px 14px', background: `${T.red}10`, borderRadius: 10 }}>{error}</div>
          )}

          <button onClick={signIn} disabled={loading}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: `1px solid ${T.line}`, cursor: loading ? 'not-allowed' : 'pointer',
              background: T.panelSolid, color: T.ink, fontFamily: T.body, fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all .15s ease',
              boxShadow: T.shadow, opacity: loading ? 0.6 : 1 }}>
            {loading ? (
              <><Sparkles size={16} color={T.gold} /> Signing in…</>
            ) : (
              <>
                {/* Google logo */}
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div style={{ marginTop: 20, fontSize: 11, color: T.faint, textAlign: 'center', lineHeight: 1.6 }}>
            Your data is private and only accessible with your Google account.
          </div>
        </div>
      </div>
    </div>
  );
}
