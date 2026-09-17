import React, { useEffect, useState, useCallback } from 'react';
import {
  Trophy,
  LayoutGrid,
  Bot,
  ShieldAlert,
  UserCheck,
  Sparkles,
  Lock,
  Users,
  LogIn,
  LogOut,
} from 'lucide-react';
import {
  AppConfig,
  RubricScores1To5,
  Team,
  TeamLeaderboardEntry,
  TelemetryEvent,
  User,
  UserRole,
  Vote,
} from '../server/types.js';
import { TeamSelectModal } from './components/TeamSelectModal.js';
import { ProjectArena } from './components/ProjectArena.js';
import { LeaderboardView } from './components/LeaderboardView.js';
import { AIJudgeInspector } from './components/AIJudgeInspector.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { LoginScreen } from './components/LoginScreen.js';

interface PortalStateResponse {
  currentUser: User;
  teams: Team[];
  myVotes: Vote[];
  leaderboard: TeamLeaderboardEntry[];
  ceremonyRevealed: boolean;
  votingOpen: boolean;
  aiModelName: string;
  lastAiRunTimestamp?: string;
  totalVotesCast: number;
  totalRegisteredUsers: number;
  googleClientId?: string;
  primaryAdminEmail?: string;
  adminData: {
    allUsers: User[];
    allVotes: Vote[];
    fullLeaderboard: TeamLeaderboardEntry[];
    telemetry: TelemetryEvent[];
    config: AppConfig;
  } | null;
}

