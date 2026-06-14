import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../store/slices/authSlice';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

const PERKS = [
  { emoji: '🚀', title: 'Unlimited boards', desc: 'Create as many boards and workspaces as you need' },
  { emoji: '⚡', title: 'Real-time sync', desc: 'Changes appear instantly across your entire team' },
  { emoji: '📎', title: 'Files & comments', desc: 'Attach files and collaborate inline on every card' },
  { emoji: '🔔', title: 'Smart notifications', desc: 'Only get pinged for what actually matters to you' },
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

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(s => s.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [foc, setFoc] = useState({ name: false, email: false, pass: false });

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const submit = async e => {
    e.preventDefault();
    const res = await dispatch(register(form));
    if (!res.error) navigate('/dashboard');
  };

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColor = [null, '#ef4444', '#f59e0b', '#22c55e'][strength];
  const strengthLabel = ['', 'Too short', 'Getting there', 'Strong'][strength];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#060c1a', position: 'relative', overflow: 'hidden' }}>

      {/* Atmospheric glow blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-5%', left: '25%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 60%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '10%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 60%)', filter: 'blur(70px)' }} />
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
            <h1 style={{ fontSize: '3.4rem', fontWeight: 900, lineHeight: 1.06, letterSpacing: '-0.04em', marginBottom: 18 }}>
              <span style={{ color: 'white' }}>Your team's<br /></span>
              <span style={{
                background: 'linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 50%, #f9a8d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>command center.</span>
            </h1>
            <p style={{ color: 'rgba(148,163,184,0.75)', fontSize: 15, lineHeight: 1.65, maxWidth: 360 }}>
              Everything your team needs to plan, ship, and celebrate — all in one place. Free forever.
            </p>
          </div>

          {/* Perk tiles — 2x2 glass grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {PERKS.map((p, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.044)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 16,
                padding: '16px 15px',
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{p.emoji}</div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 13, marginBottom: 4, letterSpacing: '-0.01em' }}>{p.title}</div>
                <div style={{ color: 'rgba(148,163,184,0.6)', fontSize: 12, lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div style={{
          background: 'rgba(255,255,255,0.044)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 18,
          padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
            {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#f59e0b', fontSize: 13 }}>★</span>)}
          </div>
          <p style={{ color: 'rgba(226,232,240,0.85)', fontSize: 13.5, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 14 }}>
            "Worklio transformed how our engineering team ships. We cut planning overhead in half and finally have a tool everyone actually uses."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #f472b6, #e11d48)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>S</div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>Sarah Chen</div>
              <div style={{ color: 'rgba(148,163,184,0.6)', fontSize: 12 }}>Engineering Lead · 120-person team</div>
            </div>
          </div>
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
              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'white', marginBottom: 6, letterSpacing: '-0.03em', lineHeight: 1.2 }}>Create your account</h2>
              <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 14 }}>Free forever · No credit card required</p>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 14, padding: '12px 14px', marginBottom: 20, color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Name */}
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(148,163,184,0.5)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input name="name" type="text" required value={form.name} onChange={handle}
                  placeholder="Full name" autoComplete="name"
                  className="placeholder:text-slate-600"
                  style={{ ...INPUT_BASE, padding: '14px 16px 14px 42px', ...(foc.name ? INPUT_FOCUS : {}) }}
                  onFocus={() => setFoc(p => ({ ...p, name: true }))}
                  onBlur={() => setFoc(p => ({ ...p, name: false }))} />
              </div>

              {/* Email */}
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(148,163,184,0.5)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input name="email" type="email" required value={form.email} onChange={handle}
                  placeholder="Work email" autoComplete="email"
                  className="placeholder:text-slate-600"
                  style={{ ...INPUT_BASE, padding: '14px 16px 14px 42px', ...(foc.email ? INPUT_FOCUS : {}) }}
                  onFocus={() => setFoc(p => ({ ...p, email: true }))}
                  onBlur={() => setFoc(p => ({ ...p, email: false }))} />
              </div>

              {/* Password */}
              <div>
                <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(148,163,184,0.5)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input name="password" type={show ? 'text' : 'password'} required minLength={6}
                    value={form.password} onChange={handle}
                    placeholder="Min. 6 characters" autoComplete="new-password"
                    className="placeholder:text-slate-600"
                    style={{ ...INPUT_BASE, padding: '14px 44px 14px 42px', ...(foc.pass ? INPUT_FOCUS : {}) }}
                    onFocus={() => setFoc(p => ({ ...p, pass: true }))}
                    onBlur={() => setFoc(p => ({ ...p, pass: false }))} />
                  <button type="button" onClick={() => setShow(!show)} tabIndex={-1}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(148,163,184,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {form.password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 99,
                          background: i <= strength ? strengthColor : 'rgba(255,255,255,0.08)',
                          transition: 'background 0.25s ease',
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: strengthColor, fontWeight: 700 }}>{strengthLabel}</p>
                  </div>
                )}
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
                  : <><span>Create free account</span><ArrowRight size={16} /></>
                }
              </button>

              <p style={{ fontSize: 11.5, color: 'rgba(148,163,184,0.45)', textAlign: 'center' }}>
                By signing up you agree to our Terms of Service.
              </p>
            </form>

            <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13.5, color: 'rgba(148,163,184,0.6)' }}>
              Already have an account?{' '}
              <Link to="/login" className="hover:text-indigo-300 transition-colors"
                style={{ color: '#a5b4fc', fontWeight: 700 }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
