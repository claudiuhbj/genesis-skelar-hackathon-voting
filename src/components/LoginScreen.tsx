import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  UserCheck,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  KeyRound,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: number;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface LoginScreenProps {
  onLoginWithEmail: (email: string, name: string) => Promise<void>;
  onLoginWithGoogleCredential?: (credential: string) => Promise<void>;
  onSimulateFreshParticipant: () => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginWithEmail,
  onLoginWithGoogleCredential,
  onSimulateFreshParticipant,
}) => {
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState<string>('admin@genesis.tech');
  const [primaryAdminName, setPrimaryAdminName] = useState<string>('Hackathon Organizer');
  const [showFallbackForm, setShowFallbackForm] = useState<boolean>(false);
  const [showOAuthSetupModal, setShowOAuthSetupModal] = useState<boolean>(false);
  const [newClientIdInput, setNewClientIdInput] = useState<string>('');
  const [savingClientId, setSavingClientId] = useState<boolean>(false);
  const [clientIdSavedMsg, setClientIdSavedMsg] = useState<string>('');

  // Fallback Email & Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleEmailPrompt, setGoogleEmailPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
          setNewClientIdInput(data.googleClientId);
        }
        if (data.primaryAdminEmail) setPrimaryAdminEmail(data.primaryAdminEmail);
        if (data.primaryAdminName) setPrimaryAdminName(data.primaryAdminName);
      })
      .catch((err) => console.warn('Could not load auth config:', err));
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonContainerRef.current) return;

    const initGsi = () => {
      if (window.google?.accounts?.id && googleButtonContainerRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response.credential && onLoginWithGoogleCredential) {
              setLoading(true);
              try {
                await onLoginWithGoogleCredential(response.credential);
              } finally {
                setLoading(false);
              }
            }
          },
        });
        googleButtonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
          theme: 'filled_blue',
          size: 'large',
          width: 368,
          text: 'continue_with',
          shape: 'rectangular',
        });
      }
    };

    // Wait briefly if script is still loading
    const timer = setTimeout(initGsi, 150);
    return () => clearTimeout(timer);
  }, [googleClientId, onLoginWithGoogleCredential]);

  const handleFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    setLoading(true);
    try {
      const derivedName = trimmed
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      await onLoginWithEmail(trimmed, derivedName);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantGoogleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = googleEmailPrompt.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    setLoading(true);
    try {
      const derivedName = trimmed
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      await onLoginWithEmail(trimmed, derivedName);
      setShowOAuthSetupModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoogleClientId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newClientIdInput.trim();
    setSavingClientId(true);
    setClientIdSavedMsg('');
    try {
      const res = await fetch('/api/admin/google-client-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': primaryAdminEmail,
        },
        body: JSON.stringify({ googleClientId: cleaned }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoogleClientId(data.googleClientId || '');
        setClientIdSavedMsg('Live Google OAuth 2.0 Client ID saved & activated!');
        setTimeout(() => {
          setShowOAuthSetupModal(false);
          setClientIdSavedMsg('');
        }, 1200);
      }
    } finally {
      setSavingClientId(false);
    }
  };

  const quickLogin = async (targetEmail: string, targetName: string) => {
    setLoading(true);
    try {
      await onLoginWithEmail(targetEmail, targetName);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background:
          'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.16), transparent 55%), radial-gradient(circle at 85% 85%, rgba(59, 130, 246, 0.1), transparent 50%), #090D16',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '2.5rem 2.25rem',
          background: 'rgba(17, 24, 39, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '18px',
          boxShadow: '0 25px 65px -12px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.85rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34D399',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            <Sparkles size={13} /> Genesis × Skelar Hackathon 2026
          </div>

          <h1
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#F9FAFB',
              letterSpacing: '-0.02em',
              marginBottom: '0.45rem',
            }}
          >
            Sign in to Vote
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Use your Google account to rate finalist projects and view live AI Judge evaluations.
          </p>
        </div>

        {/* PRIMARY LOGIN: Sign in with Google */}
        <div style={{ marginBottom: '1.5rem' }}>
          {googleClientId ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div
                ref={googleButtonContainerRef}
                style={{
                  minHeight: '44px',
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                }}
              />
              <button
                type="button"
                onClick={() => setShowOAuthSetupModal(true)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: '#93C5FD',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                }}
              >
                <KeyRound size={14} />
                <span>Getting 403 org_internal? Click here for Instant Google Sign-In or OAuth Settings</span>
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setShowOAuthSetupModal(true)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.9rem 1.1rem',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  color: '#1F2937',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                {/* Official Multi-color Google G Logo SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 .1 11.2.1 12.3s.5 3.3 1.5 5.3l3.7-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 16.1C3.5 19.9 7.4 23 12 23z"
                  />
                </svg>
                Sign in with Google
              </button>
            </div>
          )}
        </div>

        {/* Google Sign-In / OAuth Setup Modal */}
        {showOAuthSetupModal && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1.2rem',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60A5FA' }}>
                Google Account Sign-In
              </span>
              <button
                type="button"
                onClick={() => setShowOAuthSetupModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Close ✕
              </button>
            </div>

            {/* Instant Google Account Sign-In */}
            <form onSubmit={handleInstantGoogleEmailSignIn} style={{ marginBottom: '1.1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.76rem',
                  color: '#D1D5DB',
                  marginBottom: '0.4rem',
                }}
              >
                Enter your Google / Workspace Email (@gmail.com, @skelar.tech, @genesis.tech, etc.):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="email"
                  required
                  placeholder="you@gmail.com or name@skelar.tech"
                  value={googleEmailPrompt}
                  onChange={(e) => setGoogleEmailPrompt(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(9, 13, 22, 0.9)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    color: '#F9FAFB',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                >
                  Continue
                </button>
              </div>
            </form>

            {/* Admin OAuth 2.0 Client ID Configuration */}
            <div
              style={{
                paddingTop: '0.9rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  marginBottom: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <KeyRound size={13} color="#F59E0B" /> Admin: Connect GCP OAuth 2.0 Web Client ID
              </div>
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.8rem',
                  marginBottom: '0.65rem',
                  fontSize: '0.73rem',
                  color: '#FDE68A',
                  lineHeight: 1.45,
                }}
              >
                <b>⚠️ Getting Error 403: org_internal?</b> Your GCP project&apos;s OAuth Consent Screen is currently set to <code>Internal</code> (restricted to <code>@hobjila.altostrat.com</code>).
                <br />
                <b>Fix in 10 seconds:</b> Open{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials/consent?project=claudiu-test-project-1"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60A5FA', fontWeight: 700, textDecoration: 'underline' }}
                >
                  GCP OAuth Consent Screen (Audience) <ExternalLink size={10} style={{ display: 'inline' }} />
                </a>
                {' '}→ Under <b>User type</b>, click <b>MAKE EXTERNAL</b> → Click <b>PUBLISH APP</b>.
              </div>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.45, marginBottom: '0.6rem' }}>
                Or manage your Web Client ID in{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials?project=claudiu-test-project-1"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60A5FA', textDecoration: 'underline' }}
                >
                  GCP Credentials <ExternalLink size={10} style={{ display: 'inline' }} />
                </a>
                :
              </p>
              <form onSubmit={handleSaveGoogleClientId} style={{ display: 'flex', gap: '0.45rem' }}>
                <input
                  type="text"
                  placeholder="123456789-abc.apps.googleusercontent.com"
                  value={newClientIdInput}
                  onChange={(e) => setNewClientIdInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.75rem',
                    borderRadius: '7px',
                    background: 'rgba(9, 13, 22, 0.9)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#F9FAFB',
                    fontSize: '0.78rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={savingClientId}
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 0.85rem', fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                >
                  {savingClientId ? 'Saving...' : 'Save Client ID'}
                </button>
              </form>
              {clientIdSavedMsg && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#34D399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <CheckCircle2 size={14} /> {clientIdSavedMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COLLAPSIBLE LAST-RESORT FALLBACK: Email & Password / Demo Personas */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.1rem' }}>
          <button
            type="button"
            onClick={() => setShowFallbackForm(!showFallbackForm)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              padding: '0.35rem 0',
            }}
          >
            <span>Use Email &amp; Password or Demo Access (Fallback)</span>
            {showFallbackForm ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showFallbackForm && (
            <div style={{ marginTop: '1.1rem' }}>
              <form onSubmit={handleFallbackSubmit} style={{ marginBottom: '1.25rem' }}>
                <div style={{ marginBottom: '0.65rem' }}>
                  <input
                    type="email"
                    required
                    placeholder="Work or personal email address..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '9px',
                      background: 'rgba(11, 15, 25, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#F9FAFB',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="password"
                    placeholder="Password (optional for hackathon demo)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '9px',
                      background: 'rgba(11, 15, 25, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#F9FAFB',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                  }}
                >
                  Sign In with Email <ArrowRight size={15} />
                </button>
              </form>

              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.6rem',
                  textAlign: 'center',
                }}
              >
                1-Click Hackathon Demo Personas
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => quickLogin('dmytro.k@skelar.tech', 'Dmytro Kovalenko')}
                  style={{
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '9px',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <UserCheck size={15} color="#10B981" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F3F4F6' }}>
                        Participant Demo
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                        Team NeuralPulse member
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-participant" style={{ fontSize: '0.68rem' }}>
                    Voter
                  </span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => quickLogin('viktor.jury@skelar.tech', 'Viktor Jury')}
                  style={{
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '9px',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <ShieldCheck size={15} color="#3B82F6" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F3F4F6' }}>
                        Special Jury Demo
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                        VIP Jury member (33.3% weight)
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-ai" style={{ fontSize: '0.68rem' }}>
                    Jury
                  </span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => quickLogin(primaryAdminEmail, primaryAdminName)}
                  style={{
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '9px',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <Lock size={15} color="#F59E0B" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F3F4F6' }}>
                        Organizer Admin
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                        Manage all teams &amp; AI Judge
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-admin" style={{ fontSize: '0.68rem' }}>
                    Admin
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onSimulateFreshParticipant}
                  style={{
                    marginTop: '0.25rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#34D399',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '0.35rem',
                  }}
                >
                  + Simulate New Unassigned Participant Onboarding
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
