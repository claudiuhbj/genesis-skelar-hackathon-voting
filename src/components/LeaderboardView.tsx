import React from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Lock,
  Eye,
  Sparkles,
  Users,
  Bot,
  Award,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { TeamLeaderboardEntry, User } from '../../server/types.js';

interface LeaderboardViewProps {
  leaderboard: TeamLeaderboardEntry[];
  adminFullLeaderboard?: TeamLeaderboardEntry[];
  ceremonyRevealed: boolean;
  currentUser: User;
  totalVotesCast: number;
  totalRegisteredUsers: number;
  onTriggerCeremonyReveal?: (reveal: boolean) => Promise<void>;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  leaderboard,
  adminFullLeaderboard,
  ceremonyRevealed,
  currentUser,
  totalVotesCast,
  totalRegisteredUsers,
  onTriggerCeremonyReveal,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const entriesToDisplay = isAdmin && adminFullLeaderboard ? adminFullLeaderboard : leaderboard;

  const triggerCelebrationConfetti = () => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // CASE 1: Public Participant / Jury viewing while Ceremony Reveal is SEALED
  if (!ceremonyRevealed && !isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#f59e0b',
          }}
        >
          <Lock size={36} />
        </div>

        <span className="badge badge-jury" style={{ marginBottom: '0.75rem' }}>
          CEREMONY SUSPENSE MODE ACTIVE
        </span>

        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Final Leaderboard Sealed for Grand Ceremony Reveal
        </h2>
        <p
          style={{
            maxWidth: '620px',
            margin: '0 auto 2.5rem',
            color: 'var(--text-secondary)',
            fontSize: '1rem',
          }}
        >
          Voting across all 3 pillars—<strong>Participants (33.3%)</strong>,{' '}
          <strong>Gemini 3.8 Flash AI Judge (33.3%)</strong>, and{' '}
          <strong>Special Jury (33.3%)</strong>—is actively being tallied. Exact 1.00–5.00 scores
          will be unveiled live on stage!
        </p>

        {/* Live Hackathon Pulse Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            maxWidth: '860px',
            margin: '0 auto 2.5rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
              TOTAL VOTES RECORDED
            </div>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
              {totalVotesCast}
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
              GEMINI 3.8 FLASH AI JUDGE
            </div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#3b82f6',
                marginTop: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <CheckCircle2 size={18} /> Transcript Evaluated
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
              VERIFIED VOTERS ONLINE
            </div>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
              {totalRegisteredUsers}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CASE 2: Ceremony Revealed OR Admin Always-On Live Visibility
  const top3 = entriesToDisplay.slice(0, 3);

  return (
    <div>
      {/* Admin Always-On Visibility Banner when Ceremony is Sealed for Public */}
      {isAdmin && !ceremonyRevealed && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(59, 130, 246, 0.16))',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Eye size={22} style={{ color: '#f59e0b' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fde68a' }}>
                ADMIN ALWAYS-ON LIVE VISIBILITY (Public Suspense Mode Active)
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                You are viewing real-time unmasked rankings & 1–5 pillar scores. Non-admin users
                currently see the Ceremony Suspense screen.
              </div>
            </div>
          </div>

          {onTriggerCeremonyReveal && (
            <button
              className="btn btn-gold"
              onClick={async () => {
                await onTriggerCeremonyReveal(true);
                triggerCelebrationConfetti();
              }}
            >
              <Trophy size={16} /> Trigger Grand Ceremony Reveal to Public
            </button>
          )}
        </div>
      )}

      {isAdmin && ceremonyRevealed && onTriggerCeremonyReveal && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#34d399', fontWeight: 600 }}>
            <Sparkles size={18} /> Grand Ceremony Reveal is LIVE for all public participants!
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-secondary" onClick={triggerCelebrationConfetti}>
              🎉 Launch Confetti
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onTriggerCeremonyReveal(false)}
            >
              <Lock size={14} /> Re-Seal Ceremony Scores
            </button>
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        {top3.map((entry, idx) => {
          const isFirst = idx === 0;
          const medalColor =
            idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#d97706';
          const medalLabel =
            idx === 0 ? '🏆 1ST PLACE CHAMPION' : idx === 1 ? '🥈 2ND PLACE' : '🥉 3RD PLACE';

          return (
            <div
              key={entry.team.id}
              className="card"
              style={{
                borderTop: `4px solid ${medalColor}`,
                background: isFirst
                  ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, var(--bg-secondary) 100%)'
                  : 'var(--bg-secondary)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: medalColor,
                    letterSpacing: '0.04em',
                  }}
                >
                  {medalLabel}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {entry.finalCompositeScore.toFixed(2)}{' '}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 5.00</span>
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                {entry.team.projectTitle}
              </h3>
              <div style={{ fontSize: '0.88rem', color: '#10b981', fontWeight: 600, marginBottom: '1rem' }}>
                {entry.team.name}
              </div>

              {/* 3-Pillar Mini Breakdown */}
              <div
                className="mono"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  background: 'var(--bg-surface)',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>A: Peers</div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    {entry.participantAverage.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>B: Gemini AI</div>
                  <div style={{ fontWeight: 700, color: '#3b82f6' }}>
                    {entry.aiJudgeScore.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>C: Jury</div>
                  <div style={{ fontWeight: 700, color: '#f59e0b' }}>
                    {entry.specialJuryAverage.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full 3-Pillar Scoreboard Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Official 3-Pillar Hackathon Standings (1.00 – 5.00 Scale)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Equal 3-Way Formula: 33.3% Participants + 33.3% Gemini AI Judge + 33.3% Special Jury
              (Ties broken by Special Jury score)
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Rank</th>
                <th>Team & Project</th>
                <th>
                  <span style={{ color: '#10b981' }}>●</span> Pillar A: Participants (33.3%)
                </th>
                <th>
                  <span style={{ color: '#3b82f6' }}>●</span> Pillar B: Gemini AI Judge (33.3%)
                </th>
                <th>
                  <span style={{ color: '#f59e0b' }}>●</span> Pillar C: Special Jury (33.3%)
                </th>
                <th style={{ textAlign: 'right' }}>Final Score (1–5)</th>
              </tr>
            </thead>
            <tbody>
              {entriesToDisplay.map((entry) => {
                const pct = Math.min(100, (entry.finalCompositeScore / 5) * 100);
                return (
                  <tr key={entry.team.id}>
                    <td className="mono" style={{ fontWeight: 700, fontSize: '1rem' }}>
                      #{entry.rank}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {entry.team.projectTitle}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {entry.team.name} • {entry.team.category}
                      </div>
                    </td>
                    <td className="mono">
                      <span style={{ fontWeight: 700, color: '#10b981' }}>
                        {entry.participantAverage.toFixed(2)}
                      </span>{' '}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({entry.participantVoteCount} votes)
                      </span>
                    </td>
                    <td className="mono">
                      <span style={{ fontWeight: 700, color: '#3b82f6' }}>
                        {entry.aiJudgeScore.toFixed(2)}
                      </span>{' '}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        (3.8 Flash)
                      </span>
                    </td>
                    <td className="mono">
                      <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                        {entry.specialJuryAverage.toFixed(2)}
                      </span>{' '}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({entry.specialJuryVoteCount} jury)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        className="mono"
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {entry.finalCompositeScore.toFixed(2)} / 5.00
                      </div>
                      <div
                        style={{
                          width: '120px',
                          height: '6px',
                          background: 'var(--bg-surface)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginLeft: 'auto',
                          marginTop: '4px',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background:
                              'linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #f59e0b 100%)',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
