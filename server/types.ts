export type UserRole = 'PARTICIPANT' | 'SPECIAL_JURY' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  /**
   * null = Onboarding modal not completed yet
   * 'SPECTATOR' = Spectator / Executive / Non-competing attendee
   * Otherwise = Competing Team ID (e.g. 'team-alpha')
   */
  teamId: string | null;
  teamLocked: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface RubricScores1To5 {
  innovation: number;         // 1 to 5
  technicalExecution: number; // 1 to 5
  businessImpact: number;     // 1 to 5
  pitchQuality: number;       // 1 to 5
}

export interface Vote {
  id: string;
  voterEmail: string;
  voterName: string;
  voterRole: 'PARTICIPANT' | 'SPECIAL_JURY';
  teamId: string;
  scores: RubricScores1To5;
  averageScore: number; // 1.00 to 5.00
  comment?: string;
  timestamp: string;
}

export interface AIEvaluation {
  teamId: string;
  teamName: string;
  projectTitle: string;
  detectedSpeakers: string[];
  scores: RubricScores1To5;
  averageScore: number; // 1.00 to 5.00
  executiveSummary: string;
  notableQuote: string;
  strengths: string[];
  weaknesses: string[];
  missingFromTranscript?: boolean;
  modelUsed: string;
  timestamp: string;
}

export interface Team {
  id: string;
  name: string;
  projectTitle: string;
  tagline: string;
  description: string;
  category: string;
  memberEmails: string[];
  githubUrl?: string;
  slideDeckUrl?: string;
  pitchDeckFileName?: string;
  demoUrl?: string;
  aiEvaluation?: AIEvaluation;
}

export interface TeamLeaderboardEntry {
  team: Team;
  participantAverage: number;
  participantVoteCount: number;
  aiJudgeScore: number;
  specialJuryAverage: number;
  specialJuryVoteCount: number;
  finalCompositeScore: number;
  rank: number;
}

export type TelemetryEventType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'TEAM_SELECTED'
  | 'TEAM_UNLOCKED_BY_ADMIN'
  | 'TEAM_PROJECT_UPDATED'
  | 'TEAM_DELETED'
  | 'SECURITY_UNAUTHORIZED_COLLATERAL_EDIT_BLOCKED'
  | 'VOTE_CAST'
  | 'SELF_VOTE_BLOCKED'
  | 'AI_TRANSCRIPT_ANALYZED'
  | 'CEREMONY_REVEAL_TOGGLED'
  | 'ROLE_UPDATED'
  | 'USER_DELETED';

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: TelemetryEventType;
  actorEmail: string;
  actorName: string;
  targetTeamId?: string;
  details: string;
}

export interface AppConfig {
  ceremonyRevealed: boolean;
  votingOpen: boolean;
  weights: {
    participants: number;
    aiJudge: number;
    specialJury: number;
  };
  juryAllowlist: string[];
  adminAllowlist: string[];
  masterTranscriptText: string;
  lastAiRunTimestamp?: string;
  aiModelName: string;
  googleClientId?: string;
}

export interface DatabaseSchema {
  users: Record<string, User>; // keyed by lowercase email
  teams: Team[];
  votes: Vote[];
  telemetry: TelemetryEvent[];
  config: AppConfig;
}
