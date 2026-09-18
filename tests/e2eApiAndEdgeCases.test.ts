import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'http';
import app from '../server/index.js';
import { storage } from '../server/storage.js';

let server: http.Server;
let baseUrl: string;

async function apiReq(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

describe('Genesis x Skelar Hackathon — Comprehensive E2E API & Edge-Case Test Suite', () => {
  beforeAll(async () => {
    storage.resetToSeed();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    storage.resetToSeed();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. Auth Edge-Cases: Rejects empty email, normalizes whitespace/case, and assigns roles accurately', async () => {
    // Empty email -> 400
    const emptyRes = await apiReq('/api/auth/google', {
      method: 'POST',
      body: { email: '' },
    });
    expect(emptyRes.status).toBe(400);

    // Uppercase + whitespace Admin email -> normalized, role ADMIN, Spectator team
    const adminRes = await apiReq('/api/auth/google', {
      method: 'POST',
      body: { email: '  ADMIN@GENESIS.TECH  ', name: ' Admin User ' },
    });
    expect(adminRes.status).toBe(200);
    expect(adminRes.data.user.email).toBe('admin@genesis.tech');
    expect(adminRes.data.user.role).toBe('ADMIN');
    expect(adminRes.data.user.teamId).toBe('SPECTATOR');
    expect(adminRes.data.user.teamLocked).toBe(true);

    // Pre-listed team member -> auto-locked to team-neuralpulse
    const memberRes = await apiReq('/api/auth/google', {
      method: 'POST',
      body: { email: 'dmytro.k@skelar.tech' },
    });
    expect(memberRes.status).toBe(200);
    expect(memberRes.data.user.role).toBe('PARTICIPANT');
    expect(memberRes.data.user.teamId).toBe('team-neuralpulse');
    expect(memberRes.data.user.teamLocked).toBe(true);

    // Brand new participant -> unassigned & unlocked
    const freshRes = await apiReq('/api/auth/google', {
      method: 'POST',
      body: { email: 'new.hacker@skelar.tech', name: 'New Hacker' },
    });
    expect(freshRes.status).toBe(200);
    expect(freshRes.data.user.role).toBe('PARTICIPANT');
    expect(freshRes.data.user.teamId).toBeNull();
    expect(freshRes.data.user.teamLocked).toBe(false);
  });

  it('2. Team Selection & Lock Edge-Cases: Blocks non-existent teams, enforces permanent lock, and supports Admin unlock', async () => {
    // Non-existent team -> 404
    const badTeam = await apiReq('/api/user/select-team', {
      method: 'POST',
      body: { email: 'new.hacker@skelar.tech', teamId: 'team-does-not-exist' },
    });
    expect(badTeam.status).toBe(404);

    // Valid team selection -> locks user to team-finguard
    const lockRes = await apiReq('/api/user/select-team', {
      method: 'POST',
      body: { email: 'new.hacker@skelar.tech', teamId: 'team-finguard' },
    });
    expect(lockRes.status).toBe(200);
    expect(lockRes.data.user.teamId).toBe('team-finguard');
    expect(lockRes.data.user.teamLocked).toBe(true);

    // Attempt to switch team after lock -> 403 Forbidden
    const switchAttempt = await apiReq('/api/user/select-team', {
      method: 'POST',
      body: { email: 'new.hacker@skelar.tech', teamId: 'team-vibeops' },
    });
    expect(switchAttempt.status).toBe(403);
    expect(switchAttempt.data.error).toContain('Permanent Fair-Play Lock');

    // Admin overrides/unlocks user -> user can now switch
    const unlockRes = await apiReq('/api/admin/users/override', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@genesis.tech' },
      body: { targetEmail: 'new.hacker@skelar.tech', unlockTeam: true, newTeamId: null },
    });
    expect(unlockRes.status).toBe(200);
    expect(unlockRes.data.user.teamLocked).toBe(false);

    // Re-select team-vibeops after Admin unlock -> 200 OK
    const relockRes = await apiReq('/api/user/select-team', {
      method: 'POST',
      body: { email: 'new.hacker@skelar.tech', teamId: 'team-vibeops' },
    });
    expect(relockRes.status).toBe(200);
    expect(relockRes.data.user.teamId).toBe('team-vibeops');
  });

  it('3. Voting & Rubric Validation Edge-Cases: Blocks un-onboarded voters, self-votes, float/out-of-range scores, and closed voting', async () => {
    // Create un-onboarded user
    await apiReq('/api/auth/google', {
      method: 'POST',
      body: { email: 'unassigned.voter@skelar.tech' },
    });

    // Un-onboarded user tries to vote -> 403 Forbidden
    const unonboardedVote = await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'unassigned.voter@skelar.tech',
        teamId: 'team-neuralpulse',
        scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
      },
    });
    expect(unonboardedVote.status).toBe(403);
    expect(unonboardedVote.data.error).toContain('Mandatory Onboarding');

    // Self-vote attempt (new.hacker@skelar.tech is locked to team-vibeops) -> 403 Forbidden
    const selfVote = await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'new.hacker@skelar.tech',
        teamId: 'team-vibeops',
        scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
      },
    });
    expect(selfVote.status).toBe(403);
    expect(selfVote.data.error).toContain('Fair Play Rule');

    // Non-integer float score (3.5) -> 400 Bad Request
    const floatVote = await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'new.hacker@skelar.tech',
        teamId: 'team-neuralpulse',
        scores: { innovation: 3.5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
      },
    });
    expect(floatVote.status).toBe(400);

    // Out-of-bounds score (0 or 6) -> 400 Bad Request
    const outOfBoundsVote = await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'new.hacker@skelar.tech',
        teamId: 'team-neuralpulse',
        scores: { innovation: 6, technicalExecution: 0, businessImpact: 5, pitchQuality: 5 },
      },
    });
    expect(outOfBoundsVote.status).toBe(400);

    // Valid vote on another team -> 200 OK
    const validVote = await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'new.hacker@skelar.tech',
        teamId: 'team-neuralpulse',
        scores: { innovation: 5, technicalExecution: 4, businessImpact: 5, pitchQuality: 4 },
        comment: 'Great autonomous ad pipeline!',
      },
    });
    expect(validVote.status).toBe(200);
    expect(validVote.data.vote.averageScore).toBe(4.5);

    // Updating existing vote overwrites previous score without duplicating
    const updatedVote = await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'new.hacker@skelar.tech',
        teamId: 'team-neuralpulse',
        scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
        comment: 'Upgraded to full 5 stars!',
      },
    });
    expect(updatedVote.status).toBe(200);
    expect(updatedVote.data.vote.averageScore).toBe(5.0);

    const allVotesForUser = storage
      .getVotes()
      .filter((v) => v.voterEmail === 'new.hacker@skelar.tech' && v.teamId === 'team-neuralpulse');
    expect(allVotesForUser.length).toBe(1);

    // Admin closes voting -> subsequent votes blocked with 403
    await apiReq('/api/admin/ceremony-reveal', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@genesis.tech' },
      body: { votingOpen: false },
    });

    const closedVote = await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'new.hacker@skelar.tech',
        teamId: 'team-finguard',
        scores: { innovation: 4, technicalExecution: 4, businessImpact: 4, pitchQuality: 4 },
      },
    });
    expect(closedVote.status).toBe(403);
    expect(closedVote.data.error).toContain('Voting is currently closed');

    // Re-open voting
    await apiReq('/api/admin/ceremony-reveal', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@genesis.tech' },
      body: { votingOpen: true },
    });
  });

  it('4. Inline Team Edit RBAC & Input Validation Edge-Cases', async () => {
    // Participant editing own team (new.hacker@skelar.tech -> team-vibeops) -> 200 OK
    const ownEdit = await apiReq('/api/teams/update-project', {
      method: 'POST',
      body: {
        actorEmail: 'new.hacker@skelar.tech',
        teamId: 'team-vibeops',
        name: 'Team VibeOps Updated',
        projectTitle: 'DevPulse v2',
        description: 'Updated description inline',
      },
    });
    expect(ownEdit.status).toBe(200);
    expect(ownEdit.data.team.name).toBe('Team VibeOps Updated');

    // Empty name or projectTitle rejected -> 400 Bad Request
    const emptyNameEdit = await apiReq('/api/teams/update-project', {
      method: 'POST',
      body: {
        actorEmail: 'new.hacker@skelar.tech',
        teamId: 'team-vibeops',
        name: '   ',
        projectTitle: 'DevPulse v2',
      },
    });
    expect(emptyNameEdit.status).toBe(400);

    // Cross-team edit by participant -> 403 Forbidden
    const crossEdit = await apiReq('/api/teams/update-project', {
      method: 'POST',
      body: {
        actorEmail: 'new.hacker@skelar.tech',
        teamId: 'team-neuralpulse',
        name: 'Hacked Name',
      },
    });
    expect(crossEdit.status).toBe(403);

    // Admin can edit ANY team -> 200 OK
    const adminEdit = await apiReq('/api/teams/update-project', {
      method: 'POST',
      body: {
        actorEmail: 'admin@genesis.tech',
        teamId: 'team-vibeops',
        name: 'Team VibeOps',
      },
    });
    expect(adminEdit.status).toBe(200);
    expect(adminEdit.data.team.name).toBe('Team VibeOps');
  });

  it('5. Admin Security & Team Deletion Cascade Edge-Cases', async () => {
    // Unauthenticated call to Admin endpoint (no header / no actorEmail) -> 401 Unauthorized
    const unauthAdmin = await apiReq('/api/admin/teams', {
      method: 'POST',
      body: { name: 'Ghost Team', projectTitle: 'Ghost' },
    });
    expect(unauthAdmin.status).toBe(401);

    // Non-Admin calling Admin endpoint -> 403 Forbidden
    const nonAdminDelete = await apiReq('/api/admin/teams/team-vibeops', {
      method: 'DELETE',
      headers: { 'x-user-email': 'new.hacker@skelar.tech' },
    });
    expect(nonAdminDelete.status).toBe(403);

    // Admin creates a new team -> 200 OK
    const createRes = await apiReq('/api/admin/teams', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@genesis.tech' },
      body: {
        id: 'team-ephemeral-e2e',
        name: 'Team Ephemeral',
        projectTitle: 'Ephemeral AI Project',
        category: 'AI Track',
      },
    });
    expect(createRes.status).toBe(200);
    expect(createRes.data.team.id).toBe('team-ephemeral-e2e');

    // Affiliate a user with team-ephemeral-e2e and cast a vote on it
    await apiReq('/api/auth/google', {
      method: 'POST',
      body: { email: 'ephemeral.member@skelar.tech' },
    });
    await apiReq('/api/user/select-team', {
      method: 'POST',
      body: { email: 'ephemeral.member@skelar.tech', teamId: 'team-ephemeral-e2e' },
    });
    await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'new.hacker@skelar.tech',
        teamId: 'team-ephemeral-e2e',
        scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
      },
    });

    // Admin deletes team-ephemeral-e2e -> 200 OK, cascades vote deletion and unlocks member
    const delRes = await apiReq('/api/admin/teams/team-ephemeral-e2e', {
      method: 'DELETE',
      headers: { 'x-user-email': 'admin@genesis.tech' },
    });
    expect(delRes.status).toBe(200);
    expect(delRes.data.status).toBe('deleted');

    // Deleting non-existent team -> 404 Not Found
    const delAgain = await apiReq('/api/admin/teams/team-ephemeral-e2e', {
      method: 'DELETE',
      headers: { 'x-user-email': 'admin@genesis.tech' },
    });
    expect(delAgain.status).toBe(404);

    // Verify member was unlocked and vote was purged
    const memberAfter = storage.getUser('ephemeral.member@skelar.tech');
    expect(memberAfter?.teamId).toBeNull();
    expect(memberAfter?.teamLocked).toBe(false);
    expect(storage.getVotes().some((v) => v.teamId === 'team-ephemeral-e2e')).toBe(false);
  });

  it('6. Ceremony Suspense vs Reveal Mode Masking (GET /api/state)', async () => {
    // Ensure ceremonyRevealed is false
    await apiReq('/api/admin/ceremony-reveal', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@genesis.tech' },
      body: { ceremonyRevealed: false },
    });

    // Participant fetches /api/state -> leaderboard scores masked to 0, adminData is null
    const participantState = await apiReq('/api/state', {
      headers: { 'x-user-email': 'dmytro.k@skelar.tech' },
    });
    expect(participantState.status).toBe(200);
    expect(participantState.data.ceremonyRevealed).toBe(false);
    expect(participantState.data.adminData).toBeNull();
    expect(participantState.data.leaderboard[0].finalCompositeScore).toBe(0);

    // Admin fetches /api/state -> sees real unmasked scores even while ceremonyRevealed is false
    const adminState = await apiReq('/api/state', {
      headers: { 'x-user-email': 'admin@genesis.tech' },
    });
    expect(adminState.status).toBe(200);
    expect(adminState.data.adminData).not.toBeNull();
    expect(adminState.data.leaderboard[0].finalCompositeScore).toBeGreaterThan(0);

    // Admin toggles ceremonyRevealed = true -> Participant now sees full unmasked podium scores
    await apiReq('/api/admin/ceremony-reveal', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@genesis.tech' },
      body: { ceremonyRevealed: true },
    });

    const revealedState = await apiReq('/api/state', {
      headers: { 'x-user-email': 'dmytro.k@skelar.tech' },
    });
    expect(revealedState.status).toBe(200);
    expect(revealedState.data.ceremonyRevealed).toBe(true);
    expect(revealedState.data.leaderboard[0].finalCompositeScore).toBeGreaterThan(0);
    expect(revealedState.data.leaderboard[0].rank).toBe(1);
  });

  it('7. Admin User Deletion & Vote Cleanup (DELETE /api/admin/users/:email)', async () => {
    // Non-admin attempting to delete a user -> 403 Forbidden
    const unauthDel = await apiReq('/api/admin/users/ephemeral.member@skelar.tech', {
      method: 'DELETE',
      headers: { 'x-user-email': 'dmytro.k@skelar.tech' },
    });
    expect(unauthDel.status).toBe(403);

    // Admin attempting to delete their own active admin account -> 400 Bad Request
    const selfDel = await apiReq('/api/admin/users/admin@genesis.tech', {
      method: 'DELETE',
      headers: { 'x-user-email': 'admin@genesis.tech' },
    });
    expect(selfDel.status).toBe(400);

    // Re-assign team affiliation to ephemeral.member@skelar.tech so they can cast a vote
    await apiReq('/api/user/select-team', {
      method: 'POST',
      body: {
        email: 'ephemeral.member@skelar.tech',
        teamId: 'SPECTATOR',
      },
    });

    // Cast a vote from ephemeral.member@skelar.tech first
    await apiReq('/api/votes', {
      method: 'POST',
      body: {
        voterEmail: 'ephemeral.member@skelar.tech',
        teamId: 'team-neuralpulse',
        scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
      },
    });
    expect(storage.getVotes().some((v) => v.voterEmail === 'ephemeral.member@skelar.tech')).toBe(true);

    // Admin deletes ephemeral.member@skelar.tech -> 200 OK
    const adminDel = await apiReq('/api/admin/users/ephemeral.member@skelar.tech', {
      method: 'DELETE',
      headers: { 'x-user-email': 'admin@genesis.tech' },
    });
    expect(adminDel.status).toBe(200);
    expect(adminDel.data.status).toBe('deleted');

    // Verify user is removed from storage and their votes are purged
    expect(storage.getUser('ephemeral.member@skelar.tech')).toBeUndefined();
    expect(storage.getVotes().some((v) => v.voterEmail === 'ephemeral.member@skelar.tech')).toBe(false);
  });

  it('8. OAuth Public Branding Collaterals (GET /privacy & GET /terms)', async () => {
    const privRes = await fetch(`${baseUrl}/privacy`);
    expect(privRes.status).toBe(200);
    const privHtml = await privRes.text();
    expect(privHtml).toContain('Privacy Policy');
    expect(privHtml).toContain('Genesis × Skelar Hackathon 2026');

    const termsRes = await fetch(`${baseUrl}/terms`);
    expect(termsRes.status).toBe(200);
    const termsHtml = await termsRes.text();
    expect(termsHtml).toContain('Terms of Service');
    expect(termsHtml).toContain('Genesis × Skelar Hackathon 2026');
  });
});
