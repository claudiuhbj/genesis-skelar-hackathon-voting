import { RubricScores1To5, Team, TeamLeaderboardEntry, User, Vote } from './types.js';

export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function computeRubricAverage(scores: RubricScores1To5): number {
  const sum =
    Number(scores.innovation) +
    Number(scores.technicalExecution) +
    Number(scores.businessImpact) +
    Number(scores.pitchQuality);
  return round2(sum / 4);
}

export function validateRubricScores(scores: RubricScores1To5 | null | undefined): boolean {
  if (!scores || typeof scores !== 'object') return false;
  const vals = [
    scores.innovation,
    scores.technicalExecution,
    scores.businessImpact,
    scores.pitchQuality,
  ];
  return vals.every(
    (v) => typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v >= 1 && v <= 5
  );
}

export function canUserVoteForTeam(
  user: User,
  team: Team
): { allowed: boolean; reason?: string } {
  if (!user.teamId) {
    return {
      allowed: false,
      reason: 'Mandatory Onboarding: Please select your team affiliation (or Spectator status) before voting.',
    };
  }

  const emailLower = user.email.toLowerCase();
  const isListedMember = team.memberEmails.some((e) => e.toLowerCase() === emailLower);

  if (user.teamId === team.id || isListedMember) {
    return {
      allowed: false,
      reason: `Fair Play Rule: You are registered with ${team.name} and cannot vote for your own team's project.`,
    };
  }

  return { allowed: true };
}

/**
 * Security Best Practice: Enforce Role-Based Access Control (RBAC) for editing team collaterals.
 * - ADMINs can edit collaterals for ALL teams.
 * - PARTICIPANTs and SPECIAL_JURY members can ONLY edit collaterals for their own assigned/locked team.
 */
export function canUserEditTeamCollaterals(
  user: User,
  team: Team
): { allowed: boolean; reason?: string } {
  if (user.role === 'ADMIN') {
    return { allowed: true };
  }

  const emailLower = user.email.toLowerCase();
  const isMember =
    user.teamId === team.id ||
    team.memberEmails.some((e) => e.toLowerCase() === emailLower);

  if (!isMember) {
    return {
      allowed: false,
      reason: `Security RBAC Restriction (403 Forbidden): Participants can only modify collaterals for their own assigned team (${user.teamId || 'Unassigned'}). Only Hackathon Admins have cross-team collateral access.`,
    };
  }

  return { allowed: true };
}

/**
 * Security Best Practice: Sanitize collateral URLs (GitHub, Pitch Deck, Live Demo) against XSS injection
 * (e.g., javascript:, vbscript:, data:text/html). Allows https://, http://, and data:application/pdf;base64,...
 */
export function sanitizeCollateralUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:application/pdf;base64,')) {
    return trimmed;
  }

  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    return trimmed;
  }

  throw new Error(
    `Security Protocol Violation: URL "${trimmed.slice(0, 32)}..." rejected. Only https://, http://, or uploaded PDF documents are permitted.`
  );
}

export function calculateLeaderboard(
  teams: Team[],
  votes: Vote[],
  weights: { participants: number; aiJudge: number; specialJury: number } = {
    participants: 1 / 3,
    aiJudge: 1 / 3,
    specialJury: 1 / 3,
  }
): TeamLeaderboardEntry[] {
  const entries: TeamLeaderboardEntry[] = teams.map((team) => {
    const teamVotes = votes.filter((v) => v.teamId === team.id);
    const participantVotes = teamVotes.filter((v) => v.voterRole === 'PARTICIPANT');
    const juryVotes = teamVotes.filter((v) => v.voterRole === 'SPECIAL_JURY');

    const participantAverage =
      participantVotes.length > 0
        ? round2(
            participantVotes.reduce((acc, v) => acc + v.averageScore, 0) /
              participantVotes.length
          )
        : 0;

    const specialJuryAverage =
      juryVotes.length > 0
        ? round2(
            juryVotes.reduce((acc, v) => acc + v.averageScore, 0) / juryVotes.length
          )
        : 0;

    const aiJudgeScore = team.aiEvaluation ? round2(team.aiEvaluation.averageScore) : 0;

    const rawComposite =
      weights.participants * participantAverage +
      weights.aiJudge * aiJudgeScore +
      weights.specialJury * specialJuryAverage;

    const finalCompositeScore = round2(rawComposite);

    return {
      team,
      participantAverage,
      participantVoteCount: participantVotes.length,
      aiJudgeScore,
      specialJuryAverage,
      specialJuryVoteCount: juryVotes.length,
      finalCompositeScore,
      rank: 0,
    };
  });

  // Sort descending with tie-breaking:
  // 1. finalCompositeScore
  // 2. specialJuryAverage (Tie-Breaker 1)
  // 3. aiJudgeScore (Tie-Breaker 2)
  // 4. participantVoteCount (Tie-Breaker 3)
  entries.sort((a, b) => {
    if (b.finalCompositeScore !== a.finalCompositeScore) {
      return b.finalCompositeScore - a.finalCompositeScore;
    }
    if (b.specialJuryAverage !== a.specialJuryAverage) {
      return b.specialJuryAverage - a.specialJuryAverage;
    }
    if (b.aiJudgeScore !== a.aiJudgeScore) {
      return b.aiJudgeScore - a.aiJudgeScore;
    }
    return b.participantVoteCount - a.participantVoteCount;
  });

  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}