export const App: React.FC = () => {
  const [activeEmail, setActiveEmail] = useState<string>(
    () => localStorage.getItem('hackathon_active_email') || ''
  );
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(
    () => !localStorage.getItem('hackathon_active_email')
  );
  const [state, setState] = useState<PortalStateResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'ARENA' | 'LEADERBOARD' | 'AI_JUDGE' | 'ADMIN'>(
    'ARENA'
  );
  const [showTeamModalOverride, setShowTeamModalOverride] = useState(false);
  const [loading, setLoading] = useState<boolean>(
    () => Boolean(localStorage.getItem('hackathon_active_email'))
  );
  const [error, setError] = useState<string | null>(null);

  const fetchPortalState = useCallback(async (emailToFetch: string = activeEmail) => {
    if (!emailToFetch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/state', {
        headers: {
          'x-user-email': emailToFetch,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = (await res.json()) as PortalStateResponse;
      setState(data);
    } catch (err: any) {
      console.error('Error loading portal state:', err);
      setError(err.message || 'Failed to load portal state');
    } finally {
      setLoading(false);
    }
  }, [activeEmail]);

  useEffect(() => {
    if (!isLoggedOut && activeEmail) {
      fetchPortalState(activeEmail);
    } else {
      setLoading(false);
    }
  }, [activeEmail, isLoggedOut, fetchPortalState]);

  const handlePersonaSwitch = async (email: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Sign-in failed (${res.status})`);
      }
      localStorage.setItem('hackathon_active_email', email);
      setActiveEmail(email);
      setIsLoggedOut(false);
      await fetchPortalState(email);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleGoogleOAuthLogin = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Google Sign-In failed');
        setLoading(false);
        return;
      }
      const email = data.user?.email;
      if (email) {
        localStorage.setItem('hackathon_active_email', email);
        setActiveEmail(email);
        setIsLoggedOut(false);
        await fetchPortalState(email);
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (state?.currentUser?.email) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.currentUser.email }),
      });
    }
    localStorage.removeItem('hackathon_active_email');
    setActiveEmail('');
    setIsLoggedOut(true);
  };

  const handleSimulateFreshGoogleLogin = async () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const freshEmail = `participant.${randomNum}@skelar.tech`;
    const freshName = `Participant #${randomNum} (New Google Login)`;
    await handlePersonaSwitch(freshEmail, freshName);
  };

  const handleUpdateTeamProject = async (
    teamId: string,
    payload: {
      name?: string;
      projectTitle?: string;
      tagline?: string;
      description?: string;
      githubUrl?: string;
      slideDeckUrl?: string;
      pitchDeckFileName?: string;
      demoUrl?: string;
    }
  ) => {
    if (!state) return;
    const res = await fetch('/api/teams/update-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorEmail: state.currentUser.email,
        teamId,
        ...payload,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update team project');
    }
    await fetchPortalState(state.currentUser.email);
  };

  const handleTeamSelect = async (teamId: string) => {
    if (!state) return;
    const res = await fetch('/api/user/select-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: state.currentUser.email,
        teamId,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to select team');
    }
    await fetchPortalState(state.currentUser.email);
  };

  const handleVoteSubmit = async (
    teamId: string,
    scores: RubricScores1To5,
    comment: string
  ) => {
    if (!state) return;
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterEmail: state.currentUser.email,
        teamId,
        scores,
        comment,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Vote submission rejected');
    }
    await fetchPortalState(state.currentUser.email);
  };

  const handleRunAiJudge = async (transcriptText: string, modelName: string) => {
    const res = await fetch('/api/admin/ai-judge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': activeEmail,
      },
      body: JSON.stringify({
        masterTranscriptText: transcriptText,
        aiModelName: modelName,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'AI Judge execution failed');
    }
    const result = await res.json();
    await fetchPortalState(activeEmail);
    return result;
  };

  const handleToggleCeremonyReveal = async (
    ceremonyRevealed: boolean,
    votingOpen?: boolean
  ) => {
    await fetch('/api/admin/ceremony-reveal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': activeEmail,
      },
      body: JSON.stringify({ ceremonyRevealed, votingOpen }),
    });
    await fetchPortalState(activeEmail);
  };

  const handleOverrideUser = async (
    targetEmail: string,
    newTeamId?: string | null,
    newRole?: UserRole,
    unlockTeam?: boolean
  ) => {
    await fetch('/api/admin/users/override', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': activeEmail,
      },
      body: JSON.stringify({
        targetEmail,
        newTeamId,
        newRole,
        unlockTeam,
      }),
    });
    await fetchPortalState(activeEmail);
  };

  const handleUpdateAllowlists = async (juryAllowlist: string[], adminAllowlist: string[]) => {
    await fetch('/api/admin/allowlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': activeEmail,
      },
      body: JSON.stringify({ juryAllowlist, adminAllowlist }),
    });
    await fetchPortalState(activeEmail);
  };

  const handleCreateTeam = async (team: Partial<Team>) => {
    await fetch('/api/admin/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': activeEmail,
      },
      body: JSON.stringify(team),
    });
    await fetchPortalState(activeEmail);
  };

  const handleDeleteTeam = async (teamId: string) => {
    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        'x-user-email': activeEmail,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete team');
    }
    await fetchPortalState(activeEmail);
  };

  const handleDeleteUser = async (email: string) => {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'x-user-email': activeEmail,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete user');
    }
    await fetchPortalState(activeEmail);
  };

  const primaryAdminEmail =
    state?.primaryAdminEmail || state?.adminData?.config?.adminAllowlist?.[0] || 'admin@genesis.tech';

  const handleResetDemo = async () => {
    await fetch('/api/admin/reset-demo', {
      method: 'POST',
      headers: { 'x-user-email': activeEmail },
    });
    localStorage.setItem('hackathon_active_email', primaryAdminEmail);
    setActiveEmail(primaryAdminEmail);
    await fetchPortalState(primaryAdminEmail);
  };

  if (isLoggedOut) {
    return (
      <LoginScreen
        onLoginWithEmail={async (email, name) => {
          await handlePersonaSwitch(email, name);
        }}
        onLoginWithGoogleCredential={async (credential) => {
          await handleGoogleOAuthLogin(credential);
        }}
        onSimulateFreshParticipant={async () => {
          await handleSimulateFreshGoogleLogin();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(56, 189, 248, 0.2)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div>Loading Genesis × Skelar Hackathon Voting Portal...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          <ShieldAlert size={40} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Connection Issue
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {error || 'Unable to load portal session state from the server.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => fetchPortalState(activeEmail)}
            >
              Retry Connection
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                localStorage.removeItem('hackathon_active_email');
                setActiveEmail('');
                setIsLoggedOut(true);
                setError(null);
              }}
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { currentUser, teams, myVotes, leaderboard, ceremonyRevealed, votingOpen, adminData } =
    state;

  const needsTeamOnboarding = currentUser.teamId === null || showTeamModalOverride;
  const userTeamName =
    currentUser.teamId === 'SPECTATOR'
      ? 'Spectator (All Teams Unlocked)'
      : teams.find((t) => t.id === currentUser.teamId)?.name || 'Unassigned';

  return (
    <div>
      {/* Interactive Role & Persona Testing Switcher Bar — Strictly Restricted to Admins */}
      {currentUser.role === 'ADMIN' && (
        <div className="demo-switcher-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: '#38bdf8' }}>
              ⚡ Admin Persona Testing Switcher:
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Test Admin, Special Jury, Competing Team Member & New Login Onboarding
            </span>
          </div>

          <div className="demo-persona-pills">
            <button
              onClick={() => handlePersonaSwitch(primaryAdminEmail)}
              className={`persona-btn ${activeEmail === primaryAdminEmail ? 'active' : ''}`}
            >
              🛠️ Admin (Organizer - Full Telemetry)
            </button>

            <button
              onClick={() => handlePersonaSwitch('viktor.jury@skelar.tech')}
              className={`persona-btn ${activeEmail === 'viktor.jury@skelar.tech' ? 'active' : ''}`}
            >
              ⚖️ Special Jury (Viktor - Skelar CEO)
            </button>

            <button
              onClick={() => handlePersonaSwitch('dmytro.k@skelar.tech')}
              className={`persona-btn ${activeEmail === 'dmytro.k@skelar.tech' ? 'active' : ''}`}
            >
              🚀 Team NeuralPulse Member (Self-Vote Blocked)
            </button>

            <button
              onClick={handleSimulateFreshGoogleLogin}
              className="persona-btn"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                borderColor: 'rgba(16, 185, 129, 0.35)',
              }}
            >
              <LogIn size={13} /> + Simulate New Google Login (Test Team Modal)
            </button>
          </div>
        </div>
      )}

      {/* Main Application Container */}
      <div className="app-container">
        <header className="navbar">
          <div className="brand-group">
            <div className="brand-logo">G×S</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                  Genesis × Skelar Hackathon 2026
                </h1>
                <span
                  className={`badge ${
                    ceremonyRevealed ? 'badge-participant' : 'badge-jury'
                  }`}
                >
                  {ceremonyRevealed ? '🏆 Ceremony Revealed' : '🔒 Scores Sealed'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Public Voting & Gemini 3.8 Flash Master Transcript AI Judge Portal
              </p>
            </div>
          </div>

          {/* Logged-In Google Profile, Locked Team Badge, & Sign Out Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.45rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  {currentUser.name}{' '}
                  <span
                    className={`badge ${
                      currentUser.role === 'ADMIN'
                        ? 'badge-admin'
                        : currentUser.role === 'SPECIAL_JURY'
                        ? 'badge-jury'
                        : 'badge-participant'
                    }`}
                    style={{ marginLeft: '4px' }}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Lock size={11} style={{ color: '#f59e0b' }} />
                  Team Affiliation: <strong>{userTeamName}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              title="Sign Out of Google Session"
              style={{
                padding: '0.55rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
              }}
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </header>

        {/* Main View Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div className="nav-tabs">
            <button
              onClick={() => setActiveTab('ARENA')}
              className={`nav-tab ${activeTab === 'ARENA' ? 'active' : ''}`}
            >
              <LayoutGrid size={16} /> Finalist Projects & Vote ({teams.length})
            </button>

            <button
              onClick={() => setActiveTab('LEADERBOARD')}
              className={`nav-tab ${activeTab === 'LEADERBOARD' ? 'active' : ''}`}
            >
              <Trophy size={16} /> Live 3-Pillar Leaderboard
            </button>

            <button
              onClick={() => setActiveTab('AI_JUDGE')}
              className={`nav-tab ${activeTab === 'AI_JUDGE' ? 'active' : ''}`}
            >
              <Bot size={16} /> Pillar B: Gemini 3.8 Transcript Judge
            </button>

            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('ADMIN')}
                className={`nav-tab ${activeTab === 'ADMIN' ? 'active' : ''}`}
                style={{
                  color: activeTab === 'ADMIN' ? '#fff' : '#f87171',
                }}
              >
                <ShieldAlert size={16} /> Admin Telemetry & Ceremony Control
              </button>
            )}
          </div>
        </div>

        {/* Active View Content */}
        {activeTab === 'ARENA' && (
          <ProjectArena
            teams={teams}
            currentUser={currentUser}
            myVotes={myVotes}
            votingOpen={votingOpen}
            onVoteSubmitted={handleVoteSubmit}
            onUpdateTeamProject={handleUpdateTeamProject}
            onDeleteTeam={handleDeleteTeam}
          />
        )}

        {activeTab === 'LEADERBOARD' && (
          <LeaderboardView
            leaderboard={leaderboard}
            adminFullLeaderboard={adminData?.fullLeaderboard}
            ceremonyRevealed={ceremonyRevealed}
            currentUser={currentUser}
            totalVotesCast={state.totalVotesCast}
            totalRegisteredUsers={state.totalRegisteredUsers}
            onTriggerCeremonyReveal={
              currentUser.role === 'ADMIN'
                ? (rev) => handleToggleCeremonyReveal(rev, votingOpen)
                : undefined
            }
          />
        )}

        {activeTab === 'AI_JUDGE' && (
          <AIJudgeInspector
            teams={teams}
            masterTranscriptText={adminData?.config.masterTranscriptText || ''}
            aiModelName={state.aiModelName}
            lastAiRunTimestamp={state.lastAiRunTimestamp}
          />
        )}

        {activeTab === 'ADMIN' && currentUser.role === 'ADMIN' && adminData && (
          <AdminDashboard
            allUsers={adminData.allUsers}
            allVotes={adminData.allVotes}
            teams={teams}
            telemetry={adminData.telemetry}
            config={adminData.config}
            currentUser={currentUser}
            onRunAiJudge={handleRunAiJudge}
            onToggleCeremonyReveal={handleToggleCeremonyReveal}
            onOverrideUser={handleOverrideUser}
            onUpdateAllowlists={handleUpdateAllowlists}
            onCreateTeam={handleCreateTeam}
            onResetDemo={handleResetDemo}
            onUpdateTeamProject={handleUpdateTeamProject}
            onDeleteTeam={handleDeleteTeam}
            onDeleteUser={handleDeleteUser}
          />
        )}

        <footer
          style={{
            marginTop: '3.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div>© 2026 Genesis × Skelar Hackathon Voting Portal. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              Terms of Service
            </a>
          </div>
        </footer>
      </div>

      {/* Mandatory Post-Login Team Onboarding Modal */}
      {needsTeamOnboarding && (
        <TeamSelectModal
          currentUser={currentUser}
          teams={teams}
          onTeamSelected={handleTeamSelect}
          onCloseOptional={
            currentUser.teamId ? () => setShowTeamModalOverride(false) : undefined
          }
        />
      )}
    </div>
  );
};
