import { describe, expect, it } from 'vitest';
import {
  calculateLeaderboard,
  canUserEditTeamCollaterals,
  canUserVoteForTeam,
  computeRubricAverage,
  sanitizeCollateralUrl,
  validateRubricScores,
} from '../server/scoring.js';
import { analyzeTranscriptDeterministically } from '../server/geminiJudge.js';
import { SAMPLE_MASTER_TRANSCRIPT, SEED_TEAMS } from '../server/seedData.js';
import { Team, User, Vote } from '../server/types.js';

describe('Genesis x Skelar Hackathon — 1-5 Rubric & Voting TDD Suite', () => {
  it('1. Computes 1-5 rubric averages accurately to 2 decimal places', () => {
    const avg1 = computeRubricAverage({
      innovation: 5,
      technicalExecution: 5,
      businessImpact: 4,
      pitchQuality: 5,
    });
    expect(avg1).toBe(4.75);

    const avg2 = computeRubricAverage({
      innovation: 4,
      technicalExecution: 4,
      businessImpact: 3,
      pitchQuality: 4,
    });
    expect(avg2).toBe(3.75);

    expect(
      validateRubricScores({
        innovation: 5,
        technicalExecution: 4,
        businessImpact: 3,
        pitchQuality: 5,
      })
    ).toBe(true);

    expect(
      validateRubricScores({
        innovation: 6, // Invalid > 5
        technicalExecution: 4,
        businessImpact: 3,
        pitchQuality: 5,
      })
    ).toBe(false);
  });

  it('2. Enforces Mandatory Team Onboarding and blocks Self-Voting', () => {
    const teamAlpha: Team = {
      id: 'team-alpha',
      name: 'Team Alpha',
      projectTitle: 'Alpha AI',
      tagline: 'Test',
      description: 'Test',
      category: 'AI',
      memberEmails: ['founder@alpha.tech'],
    };

    const unboardedUser: User = {
      id: 'u1',
      email: 'newbie@skelar.tech',
      name: 'Newbie',
      role: 'PARTICIPANT',
      teamId: null,
      teamLocked: false,
      createdAt: '',
      lastActiveAt: '',
    };

    // Must block user who hasn't selected a team yet
    const check1 = canUserVoteForTeam(unboardedUser, teamAlpha);
    expect(check1.allowed).toBe(false);
    expect(check1.reason).toContain('Mandatory Onboarding');

    // Must block user who selected Team Alpha
    const alphaMember: User = {
      ...unboardedUser,
      email: 'member@skelar.tech',
      teamId: 'team-alpha',
      teamLocked: true,
    };
    const check2 = canUserVoteForTeam(alphaMember, teamAlpha);
    expect(check2.allowed).toBe(false);
    expect(check2.reason).toContain('Fair Play Rule');

    // Must block user whose email is listed in team.memberEmails even if teamId differs
    const listedFounder: User = {
      ...unboardedUser,
      email: 'founder@alpha.tech',
      teamId: 'SPECTATOR',
      teamLocked: true,
    };
    const check3 = canUserVoteForTeam(listedFounder, teamAlpha);
    expect(check3.allowed).toBe(false);

    // Must allow Spectator to vote on Team Alpha
    const spectator: User = {
      ...unboardedUser,
      email: 'spectator@skelar.tech',
      teamId: 'SPECTATOR',
      teamLocked: true,
    };
    const check4 = canUserVoteForTeam(spectator, teamAlpha);
    expect(check4.allowed).toBe(true);
  });

  it('3. Calculates Equal 3-Way Split (33.3% x 3) on 1.00-5.00 scale and resolves ties using Special Jury', () => {
    const teamA: Team = {
      id: 'team-a',
      name: 'Team A',
      projectTitle: 'Proj A',
      tagline: '',
      description: '',
      category: '',
      memberEmails: [],
      aiEvaluation: {
        teamId: 'team-a',
        teamName: 'Team A',
        projectTitle: 'Proj A',
        detectedSpeakers: [],
        scores: { innovation: 4, technicalExecution: 4, businessImpact: 4, pitchQuality: 4 },
        averageScore: 4.0,
        executiveSummary: '',
        notableQuote: '',
        strengths: [],
        weaknesses: [],
        modelUsed: 'gemini-3.8-flash',
        timestamp: '',
      },
    };

    const teamB: Team = {
      id: 'team-b',
      name: 'Team B',
      projectTitle: 'Proj B',
      tagline: '',
      description: '',
      category: '',
      memberEmails: [],
      aiEvaluation: {
        teamId: 'team-b',
        teamName: 'Team B',
        projectTitle: 'Proj B',
        detectedSpeakers: [],
        scores: { innovation: 4, technicalExecution: 4, businessImpact: 4, pitchQuality: 4 },
        averageScore: 4.0,
        executiveSummary: '',
        notableQuote: '',
        strengths: [],
        weaknesses: [],
        modelUsed: 'gemini-3.8-flash',
        timestamp: '',
      },
    };

    // Team A: Participant = 5.0, AI = 4.0, Jury = 3.0 -> Composite = 4.00
    // Team B: Participant = 3.0, AI = 4.0, Jury = 5.0 -> Composite = 4.00 (Higher Jury!)
    const votes: Vote[] = [
      {
        id: 'v1',
        voterEmail: 'p1@test.com',
        voterName: 'P1',
        voterRole: 'PARTICIPANT',
        teamId: 'team-a',
        scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
        averageScore: 5.0,
        timestamp: '',
      },
      {
        id: 'v2',
        voterEmail: 'j1@test.com',
        voterName: 'J1',
        voterRole: 'SPECIAL_JURY',
        teamId: 'team-a',
        scores: { innovation: 3, technicalExecution: 3, businessImpact: 3, pitchQuality: 3 },
        averageScore: 3.0,
        timestamp: '',
      },
      {
        id: 'v3',
        voterEmail: 'p1@test.com',
        voterName: 'P1',
        voterRole: 'PARTICIPANT',
        teamId: 'team-b',
        scores: { innovation: 3, technicalExecution: 3, businessImpact: 3, pitchQuality: 3 },
        averageScore: 3.0,
        timestamp: '',
      },
      {
        id: 'v4',
        voterEmail: 'j1@test.com',
        voterName: 'J1',
        voterRole: 'SPECIAL_JURY',
        teamId: 'team-b',
        scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
        averageScore: 5.0,
        timestamp: '',
      },
    ];

    const leaderboard = calculateLeaderboard([teamA, teamB], votes);
    expect(leaderboard[0].team.id).toBe('team-b'); // Tie broken in favor of Team B due to higher Special Jury score (5.0 vs 3.0)
    expect(leaderboard[0].finalCompositeScore).toBe(4.0);
    expect(leaderboard[1].finalCompositeScore).toBe(4.0);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(2);
  });

  it('4. Parses Master Finale Transcript and evaluates all teams on 1-5 scale', () => {
    const result = analyzeTranscriptDeterministically(
      SAMPLE_MASTER_TRANSCRIPT,
      SEED_TEAMS,
      'gemini-3.8-flash'
    );

    expect(result.evaluations.length).toBe(4);
    expect(result.missingTeamIds.length).toBe(0);

    for (const ev of result.evaluations) {
      expect(ev.averageScore).toBeGreaterThanOrEqual(1.0);
      expect(ev.averageScore).toBeLessThanOrEqual(5.0);
      expect(ev.notableQuote.length).toBeGreaterThan(10);
    }
  });

  it('5. Enforces strict RBAC for Team Collaterals (Admin -> All Teams, Participant -> Own Team Only) & URL Sanitization', () => {
    const teamAlpha: Team = {
      id: 'team-alpha',
      name: 'Team Alpha',
      projectTitle: 'Alpha AI',
      tagline: 'Tag',
      description: 'Desc',
      category: 'AI',
      memberEmails: ['dmytro@skelar.tech'],
    };

    const teamBeta: Team = {
      id: 'team-beta',
      name: 'Team Beta',
      projectTitle: 'Beta AI',
      tagline: 'Tag',
      description: 'Desc',
      category: 'AI',
      memberEmails: ['olena@skelar.tech'],
    };

    const participantAlpha: User = {
      id: 'u-alpha',
      email: 'dmytro@skelar.tech',
      name: 'Dmytro',
      role: 'PARTICIPANT',
      teamId: 'team-alpha',
      teamLocked: true,
      createdAt: '',
      lastActiveAt: '',
    };

    const adminUser: User = {
      id: 'u-admin',
      email: 'admin@genesis.tech',
      name: 'Claudiu Admin',
      role: 'ADMIN',
      teamId: 'SPECTATOR',
      teamLocked: true,
      createdAt: '',
      lastActiveAt: '',
    };

    // Participant CAN edit their own team
    expect(canUserEditTeamCollaterals(participantAlpha, teamAlpha).allowed).toBe(true);

    // Participant CANNOT edit another team's collaterals (Cross-team blocked)
    const crossCheck = canUserEditTeamCollaterals(participantAlpha, teamBeta);
    expect(crossCheck.allowed).toBe(false);
    expect(crossCheck.reason).toContain('Security RBAC Restriction');

    // Admin CAN edit ANY team's collaterals (Alpha & Beta)
    expect(canUserEditTeamCollaterals(adminUser, teamAlpha).allowed).toBe(true);
    expect(canUserEditTeamCollaterals(adminUser, teamBeta).allowed).toBe(true);

    // URL Sanitizer blocks XSS payloads while allowing https and base64 PDF
    expect(sanitizeCollateralUrl('https://github.com/genesis/repo')).toBe(
      'https://github.com/genesis/repo'
    );
    expect(sanitizeCollateralUrl('data:application/pdf;base64,JVBERi0xLjQK')).toBe(
      'data:application/pdf;base64,JVBERi0xLjQK'
    );
    expect(() => sanitizeCollateralUrl('javascript:alert(document.cookie)')).toThrow(
      'Security Protocol Violation'
    );
  });

  it('6. Admin team deletion cleanly removes team, purges associated votes, and resets affiliated user locks', async () => {
    const { storage } = await import('../server/storage.js');
    storage.resetToSeed();

    // Create a temporary team
    const tempTeam: Team = {
      id: 'team-temp-delete',
      name: 'Temp Delete Team',
      projectTitle: 'Ephemeral AI',
      tagline: 'Test',
      description: 'Test team to be deleted by Admin',
      category: 'AI',
      memberEmails: ['tempuser@skelar.tech'],
    };
    storage.upsertTeam(tempTeam);

    // Register a user affiliated with this team
    storage.upsertUser({
      id: 'u-temp-1',
      email: 'tempuser@skelar.tech',
      name: 'Temp User',
      role: 'PARTICIPANT',
      teamId: 'team-temp-delete',
      teamLocked: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });

    // Cast a vote for this team from another user
    storage.upsertVote({
      id: 'vote-temp-1',
      voterEmail: 'voter@skelar.tech',
      voterName: 'Voter',
      voterRole: 'PARTICIPANT',
      teamId: 'team-temp-delete',
      scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
      averageScore: 5.0,
      timestamp: new Date().toISOString(),
    });

    // Verify setup before deletion
    const beforeTeams = storage.getTeams();
    expect(beforeTeams.some((t) => t.id === 'team-temp-delete')).toBe(true);
    const beforeVotes = storage.getVotes();
    expect(beforeVotes.some((v) => v.teamId === 'team-temp-delete')).toBe(true);

    // Delete the team
    const deleted = storage.deleteTeam('team-temp-delete');
    expect(deleted).toBe(true);

    // Verify team is gone, votes for that team are purged, and affiliated user is unlocked
    const afterTeams = storage.getTeams();
    expect(afterTeams.some((t) => t.id === 'team-temp-delete')).toBe(false);

    const afterVotes = storage.getVotes();
    expect(afterVotes.some((v) => v.teamId === 'team-temp-delete')).toBe(false);

    const updatedUser = storage.getUser('tempuser@skelar.tech');
    expect(updatedUser?.teamId).toBeNull();
    expect(updatedUser?.teamLocked).toBe(false);

    // Reset back to clean seed state
    storage.resetToSeed();
  });

  it('7. Team-Normalized Weighting gives a 4-member team and a 2-member team identical 1.0x bloc weight and AI Judge generates aiRoast', () => {
    const teamTarget: Team = {
      id: 'team-target',
      name: 'Team Target',
      projectTitle: 'Target AI',
      tagline: '',
      description: '',
      category: '',
      memberEmails: ['t1@x.com'],
    };
    const team4Members: Team = {
      id: 'team-four',
      name: 'Team Four',
      projectTitle: 'Four AI',
      tagline: '',
      description: '',
      category: '',
      memberEmails: ['f1@x.com', 'f2@x.com', 'f3@x.com', 'f4@x.com'],
    };
    const team2Members: Team = {
      id: 'team-two',
      name: 'Team Two',
      projectTitle: 'Two AI',
      tagline: '',
      description: '',
      category: '',
      memberEmails: ['w1@x.com', 'w2@x.com'],
    };

    const votes: Vote[] = [
      // 4 members of Team Four all rate Team Target 2.00
      ...['f1@x.com', 'f2@x.com', 'f3@x.com', 'f4@x.com'].map((email, idx) => ({
        id: `v-four-${idx}`,
        voterEmail: email,
        voterName: email,
        voterRole: 'PARTICIPANT' as const,
        voterTeamId: 'team-four',
        teamId: 'team-target',
        scores: { innovation: 2, technicalExecution: 2, businessImpact: 2, pitchQuality: 2 },
        averageScore: 2.0,
        timestamp: new Date().toISOString(),
      })),
      // 2 members of Team Two both rate Team Target 5.00
      ...['w1@x.com', 'w2@x.com'].map((email, idx) => ({
        id: `v-two-${idx}`,
        voterEmail: email,
        voterName: email,
        voterRole: 'PARTICIPANT' as const,
        voterTeamId: 'team-two',
        teamId: 'team-target',
        scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
        averageScore: 5.0,
        timestamp: new Date().toISOString(),
      })),
    ];

    const lb = calculateLeaderboard([teamTarget, team4Members, team2Members], votes);
    const targetEntry = lb.find((e) => e.team.id === 'team-target')!;

    // Raw un-normalized average would be (2+2+2+2+5+5)/6 = 3.00.
    // Team-normalized average is (Avg(Team Four = 2.00) + Avg(Team Two = 5.00)) / 2 = 3.50!
    expect(targetEntry.participantAverage).toBe(3.5);
    expect(targetEntry.participantVoteCount).toBe(6);

    // Also verify AI Judge roast is populated on transcript analysis
    const analysis = analyzeTranscriptDeterministically(
      'Speaker (Lead): Team Target built Target AI with 50% lift live on Cloud Run.',
      [teamTarget],
      'gemini-3.8-flash'
    );
    expect(analysis.evaluations.length).toBe(1);
    expect(analysis.evaluations[0].aiRoast).toBeTruthy();
  });
});
