import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/slices/authSlice';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

const MINI_COLS = [
  {
    label: 'To Do', color: '#94a3b8',
    cards: [{ t: 'API integration', pts: 5 }, { t: 'Design review', pts: 2 }],
  },
  {
    label: 'In Progress', color: '#6366f1',
    cards: [{ t: 'Auth redesign', pts: 8 }],
  },
  {
    label: 'Done', color: '#22c55e',
    cards: [{ t: 'Sprint planning', pts: 3 }, { t: 'Onboarding flow', pts: 5 }],
  },
];

function WorklioLogo({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: Math.round(size * 0.28),
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 18px rgba(99,102,241,0.45)',
    }}>
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    </div>
  );
}

const INPUT_BASE = {
  background: 'rgba(255,255,255,0.06)',
  border: '1.5px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  color: 'white',
  fontSize: 14,
  fontWeight: 500,
  outline: 'none',
  transition: 'all 0.15s ease',
  width: '100%',
  display: 'block',
};

const INPUT_FOCUS = {
  background: 'rgba(99,102,241,0.09)',
  border: '1.5px solid rgba(99,102,241,0.55)',
  boxShadow: '0 0 0 3px rgba(99,102,241,0.13)',
};

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(s => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [foc, setFoc] = useState({ email: false, pass: false });

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const submit = async e => {
    e.preventDefault();
    const res = await dispatch(login(form));
    if (!res.error) navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#060c1a', position: 'relative', overflow: 'hidden' }}>

      {/* Atmospheric glow blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-8%', left: '-8%', width: 820, height: 820, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 60%)', filter: 'blur(72px)' }} />
        <div style={{ position: 'absolute', top: '42%', left: '12%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)', filter: 'blur(72px)' }} />
        <div style={{ position: 'absolute', bottom: '-12%', left: '38%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 60%)', filter: 'blur(72px)' }} />
      </div>

      {/* Dot grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* ── Left brand zone ── */}
      <div className="hidden lg:flex" style={{ width: '56%', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 64px', position: 'relative', zIndex: 10 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <WorklioLogo size={38} />
          <span style={{ color: 'white', fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em' }}>Worklio</span>
        </div>

        <div>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: '3.6rem', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 20 }}>
              <span style={{ color: 'white' }}>Where great<br /></span>
              <span style={{
                background: 'linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 50%, #f9a8d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>teams ship.</span>
            </h1>
            <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: 15, lineHeight: 1.65, maxWidth: 360 }}>
              Kanban boards, sprints, and real-time collaboration — built for teams that move fast.
            </p>
          </div>

          {/* 3D perspective mini kanban */}
          <div style={{ perspective: '900px', userSelect: 'none' }}>
            <div style={{
              transform: 'rotateX(10deg) rotateY(-8deg)',
              transformStyle: 'preserve-3d',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
            }}>
              {MINI_COLS.map((col, ci) => (
                <div key={ci} style={{
                  background: 'rgba(255,255,255,0.044)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 14,
                  padding: '11px 10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: col.color }}>{col.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(148,163,184,0.5)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 99 }}>{col.cards.length}</span>
                  </div>
                  {col.cards.map((c, ri) => (
                    <div key={ri} style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10,
                      padding: '8px 9px',
                      marginBottom: ri < col.cards.length - 1 ? 6 : 0,
                    }}>
                      <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.85)', fontWeight: 600, lineHeight: 1.3, marginBottom: 5 }}>{c.t}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ height: 3, width: c.pts * 6, borderRadius: 99, background: col.color, opacity: 0.5 }} />
                        <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.45)', fontWeight: 700 }}>{c.pts}pt</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex' }}>
            {['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'].map((c, i) => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: '50%', background: c,
                border: '2.5px solid #060c1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 11, fontWeight: 900,
                marginLeft: i === 0 ? 0 : -9,
              }}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <p style={{ color: 'rgba(148,163,184,0.65)', fontSize: 13.5 }}>
            Trusted by <span style={{ color: 'white', fontWeight: 700 }}>12,000+</span> engineers & PMs
          </p>
        </div>
      </div>

      {/* ── Right: glass card ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 28,
            padding: '40px 36px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>

            {/* Mobile logo */}
            <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <WorklioLogo size={32} />
              <span style={{ color: 'white', fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em' }}>Worklio</span>
            </div>

            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'white', marginBottom: 6, letterSpacing: '-0.03em', lineHeight: 1.2 }}>Welcome back</h2>
              <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 14 }}>Sign in to continue to your workspace</p>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 14, padding: '12px 14px', marginBottom: 20, color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Email */}
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(148,163,184,0.5)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input name="email" type="email" required value={form.email} onChange={handle}
                  placeholder="your@email.com" autoComplete="email"
                  className="placeholder:text-slate-600"
                  style={{ ...INPUT_BASE, padding: '14px 16px 14px 42px', ...(foc.email ? INPUT_FOCUS : {}) }}
                  onFocus={() => setFoc(p => ({ ...p, email: true }))}
                  onBlur={() => setFoc(p => ({ ...p, email: false }))} />
              </div>

              {/* Password */}
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(148,163,184,0.5)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input name="password" type={show ? 'text' : 'password'} required value={form.password} onChange={handle}
                  placeholder="Password" autoComplete="current-password"
                  className="placeholder:text-slate-600"
                  style={{ ...INPUT_BASE, padding: '14px 44px 14px 42px', ...(foc.pass ? INPUT_FOCUS : {}) }}
                  onFocus={() => setFoc(p => ({ ...p, pass: true }))}
                  onBlur={() => setFoc(p => ({ ...p, pass: false }))} />
                <button type="button" onClick={() => setShow(!show)} tabIndex={-1}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(148,163,184,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="hover:opacity-90 hover:-translate-y-px active:scale-[0.98] transition-all"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 8px 28px rgba(99,102,241,0.38)',
                  borderRadius: 14,
                  padding: '15px',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 14,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 4,
                  letterSpacing: '-0.01em',
                }}>
                {loading
                  ? <div className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }} />
                  : <><span>Sign in</span><ArrowRight size={16} /></>
                }
              </button>
            </form>

            <p style={{ marginTop: 28, textAlign: 'center', fontSize: 13.5, color: 'rgba(148,163,184,0.6)' }}>
              Don't have an account?{' '}
              <Link to="/register" className="hover:text-indigo-300 transition-colors"
                style={{ color: '#a5b4fc', fontWeight: 700 }}>
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
