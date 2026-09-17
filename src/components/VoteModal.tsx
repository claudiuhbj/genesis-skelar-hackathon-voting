import React, { useState } from 'react';
import { X, Star, Award, Send } from 'lucide-react';
import { RubricScores1To5, Team, User, Vote } from '../../server/types.js';

interface VoteModalProps {
  team: Team;
  currentUser: User;
  existingVote?: Vote;
  onClose: () => void;
  onSubmitVote: (teamId: string, scores: RubricScores1To5, comment: string) => Promise<void>;
}

const CRITERIA_DESCRIPTIONS: Array<{
  key: keyof RubricScores1To5;
  label: string;
  desc: string;
}> = [
  {
    key: 'innovation',
    label: '1. Innovation & Originality',
    desc: 'Novelty of the idea, creative use of AI/tech, and uniqueness for Genesis & Skelar.',
  },
  {
    key: 'technicalExecution',
    label: '2. Technical Execution & Depth',
    desc: 'Engineering rigor, working demo completeness, architecture, and AI integration.',
  },
  {
    key: 'businessImpact',
    label: '3. Business Impact & Value',
    desc: 'Real-world ROI, unit economics, customer value, and immediate scalability.',
  },
  {
    key: 'pitchQuality',
    label: '4. Pitch & Demo Clarity',
    desc: 'Storytelling clarity, presentation structure, Q&A handling, and live demo impact.',
  },
];

export const VoteModal: React.FC<VoteModalProps> = ({
  team,
  currentUser,
  existingVote,
  onClose,
  onSubmitVote,
}) => {
  const [scores, setScores] = useState<RubricScores1To5>(
    existingVote?.scores || {
      innovation: 4,
      technicalExecution: 4,
      businessImpact: 4,
      pitchQuality: 4,
    }
  );
  const [comment, setComment] = useState<string>(existingVote?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveAverage = (
    (scores.innovation +
      scores.technicalExecution +
      scores.businessImpact +
      scores.pitchQuality) /
    4
  ).toFixed(2);

  const isJury = currentUser.role === 'SPECIAL_JURY';

  const handleScoreChange = (key: keyof RubricScores1To5, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitVote(team.id, scores, comment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit vote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className={`badge ${isJury ? 'badge-jury' : 'badge-participant'}`}>
                <Award size={13} />
                {isJury
                  ? 'Pillar C: Special Jury Evaluation (33.3% Weight)'
                  : 'Pillar A: Participant Evaluation (33.3% Weight)'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{team.projectTitle}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Presented by <strong>{team.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Live 1-5 Score Preview Banner */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              YOUR CALCULATED 4-CRITERIA AVERAGE
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Scale: 1.00 (Lowest) to 5.00 (Highest)
            </div>
          </div>
          <div
            className="mono"
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: isJury ? '#f59e0b' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Star
              size={24}
              fill={isJury ? '#f59e0b' : '#10b981'}
              color={isJury ? '#f59e0b' : '#10b981'}
            />
            {liveAverage} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 5.00</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {CRITERIA_DESCRIPTIONS.map((item) => {
              const currentVal = scores[item.key];
              return (
                <div key={item.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.label}</label>
                    <span className="mono" style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>
                      {currentVal} / 5 ★
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    {item.desc}
                  </p>
                  <div className="rating-row">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => handleScoreChange(item.key, num)}
                        className={`rating-pill ${currentVal === num ? 'selected' : ''}`}
                      >
                        {num} ★
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', display: 'block', marginBottom: '0.4rem' }}>
                Optional Constructive Feedback / Shoutout for {team.name}
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What impressed you most about their live demo or architecture?"
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${isJury ? 'btn-gold' : 'btn-primary'}`}
              disabled={submitting}
            >
              <Send size={16} />
              {submitting
                ? 'Submitting Vote...'
                : existingVote
                ? `Update Vote (${liveAverage} / 5.00)`
                : `Submit Official Vote (${liveAverage} / 5.00)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
