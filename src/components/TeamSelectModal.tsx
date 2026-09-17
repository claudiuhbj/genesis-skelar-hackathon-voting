import React, { useState } from 'react';
import { ShieldAlert, Users, Eye, CheckCircle2, Lock } from 'lucide-react';
import { Team, User } from '../../server/types.js';

interface TeamSelectModalProps {
  currentUser: User;
  teams: Team[];
  onTeamSelected: (teamId: string) => Promise<void>;
  onCloseOptional?: () => void;
}

export const TeamSelectModal: React.FC<TeamSelectModalProps> = ({
  currentUser,
  teams,
  onTeamSelected,
  onCloseOptional,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    currentUser.teamId || 'SPECTATOR'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onTeamSelected(selectedId);
      if (onCloseOptional) onCloseOptional();
    } catch (err: any) {
      setError(err.message || 'Failed to lock team selection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: '660px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              Welcome, {currentUser.name}! Select Your Affiliation
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Signed in via Google ({currentUser.email})
            </p>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <ShieldAlert size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#fde68a' }}>
            <strong>Fair Play Anti-Self-Voting Rule:</strong> Please select the hackathon team you belong to.{' '}
            <strong>Once confirmed, this choice is permanently locked</strong> (only a Hackathon Admin can reset it) and you will be prevented from voting for your own team.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
          {/* Spectator / Non-competing Option */}
          <div
            onClick={() => setSelectedId('SPECTATOR')}
            style={{
              padding: '1rem 1.15rem',
              borderRadius: '10px',
              border:
                selectedId === 'SPECTATOR'
                  ? '2px solid #3b82f6'
                  : '1px solid var(--border-subtle)',
              background:
                selectedId === 'SPECTATOR'
                  ? 'rgba(59, 130, 246, 0.12)'
                  : 'var(--bg-surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Eye size={20} style={{ color: '#3b82f6' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  Spectator / Executive / Special Jury (No Competing Team)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  I am not competing on any team and want to evaluate & vote on all finalist projects.
                </div>
              </div>
            </div>
            {selectedId === 'SPECTATOR' && <CheckCircle2 size={20} style={{ color: '#3b82f6' }} />}
          </div>

          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginTop: '0.4rem',
            }}
          >
            Or Select Your Competing Hackathon Team:
          </div>

          {teams.map((team) => {
            const isSelected = selectedId === team.id;
            return (
              <div
                key={team.id}
                onClick={() => setSelectedId(team.id)}
                style={{
                  padding: '0.9rem 1.15rem',
                  borderRadius: '10px',
                  border: isSelected
                    ? '2px solid #10b981'
                    : '1px solid var(--border-subtle)',
                  background: isSelected
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'var(--bg-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {team.name} — <span style={{ color: '#10b981' }}>{team.projectTitle}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {team.tagline}
                  </div>
                </div>
                {isSelected && <CheckCircle2 size={20} style={{ color: '#10b981' }} />}
              </div>
            );
          })}
        </div>

        {error && (
          <div
            style={{
              color: '#f87171',
              background: 'rgba(239, 68, 68, 0.12)',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          {onCloseOptional && currentUser.teamId && (
            <button className="btn btn-secondary" onClick={onCloseOptional}>
              Cancel
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
          >
            <Lock size={16} />
            {loading
              ? 'Locking Team Affiliation...'
              : `Confirm & Permanently Lock Selection (${
                  selectedId === 'SPECTATOR'
                    ? 'Spectator / All Teams Unlocked'
                    : teams.find((t) => t.id === selectedId)?.name
                })`}
          </button>
        </div>
      </div>
    </div>
  );
};
