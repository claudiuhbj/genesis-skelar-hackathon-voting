import React, { useState } from 'react';
import {
  Users,
  Bot,
  Activity,
  Settings,
  Unlock,
  Lock,
  Sparkles,
  Trophy,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  ShieldAlert,
  Edit3,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import {
  AppConfig,
  Team,
  TelemetryEvent,
  User,
  UserRole,
  Vote,
} from '../../server/types.js';

interface AdminDashboardProps {
  currentUser: User;
  allUsers: User[];
  allVotes: Vote[];
  teams: Team[];
  telemetry: TelemetryEvent[];
  config: AppConfig;
  onRunAiJudge: (transcriptText: string, modelName: string) => Promise<any>;
  onToggleCeremonyReveal: (revealed: boolean, votingOpen?: boolean) => Promise<void>;
  onOverrideUser: (
    targetEmail: string,
    newTeamId?: string | null,
    newRole?: UserRole,
    unlockTeam?: boolean
  ) => Promise<void>;
  onUpdateAllowlists: (juryList: string[], adminList: string[]) => Promise<void>;
  onCreateTeam: (team: Partial<Team>) => Promise<void>;
  onUpdateTeamProject: (
    teamId: string,
    payload: {
      name?: string;
      projectTitle?: string;
      description?: string;
    }
  ) => Promise<void>;
  onDeleteTeam?: (teamId: string) => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  allUsers,
  allVotes,
  teams,
  telemetry,
  config,
  onRunAiJudge,
  onToggleCeremonyReveal,
  onOverrideUser,
  onUpdateAllowlists,
  onCreateTeam,
  onUpdateTeamProject,
  onDeleteTeam,
  onResetDemo,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'USERS_TELEMETRY' | 'AI_JUDGE' | 'AUDIT_FEED' | 'SETTINGS'
  >('USERS_TELEMETRY');

  // Inline Team Edit State
  const [inlineEditTeamId, setInlineEditTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Team Delete Confirmation State
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  const handleConfirmDelete = async (teamId: string) => {
    if (!onDeleteTeam) return;
    setDeletingTeamId(teamId);
    try {
      await onDeleteTeam(teamId);
      setConfirmDeleteTeamId(null);
    } finally {
      setDeletingTeamId(null);
    }
  };

  const startInlineEdit = (team: Team) => {
    setInlineEditTeamId(team.id);
    setEditTeamName(team.name);
    setEditProjectTitle(team.projectTitle);
    setEditDescription(team.description);
  };

  const handleSaveInlineEdit = async (teamId: string) => {
    if (!editTeamName.trim() || !editProjectTitle.trim()) return;
    setSavingEdit(true);
    try {
      await onUpdateTeamProject(teamId, {
        name: editTeamName.trim(),
        projectTitle: editProjectTitle.trim(),
        description: editDescription.trim(),
      });
      setInlineEditTeamId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  // AI Judge form state
  const [transcriptText, setTranscriptText] = useState(config.masterTranscriptText);
  const [aiModel, setAiModel] = useState(config.aiModelName || 'gemini-3.8-flash');
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResultBanner, setAiResultBanner] = useState<string | null>(null);

  // Settings form state
  const [juryInput, setJuryInput] = useState(config.juryAllowlist.join(', '));
  const [adminInput, setAdminInput] = useState(config.adminAllowlist.join(', '));

  // New Team form state
  const [newTeamName, setNewTeamName] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newCategory, setNewCategory] = useState('AI Venture Track');
  const [newDescription, setNewDescription] = useState('');
  const [newMemberEmails, setNewMemberEmails] = useState('');

  const handleRunAi = async () => {
    setAiRunning(true);
    setAiResultBanner(null);
    try {
      const res = await onRunAiJudge(transcriptText, aiModel);
      setAiResultBanner(
        `✅ Gemini (${res.modelUsed}) evaluated ${res.evaluations.length} teams on the 1–5 rubric scale!${
          res.missingTeamIds.length > 0
            ? ` ⚠️ Note: ${res.missingTeamIds.length} team(s) were not mentioned in this transcript.`
            : ''
        }`
      );
    } catch (err: any) {
      setAiResultBanner(`❌ Error running AI Judge: ${err.message}`);
    } finally {
      setAiRunning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setTranscriptText(ev.target.result);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAllowlists = async () => {
    const jList = juryInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const aList = adminInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    await onUpdateAllowlists(jList, aList);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !newProjectTitle) return;
    await onCreateTeam({
      name: newTeamName,
      projectTitle: newProjectTitle,
      category: newCategory,
      description: newDescription,
      memberEmails: newMemberEmails
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setNewTeamName('');
    setNewProjectTitle('');
    setNewDescription('');
    setNewMemberEmails('');
  };

  return (
    <div>
      {/* Top Ceremony & Status Control Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(90deg, #111827 0%, #1e293b 100%)',
          border: '1px solid var(--border-strong)',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span className="badge badge-admin">ADMIN COMMAND CENTER & FULL TELEMETRY</span>
            <span className={`badge ${config.ceremonyRevealed ? 'badge-participant' : 'badge-jury'}`}>
              {config.ceremonyRevealed
                ? '🏆 Public Leaderboard: REVEALED'
                : '🔒 Public Leaderboard: SUSPENSE MODE'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            Hackathon Organizer Telemetry & AI Judge Console
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${config.ceremonyRevealed ? 'btn-secondary' : 'btn-gold'}`}
            onClick={() => onToggleCeremonyReveal(!config.ceremonyRevealed)}
          >
            {config.ceremonyRevealed ? (
              <>
                <Lock size={16} /> Seal Public Leaderboard (Suspense Mode)
              </>
            ) : (
              <>
                <Trophy size={16} /> Trigger Grand Ceremony Reveal to Public
              </>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => onToggleCeremonyReveal(config.ceremonyRevealed, !config.votingOpen)}
          >
            {config.votingOpen ? 'Pause Voting' : 'Re-Open Voting'}
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setActiveSubTab('USERS_TELEMETRY')}
          className={`btn ${
            activeSubTab === 'USERS_TELEMETRY' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          <Users size={16} /> Logged-In Users & Team Registry ({allUsers.length})
        </button>

        <button
          onClick={() => setActiveSubTab('AI_JUDGE')}
          className={`btn ${activeSubTab === 'AI_JUDGE' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Bot size={16} /> "One Big Transcript" Gemini 3.8 Judge
        </button>

        <button
          onClick={() => setActiveSubTab('AUDIT_FEED')}
          className={`btn ${activeSubTab === 'AUDIT_FEED' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Activity size={16} /> Live Security & Telemetry Audit ({telemetry.length})
        </button>

        <button
          onClick={() => setActiveSubTab('SETTINGS')}
          className={`btn ${activeSubTab === 'SETTINGS' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Settings size={16} /> Teams, Jury Allowlist & Reset
        </button>
      </div>

      {/* SUB-TAB 1: LOGGED-IN USERS & TEAM AFFILIATION REGISTRY */}
      {activeSubTab === 'USERS_TELEMETRY' && (
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Complete User Registry & Team Affiliation Telemetry
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Monitor every logged-in participant, their locked team selection, vote progress, and
                override/reset team locks if needed.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User (Name & Email)</th>
                    <th>Assigned Role</th>
                    <th>Selected Team Affiliation</th>
                    <th>Lock Status</th>
                    <th>Votes Cast</th>
                    <th>Admin Override Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => {
                    const userVotes = allVotes.filter(
                      (v) => v.voterEmail.toLowerCase() === u.email.toLowerCase()
                    );
                    const affiliatedTeam = teams.find((t) => t.id === u.teamId);

                    return (
                      <tr key={u.email}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {u.email}
                          </div>
                        </td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) =>
                              onOverrideUser(
                                u.email,
                                u.teamId,
                                e.target.value as UserRole,
                                !u.teamLocked
                              )
                            }
                            style={{
                              background: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-strong)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            <option value="PARTICIPANT">👤 PARTICIPANT</option>
                            <option value="SPECIAL_JURY">⚖️ SPECIAL_JURY</option>
                            <option value="ADMIN">🛠️ ADMIN</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={u.teamId || ''}
                            onChange={(e) =>
                              onOverrideUser(
                                u.email,
                                e.target.value || null,
                                u.role,
                                false
                              )
                            }
                            style={{
                              background: 'var(--bg-surface)',
                              color:
                                u.teamId === 'SPECTATOR'
                                  ? '#60a5fa'
                                  : affiliatedTeam
                                  ? '#10b981'
                                  : '#f87171',
                              border: '1px solid var(--border-strong)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                            }}
                          >
                            <option value="">⚠️ Unselected (Pending Modal)</option>
                            <option value="SPECTATOR">👀 Spectator / No Competing Team</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                🚀 {t.name} ({t.projectTitle})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {u.teamLocked ? (
                            <span className="badge badge-jury">
                              <Lock size={12} /> Locked
                            </span>
                          ) : (
                            <span className="badge badge-participant">
                              <Unlock size={12} /> Unlocked
                            </span>
                          )}
                        </td>
                        <td className="mono">
                          <strong>{userVotes.length}</strong> votes cast
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                            onClick={() =>
                              onOverrideUser(u.email, u.teamId, u.role, u.teamLocked)
                            }
                          >
                            {u.teamLocked ? (
                              <>
                                <Unlock size={13} /> Unlock Team Choice
                              </>
                            ) : (
                              <>
                                <Lock size={13} /> Lock Team Choice
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team-by-Team Roster Breakdown */}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
            Team Membership & Voter Breakdown
          </h3>
          <div className="grid-2">
            {teams.map((team) => {
              const teamMembers = allUsers.filter(
                (u) =>
                  u.teamId === team.id ||
                  team.memberEmails.some((e) => e.toLowerCase() === u.email.toLowerCase())
              );
              const teamVotes = allVotes.filter((v) => v.teamId === team.id);

              return (
                <div key={team.id} className="card">
                  {inlineEditTeamId === team.id ? (
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginBottom: '0.85rem',
                      }}
                    >
                      <div style={{ marginBottom: '0.65rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          Team Name
                        </label>
                        <input
                          type="text"
                          value={editTeamName}
                          onChange={(e) => setEditTeamName(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div style={{ marginBottom: '0.65rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          Project Title
                        </label>
                        <input
                          type="text"
                          value={editProjectTitle}
                          onChange={(e) => setEditProjectTitle(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.88rem', fontWeight: 600 }}
                        />
                      </div>

                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          Project Description
                        </label>
                        <textarea
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', padding: '0.5rem 0.65rem', fontSize: '0.82rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                        <button
                          type="button"
                          onClick={() => setInlineEditTeamId(null)}
                          disabled={savingEdit}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.76rem' }}
                        >
                          <X size={13} /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit(team.id)}
                          disabled={savingEdit || !editTeamName.trim() || !editProjectTitle.trim()}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.76rem' }}
                        >
                          <Check size={13} /> {savingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{team.name}</h4>
                        <div style={{ fontSize: '0.8rem', color: '#10b981' }}>
                          {team.projectTitle}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}
                          onClick={() => startInlineEdit(team)}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        {onDeleteTeam && (
                          confirmDeleteTeamId === team.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <button
                                className="btn btn-danger"
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.74rem',
                                  background: 'rgba(239, 68, 68, 0.25)',
                                  border: '1px solid #ef4444',
                                  color: '#fca5a5',
                                }}
                                disabled={deletingTeamId === team.id}
                                onClick={() => handleConfirmDelete(team.id)}
                                title="Confirm permanent team deletion"
                              >
                                <Trash2 size={13} />{' '}
                                {deletingTeamId === team.id ? 'Deleting...' : 'Confirm Delete'}
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.45rem', fontSize: '0.74rem' }}
                                onClick={() => setConfirmDeleteTeamId(null)}
                                title="Cancel deletion"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.76rem',
                                color: '#f87171',
                                borderColor: 'rgba(239, 68, 68, 0.35)',
                              }}
                              onClick={() => setConfirmDeleteTeamId(team.id)}
                              title="Delete team (Admin only)"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          )
                        )}
                        <span className="badge badge-participant">
                          {teamVotes.length} External Votes Received
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Registered Team Members (Blocked from Self-Voting):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {teamMembers.map((m) => (
                        <span
                          key={m.email}
                          className="mono"
                          style={{
                            fontSize: '0.75rem',
                            background: 'var(--bg-surface)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {m.name} ({m.email})
                        </span>
                      ))}
                      {team.memberEmails
                        .filter(
                          (e) => !teamMembers.some((m) => m.email.toLowerCase() === e.toLowerCase())
                        )
                        .map((email) => (
                          <span
                            key={email}
                            className="mono"
                            style={{
                              fontSize: '0.75rem',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                            }}
                          >
                            {email} (Pre-listed)
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Individual Votes Audit */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Individual Votes Cast on {team.name}:
                    </div>
                    {teamVotes.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        No external votes recorded yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {teamVotes.map((v) => (
                          <div
                            key={v.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'var(--bg-surface)',
                              padding: '0.45rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div>
                              <strong>{v.voterName}</strong>{' '}
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  color: v.voterRole === 'SPECIAL_JURY' ? '#f59e0b' : '#10b981',
                                }}
                              >
                                [{v.voterRole}]
                              </span>
                            </div>
                            <div className="mono" style={{ fontWeight: 700 }}>
                              {v.averageScore.toFixed(2)} / 5.00 ★
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: "ONE BIG TRANSCRIPT" GEMINI 3.8 FLASH AI JUDGE */}
      {activeSubTab === 'AI_JUDGE' && (
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                "One Big Transcript" Automated Gemini AI Judge
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Upload or paste the complete hackathon demo meeting transcript (.txt/.vtt). Gemini
                will automatically identify all pitching teams, extract verbatim quotes, and rate
                each team on the 1–5 rubric scale.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Gemini Model:</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.85rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Requested Flash Judge)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash (1M Token Long Context)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning Judge)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <label style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Master Meeting Transcript Text:
              </label>
              <label
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Upload .txt / .vtt File
                <input
                  type="file"
                  accept=".txt,.vtt,.md"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <textarea
              rows={14}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              className="mono"
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                lineHeight: 1.55,
              }}
            />
          </div>

          {aiResultBanner && (
            <div
              style={{
                background: aiResultBanner.startsWith('✅')
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${
                  aiResultBanner.startsWith('✅') ? '#10b981' : '#ef4444'
                }`,
                color: aiResultBanner.startsWith('✅') ? '#34d399' : '#f87171',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontWeight: 600,
                fontSize: '0.88rem',
              }}
            >
              {aiResultBanner}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleRunAi}
            disabled={aiRunning}
            style={{ width: '100%', padding: '0.9rem', fontSize: '0.95rem' }}
          >
            <Sparkles size={18} />
            {aiRunning
              ? `Gemini (${aiModel}) Analyzing Master Transcript & Scoring Teams...`
              : `Run Gemini (${aiModel}) Master Transcript Evaluation & Update Pillar B Scores`}
          </button>
        </div>
      )}

      {/* SUB-TAB 3: LIVE SECURITY & TELEMETRY AUDIT FEED */}
      {activeSubTab === 'AUDIT_FEED' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Real-Time Platform Security & Telemetry Audit Log
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Chronological stream of Google logins, team affiliation locks, votes cast, and blocked
              self-voting attempts.
            </p>
          </div>

          <div style={{ maxHeight: '540px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Timestamp</th>
                  <th style={{ width: '180px' }}>Event Type</th>
                  <th style={{ width: '220px' }}>Actor</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.map((ev) => {
                  const isBlocked =
                    ev.type === 'SELF_VOTE_BLOCKED' ||
                    ev.type === 'SECURITY_UNAUTHORIZED_COLLATERAL_EDIT_BLOCKED';
                  return (
                    <tr
                      key={ev.id}
                      style={{
                        background: isBlocked ? 'rgba(239, 68, 68, 0.08)' : undefined,
                      }}
                    >
                      <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isBlocked
                              ? 'badge-admin'
                              : ev.type === 'VOTE_CAST'
                              ? 'badge-participant'
                              : 'badge-ai'
                          }`}
                        >
                          {ev.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.actorName}</div>
                        <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {ev.actorEmail}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{ev.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SETTINGS, ALLOWLISTS & ADD TEAM */}
      {activeSubTab === 'SETTINGS' && (
        <div className="grid-2">
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
              Role Allowlists (Google OAuth Emails)
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                Special Jury Allowlist Emails (comma-separated):
              </label>
              <textarea
                rows={3}
                value={juryInput}
                onChange={(e) => setJuryInput(e.target.value)}
                className="mono"
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                Admin Allowlist Emails (comma-separated):
              </label>
              <textarea
                rows={2}
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                className="mono"
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={handleSaveAllowlists}>
                Save Role Allowlists
              </button>
              <button className="btn btn-secondary" onClick={onResetDemo}>
                <RotateCcw size={15} /> Reset Portal to Seed Data
              </button>
            </div>
          </div>

          {/* Add New Team Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
              Register Additional Hackathon Team
            </h3>
            <form onSubmit={handleAddTeam} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <input
                type="text"
                placeholder="Team Name (e.g. Team Rocket AI)"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                type="text"
                placeholder="Project Title"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                required
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                type="text"
                placeholder="Member Emails (comma-separated, to block self-voting)"
                value={newMemberEmails}
                onChange={(e) => setNewMemberEmails(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  color: 'var(--text-primary)',
                }}
              />
              <textarea
                rows={2}
                placeholder="Project Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  color: 'var(--text-primary)',
                }}
              />
              <button type="submit" className="btn btn-primary">
                <PlusCircle size={16} /> Register Hackathon Team
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
