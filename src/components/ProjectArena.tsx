import React, { useState } from 'react';
import {
  Lock,
  CheckCircle2,
  Bot,
  ChevronDown,
  ChevronUp,
  Quote,
  Star,
  Edit3,
  Trash2,
  Check,
  X,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import { RubricScores1To5, Team, User, Vote } from '../../server/types.js';
import { VoteModal } from './VoteModal.js';

interface ProjectArenaProps {
  teams: Team[];
  currentUser: User;
  myVotes: Vote[];
  votingOpen: boolean;
  onVoteSubmitted: (teamId: string, scores: RubricScores1To5, comment: string) => Promise<void>;
  onUpdateTeamProject: (
    teamId: string,
    payload: {
      name?: string;
      projectTitle?: string;
      description?: string;
    }
  ) => Promise<void>;
  onDeleteTeam?: (teamId: string) => Promise<void>;
  onCreateTeam?: (team: Partial<Team>) => Promise<void>;
}

export const ProjectArena: React.FC<ProjectArenaProps> = ({
  teams,
  currentUser,
  myVotes,
  votingOpen,
  onVoteSubmitted,
  onUpdateTeamProject,
  onDeleteTeam,
  onCreateTeam,
}) => {
  const [activeVoteTeam, setActiveVoteTeam] = useState<Team | null>(null);
  const [expandedAiTeamId, setExpandedAiTeamId] = useState<string | null>(null);

  // Add New Team Modal State (Admin)
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newCategory, setNewCategory] = useState('AI Automation & Agents');
  const [newDescription, setNewDescription] = useState('');
  const [newMemberEmails, setNewMemberEmails] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Inline Editing State per Team Card
  const [inlineEditTeamId, setInlineEditTeamId] = useState<string | null>(null);
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isUserOwnTeam = (team: Team): boolean => {
    const emailLower = currentUser.email.toLowerCase();
    return (
      currentUser.teamId === team.id ||
      team.memberEmails.some((e) => e.toLowerCase() === emailLower)
    );
  };

  const isAdmin = currentUser.role === 'ADMIN';

  const handleCreateNewTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateTeam || !newTeamName.trim() || !newProjectTitle.trim()) return;
    setCreatingTeam(true);
    try {
      await onCreateTeam({
        name: newTeamName.trim(),
        projectTitle: newProjectTitle.trim(),
        category: newCategory,
        description: newDescription.trim(),
        memberEmails: newMemberEmails
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setNewTeamName('');
      setNewProjectTitle('');
      setNewDescription('');
      setNewMemberEmails('');
      setShowAddTeamModal(false);
    } finally {
      setCreatingTeam(false);
    }
  };

  const startInlineEdit = (team: Team) => {
    setInlineEditTeamId(team.id);
    setEditTeamName(team.name);
    setEditProjectTitle(team.projectTitle);
    setEditDescription(team.description);
  };

  const cancelInlineEdit = () => {
    setInlineEditTeamId(null);
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

  return (
    <div>
      {/* Clean Arena Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Finalist Projects</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              fontSize: '0.82rem',
            }}
          >
            Votes Cast:{' '}
            <strong className="mono" style={{ color: '#10b981' }}>
              {myVotes.length} / {teams.filter((t) => !isUserOwnTeam(t)).length}
            </strong>
          </div>

          {isAdmin && onCreateTeam && (
            <button
              type="button"
              onClick={() => setShowAddTeamModal(true)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
              }}
            >
              <PlusCircle size={16} /> + Add a new Team
            </button>
          )}
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid-2">
        {teams.map((team) => {
          const ownTeam = isUserOwnTeam(team);
          const canEdit = ownTeam || isAdmin;
          const isEditingThisCard = inlineEditTeamId === team.id;
          const myVote = myVotes.find((v) => v.teamId === team.id);
          const aiEval = team.aiEvaluation;
          const isAiExpanded = expandedAiTeamId === team.id;

          return (
            <div
              key={team.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderTop: isEditingThisCard
                  ? '3px solid #3b82f6'
                  : ownTeam
                  ? '3px solid #f59e0b'
                  : myVote
                  ? '3px solid #10b981'
                  : '3px solid var(--border-subtle)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div>
                {/* Header Row: Category Badge + Status/Edit Controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    marginBottom: '0.85rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-surface)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '6px',
                    }}
                  >
                    {team.category}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {ownTeam && (
                      <span className="badge badge-jury" title="You belong to this team">
                        <Lock size={12} /> Your Team
                      </span>
                    )}

                    {!ownTeam && myVote && (
                      <span className="badge badge-participant">
                        <CheckCircle2 size={12} /> Voted: {myVote.averageScore.toFixed(2)} ★
                      </span>
                    )}

                    {/* Clean Inline Edit Button (For belonging participant or Admin) */}
                    {canEdit && !isEditingThisCard && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteTeamId(null);
                          startInlineEdit(team);
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.28rem 0.65rem',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          borderColor: isAdmin
                            ? 'rgba(59, 130, 246, 0.45)'
                            : 'rgba(16, 185, 129, 0.45)',
                          color: isAdmin ? '#93c5fd' : '#34d399',
                        }}
                        title={
                          isAdmin
                            ? 'Admin: Edit team name, project title, and description'
                            : 'Edit your team name, project title, and description'
                        }
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                    )}

                    {/* Admin Delete Team Button next to Edit button */}
                    {isAdmin && !isEditingThisCard && onDeleteTeam && (
                      confirmDeleteTeamId === team.id ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(team.id)}
                            disabled={deletingTeamId === team.id}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.28rem 0.65rem',
                              fontSize: '0.75rem',
                              background: 'rgba(239, 68, 68, 0.2)',
                              borderColor: 'rgba(239, 68, 68, 0.55)',
                              color: '#fca5a5',
                              fontWeight: 600,
                            }}
                          >
                            {deletingTeamId === team.id ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTeamId(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                            title="Cancel deletion"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTeamId(team.id)}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.28rem 0.65rem',
                            fontSize: '0.76rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                          }}
                          title="Admin: Delete this team"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Inline Edit Mode vs Read Mode */}
                {isEditingThisCard ? (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      borderRadius: '12px',
                      padding: '1.1rem',
                      marginBottom: '1.25rem',
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
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: '#60a5fa',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <ShieldCheck size={14} />
                        {isAdmin && !ownTeam
                          ? 'Admin Editing Team Details'
                          : 'Editing Your Team Details'}
                      </span>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        className="form-input"
                        placeholder="e.g. Team NeuralPulse"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          fontSize: '0.88rem',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Project Title
                      </label>
                      <input
                        type="text"
                        value={editProjectTitle}
                        onChange={(e) => setEditProjectTitle(e.target.value)}
                        className="form-input"
                        placeholder="e.g. Real-Time Multi-Agent Triage Engine"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          fontSize: '0.92rem',
                          fontWeight: 600,
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '0.9rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Project Description
                      </label>
                      <textarea
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="form-input"
                        placeholder="Describe what your project solves and how it works..."
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          fontSize: '0.86rem',
                          lineHeight: 1.45,
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={cancelInlineEdit}
                        disabled={savingEdit}
                        className="btn btn-secondary"
                        style={{ padding: '0.42rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        <X size={14} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveInlineEdit(team.id)}
                        disabled={savingEdit || !editTeamName.trim() || !editProjectTitle.trim()}
                        className="btn btn-primary"
                        style={{ padding: '0.42rem 0.95rem', fontSize: '0.8rem' }}
                      >
                        <Check size={14} /> {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {team.projectTitle}
                    </h3>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        color: '#10b981',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                      }}
                    >
                      {team.name}
                    </div>

                    <p
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '1.25rem',
                        lineHeight: 1.55,
                      }}
                    >
                      {team.description}
                    </p>
                  </>
                )}

                {/* Gemini AI Judge Verdict Accordion */}
                {aiEval && (
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div
                      onClick={() => setExpandedAiTeamId(isAiExpanded ? null : team.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bot size={18} style={{ color: '#3b82f6' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#93c5fd' }}>
                          Pillar B: Gemini AI Judge ({aiEval.modelUsed})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            color: '#60a5fa',
                            fontSize: '0.9rem',
                          }}
                        >
                          {aiEval.averageScore.toFixed(2)} / 5.00 ★
                        </span>
                        {isAiExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {isAiExpanded && (
                      <div
                        style={{
                          marginTop: '0.85rem',
                          paddingTop: '0.85rem',
                          borderTop: '1px solid rgba(59, 130, 246, 0.2)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <p style={{ color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
                          {aiEval.executiveSummary}
                        </p>

                        <div
                          style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderLeft: '3px solid #3b82f6',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0 6px 6px 0',
                            fontStyle: 'italic',
                            color: '#cbd5e1',
                            marginBottom: '0.65rem',
                          }}
                        >
                          <Quote size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          "{aiEval.notableQuote}"
                        </div>

                        <div
                          className="mono"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.4rem',
                            textAlign: 'center',
                            background: 'var(--bg-surface)',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Innov</div>
                            <div style={{ fontWeight: 700, color: '#60a5fa' }}>
                              {aiEval.scores.innovation}/5
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Tech</div>
                            <div style={{ fontWeight: 700, color: '#60a5fa' }}>
                              {aiEval.scores.technicalExecution}/5
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Impact</div>
                            <div style={{ fontWeight: 700, color: '#60a5fa' }}>
                              {aiEval.scores.businessImpact}/5
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Pitch</div>
                            <div style={{ fontWeight: 700, color: '#60a5fa' }}>
                              {aiEval.scores.pitchQuality}/5
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button Row */}
              <div
                style={{
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {ownTeam ? (
                  <button
                    disabled
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                    }}
                  >
                    <Lock size={16} />
                    Your Team — Self-Voting Disabled
                  </button>
                ) : !votingOpen ? (
                  <button disabled className="btn btn-secondary" style={{ width: '100%' }}>
                    <Lock size={16} /> Voting Closed by Organizer
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveVoteTeam(team)}
                    className={`btn ${myVote ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ width: '100%' }}
                  >
                    <Star size={16} />
                    {myVote
                      ? `Edit Vote (${myVote.averageScore.toFixed(2)} ★)`
                      : 'Vote'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeVoteTeam && (
        <VoteModal
          team={activeVoteTeam}
          currentUser={currentUser}
          existingVote={myVotes.find((v) => v.teamId === activeVoteTeam.id)}
          onClose={() => setActiveVoteTeam(null)}
          onSubmitVote={onVoteSubmitted}
        />
      )}

      {/* Admin "+ Add a new Team" Modal */}
      {showAddTeamModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 13, 22, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            zIndex: 1000,
          }}
          onClick={() => setShowAddTeamModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              background: '#111827',
              border: '1px solid var(--border-strong)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add a New Team</h3>
              <button
                type="button"
                onClick={() => setShowAddTeamModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateNewTeam}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.3rem',
                  }}
                >
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Team QuantumFlow"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.3rem',
                  }}
                >
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autonomous Revenue Agent"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.3rem',
                  }}
                >
                  Track / Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                  }}
                >
                  <option>AI Automation & Agents</option>
                  <option>Autonomous Product Analytics</option>
                  <option>Trust, Safety & FinTech AI</option>
                  <option>Developer Velocity & MLOps</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.3rem',
                  }}
                >
                  Project Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Short summary of the project..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.3rem',
                  }}
                >
                  Team Member Emails (comma-separated, optional)
                </label>
                <input
                  type="text"
                  placeholder="member1@skelar.tech, member2@genesis.tech"
                  value={newMemberEmails}
                  onChange={(e) => setNewMemberEmails(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.65rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeam || !newTeamName.trim() || !newProjectTitle.trim()}
                  className="btn btn-primary"
                >
                  <PlusCircle size={16} />
                  {creatingTeam ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
