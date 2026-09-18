import React, { useState } from 'react';
import { Bot, FileText, Quote, CheckCircle2, Sparkles, UserCheck, Flame } from 'lucide-react';
import { Team } from '../../server/types.js';

interface AIJudgeInspectorProps {
  teams: Team[];
  masterTranscriptText: string;
  aiModelName: string;
  lastAiRunTimestamp?: string;
}

export const AIJudgeInspector: React.FC<AIJudgeInspectorProps> = ({
  teams,
  masterTranscriptText,
  aiModelName,
  lastAiRunTimestamp,
}) => {
  const [showRawTranscript, setShowRawTranscript] = useState(false);

  return (
    <div>
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          AI Judge Evaluations
        </h2>

        <button
          className="btn btn-secondary"
          onClick={() => setShowRawTranscript(!showRawTranscript)}
        >
          <FileText size={16} />
          {showRawTranscript ? 'Hide Transcript' : 'View Transcript'}
        </button>
      </div>

      {showRawTranscript && (
        <div
          className="card"
          style={{
            marginBottom: '2rem',
            background: 'var(--bg-surface)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', color: '#93c5fd' }}>
              Master Finale Demo Transcript (Ingested by {aiModelName})
            </h4>
            {lastAiRunTimestamp && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Last Evaluated: {new Date(lastAiRunTimestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <pre
            className="mono"
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              maxHeight: '340px',
              overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1rem',
              borderRadius: '8px',
              lineHeight: 1.6,
            }}
          >
            {masterTranscriptText}
          </pre>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {teams.map((team) => {
          const ev = team.aiEvaluation;
          if (!ev) return null;

          return (
            <div
              key={team.id}
              className="card"
              style={{
                borderLeft: '4px solid #3b82f6',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#60a5fa', fontWeight: 600 }}>
                    {team.name} • Detected Speakers: {ev.detectedSpeakers.join(', ')}
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{team.projectTitle}</h3>
                </div>

                <div
                  className="mono"
                  style={{
                    background: 'rgba(59, 130, 246, 0.14)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>GEMINI RUBRIC SCORE</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#60a5fa' }}>
                    {ev.averageScore.toFixed(2)} <span style={{ fontSize: '0.9rem' }}>/ 5.00 ★</span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.95rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                {ev.executiveSummary}
              </p>

              {/* Verbatim Transcript Quote */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderLeft: '3px solid #10b981',
                  padding: '0.75rem 1rem',
                  borderRadius: '0 8px 8px 0',
                  marginBottom: ev.aiRoast ? '0.85rem' : '1.25rem',
                  fontSize: '0.88rem',
                  fontStyle: 'italic',
                  color: '#cbd5e1',
                }}
              >
                <Quote size={14} style={{ display: 'inline', marginRight: '6px', color: '#10b981' }} />
                "{ev.notableQuote}"
              </div>

              {/* AI Judge Roast */}
              {ev.aiRoast && (
                <div
                  style={{
                    background: 'rgba(249, 115, 22, 0.08)',
                    border: '1px solid rgba(249, 115, 22, 0.35)',
                    borderLeft: '3px solid #f97316',
                    padding: '0.75rem 1rem',
                    borderRadius: '0 8px 8px 0',
                    marginBottom: '1.25rem',
                    fontSize: '0.88rem',
                    color: '#fed7aa',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#fb923c',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <Flame size={14} /> AI Judge Roast
                  </div>
                  <div>{ev.aiRoast}</div>
                </div>
              )}

              {/* 4-Criteria 1-5 Score Grid */}
              <div
                className="mono"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    1. Innovation
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa' }}>
                    {ev.scores.innovation} / 5 ★
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    2. Technical Execution
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa' }}>
                    {ev.scores.technicalExecution} / 5 ★
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    3. Business Impact
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa' }}>
                    {ev.scores.businessImpact} / 5 ★
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    4. Pitch & Q&A Quality
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa' }}>
                    {ev.scores.pitchQuality} / 5 ★
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      color: '#10b981',
                      marginBottom: '0.4rem',
                    }}
                  >
                    ✓ Key Strengths Identified by Gemini
                  </div>
                  <ul style={{ paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {ev.strengths.map((s, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.06)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      color: '#f59e0b',
                      marginBottom: '0.4rem',
                    }}
                  >
                    ⚡ Growth Opportunities & Next Steps
                  </div>
                  <ul style={{ paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {ev.weaknesses.map((w, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
