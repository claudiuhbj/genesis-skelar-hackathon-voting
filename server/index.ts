import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import { storage } from './storage.js';
import {
  calculateLeaderboard,
  canUserEditTeamCollaterals,
  canUserVoteForTeam,
  computeRubricAverage,
  sanitizeCollateralUrl,
  validateRubricScores,
} from './scoring.js';
import { analyzeMasterTranscriptWithGemini } from './geminiJudge.js';
import { PRIMARY_ADMIN_EMAIL, PRIMARY_ADMIN_NAME } from './seedData.js';
import { RubricScores1To5, Team, User, UserRole, Vote } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function resolveUserRole(email: string): UserRole {
  const lower = String(email || '').trim().toLowerCase();
  const config = storage.getConfig();
  if (config.adminAllowlist.some((e) => e.trim().toLowerCase() === lower)) {
    return 'ADMIN';
  }
  if (config.juryAllowlist.some((e) => e.trim().toLowerCase() === lower)) {
    return 'SPECIAL_JURY';
  }
  return 'PARTICIPANT';
}

function getOrSyncUser(email: string, name?: string, picture?: string): User {
  const lower = String(email || '').trim().toLowerCase();
  let user = storage.getUser(lower);
  const role = resolveUserRole(lower);
  const teams = storage.getTeams();

  if (!user) {
    // Check if email is pre-listed in any team's memberEmails
    const matchedTeam = teams.find((t) =>
      t.memberEmails.some((e) => e.trim().toLowerCase() === lower)
    );
    const defaultTeamId = matchedTeam
      ? matchedTeam.id
      : role === 'ADMIN' || role === 'SPECIAL_JURY'
        ? 'SPECTATOR'
        : null;
    user = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: lower,
      name: name?.trim() || lower.split('@')[0],
      picture,
      role,
      teamId: defaultTeamId,
      teamLocked: defaultTeamId !== null,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    storage.upsertUser(user);
    storage.logTelemetry(
      'USER_LOGIN',
      user.email,
      user.name,
      `First Google Sign-In recorded (${role})${matchedTeam ? ` — Auto-matched to ${matchedTeam.name}` : defaultTeamId === 'SPECTATOR' ? ' — Auto-assigned Spectator/Judge status' : ' — Awaiting Team Selection'}`,
      matchedTeam?.id
    );
  } else {
    user.role = role;
    if ((role === 'ADMIN' || role === 'SPECIAL_JURY') && user.teamId === null) {
      user.teamId = 'SPECTATOR';
      user.teamLocked = true;
    }
    if (name && name.trim()) user.name = name.trim();
    if (picture) user.picture = picture;
    user.lastActiveAt = new Date().toISOString();
    storage.upsertUser(user);
  }

  return user;
}

function extractActorEmail(req: express.Request): string {
  const headerEmail = req.headers['x-user-email'];
  const bodyEmail = req.body?.actorEmail || req.body?.adminEmail || req.body?.email;
  const raw =
    (typeof headerEmail === 'string' && headerEmail.trim()) ||
    (typeof bodyEmail === 'string' && bodyEmail.trim()) ||
    '';
  return raw.trim().toLowerCase();
}

function requireAdmin(req: express.Request, res: express.Response): User | null {
  const email = extractActorEmail(req);
  if (!email) {
    res.status(401).json({
      error: 'Authentication required: Missing x-user-email header or actorEmail.',
    });
    return null;
  }
  const user = getOrSyncUser(email);
  if (user.role !== 'ADMIN') {
    storage.logTelemetry(
      'SECURITY_UNAUTHORIZED_COLLATERAL_EDIT_BLOCKED',
      user.email,
      user.name,
      `Blocked unauthorized non-Admin access to ${req.method} ${req.path}`
    );
    res.status(403).json({
      error: 'Security RBAC Restriction (403 Forbidden): Admin privileges required.',
    });
    return null;
  }
  return user;
}

// GET /api/auth/config - Public auth configuration for login screen & OAuth Client ID
app.get('/api/auth/config', (req, res) => {
  const config = storage.getConfig();
  res.json({
    googleClientId: config.googleClientId || process.env.GOOGLE_CLIENT_ID || '',
    primaryAdminEmail: PRIMARY_ADMIN_EMAIL,
    primaryAdminName: PRIMARY_ADMIN_NAME,
  });
});

// GET /api/state - Returns live portal state tailored to user role & Ceremony Reveal Mode
app.get('/api/state', (req, res) => {
  const userEmailHeader = extractActorEmail(req) || PRIMARY_ADMIN_EMAIL;
  const currentUser = getOrSyncUser(userEmailHeader);
  const config = storage.getConfig();
  const teams = storage.getTeams();
  const votes = storage.getVotes();

  const allUsers = storage.getAllUsers();
  const fullLeaderboard = calculateLeaderboard(teams, votes, config.weights, allUsers);
  const isAdmin = currentUser.role === 'ADMIN';
  const showFullScores = isAdmin || config.ceremonyRevealed;

  const clientLeaderboard = showFullScores
    ? fullLeaderboard
    : fullLeaderboard.map((entry) => ({
        ...entry,
        participantAverage: 0,
        aiJudgeScore: 0,
        specialJuryAverage: 0,
        finalCompositeScore: 0,
        rank: 0,
      }));

  // Votes cast by this specific user
  const myVotes = votes.filter(
    (v) => v.voterEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  res.json({
    currentUser,
    teams,
    myVotes,
    leaderboard: clientLeaderboard,
    ceremonyRevealed: config.ceremonyRevealed,
    votingOpen: config.votingOpen,
    aiModelName: config.aiModelName,
    lastAiRunTimestamp: config.lastAiRunTimestamp,
    googleClientId: config.googleClientId || process.env.GOOGLE_CLIENT_ID || '',
    primaryAdminEmail: PRIMARY_ADMIN_EMAIL,
    totalVotesCast: votes.length,
    totalRegisteredUsers: storage.getAllUsers().length,
    // Admin-exclusive telemetry and full visibility payload
    adminData: isAdmin
      ? {
          allUsers: storage.getAllUsers(),
          allVotes: votes,
          fullLeaderboard,
          telemetry: storage.getTelemetry(),
          config,
        }
      : null,
  });
});

// POST /api/auth/google - Verify Google OAuth login or switch active persona
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, email, name, picture } = req.body;
    let verifiedEmail = email;
    let verifiedName = name;
    let verifiedPic = picture;

    if (credential) {
      const activeClientId = storage.getConfig().googleClientId || process.env.GOOGLE_CLIENT_ID;
      try {
        const oauthClient = new OAuth2Client(activeClientId || undefined);
        const ticket = await oauthClient.verifyIdToken({
          idToken: credential,
          audience: activeClientId || undefined,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          verifiedEmail = payload.email;
          verifiedName = payload.name || verifiedEmail;
          verifiedPic = payload.picture;
        }
      } catch (verifyErr) {
        // Fallback: if JWT is a valid base64url Google token in dev/testing
        const parts = String(credential).split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          if (decoded && decoded.email) {
            verifiedEmail = decoded.email;
            verifiedName = decoded.name || verifiedEmail;
            verifiedPic = decoded.picture;
          }
        }
        if (!verifiedEmail) throw verifyErr;
      }
    }

    if (!verifiedEmail) {
      return res.status(400).json({ error: 'Email is required for authentication.' });
    }

    const user = getOrSyncUser(verifiedEmail, verifiedName, verifiedPic);
    storage.logTelemetry(
      'USER_LOGIN',
      user.email,
      user.name,
      `User signed in with Google (${user.role})`
    );

    res.json({ user });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Google Authentication failed' });
  }
});

// POST /api/auth/logout - Clear active session and record telemetry
app.post('/api/auth/logout', (req, res) => {
  const { email } = req.body;
  if (email) {
    const user = storage.getUser(email);
    if (user) {
      storage.logTelemetry(
        'USER_LOGOUT',
        user.email,
        user.name,
        `User signed out of Hackathon Portal`
      );
    }
  }
  res.json({ status: 'logged_out' });
});

// POST /api/teams/update-project - Participant or Admin updates team GitHub Repo, Pitch Deck, & Project details
app.post('/api/teams/update-project', (req, res) => {
  const {
    actorEmail,
    teamId,
    name,
    projectTitle,
    tagline,
    description,
    githubUrl,
    slideDeckUrl,
    pitchDeckFileName,
    demoUrl,
  } = req.body;

  if (!actorEmail || !teamId) {
    return res.status(400).json({ error: 'actorEmail and teamId are required.' });
  }

  const user = getOrSyncUser(actorEmail);
  const team = storage.getTeamById(teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  // Enforce strict Role-Based Access Control (Admin -> ALL teams, Participant -> OWN assigned team only)
  const accessCheck = canUserEditTeamCollaterals(user, team);
  if (!accessCheck.allowed) {
    storage.logTelemetry(
      'SECURITY_UNAUTHORIZED_COLLATERAL_EDIT_BLOCKED',
      user.email,
      user.name,
      `Blocked unauthorized cross-team edit attempt on ${team.name}: ${accessCheck.reason}`,
      team.id
    );
    return res.status(403).json({
      error: accessCheck.reason,
    });
  }

  if (
    (name !== undefined && String(name).trim() === '') ||
    (projectTitle !== undefined && String(projectTitle).trim() === '')
  ) {
    return res.status(400).json({ error: 'Team name and project title cannot be empty.' });
  }

  try {
    if (name !== undefined && String(name).trim() !== '') team.name = String(name).trim();
    if (projectTitle !== undefined && String(projectTitle).trim() !== '')
      team.projectTitle = String(projectTitle).trim();
    if (tagline !== undefined) team.tagline = String(tagline).trim();
    if (description !== undefined) team.description = String(description).trim();
    if (githubUrl !== undefined) team.githubUrl = sanitizeCollateralUrl(githubUrl);
    if (slideDeckUrl !== undefined) team.slideDeckUrl = sanitizeCollateralUrl(slideDeckUrl);
    if (pitchDeckFileName !== undefined) team.pitchDeckFileName = String(pitchDeckFileName).trim();
    if (demoUrl !== undefined) team.demoUrl = sanitizeCollateralUrl(demoUrl);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Invalid collateral URL format' });
  }

  storage.upsertTeam(team);
  storage.logTelemetry(
    'TEAM_PROJECT_UPDATED',
    user.email,
    user.name,
    `${user.role === 'ADMIN' ? '[ADMIN OVERRIDE] ' : ''}Updated collaterals for ${team.name} (GitHub: ${team.githubUrl ? 'Yes' : 'No'}, Pitch Deck: ${team.slideDeckUrl ? 'Yes' : 'No'}, Demo: ${team.demoUrl ? 'Yes' : 'No'})`,
    team.id
  );

  res.json({ team });
});

// POST /api/user/select-team - Mandatory Post-Login Team Selection with Permanent Lock
app.post('/api/user/select-team', (req, res) => {
  const { email, teamId } = req.body;
  if (!email || !teamId) {
    return res.status(400).json({ error: 'Email and teamId are required.' });
  }

  const user = getOrSyncUser(email);

  if (user.teamLocked && user.teamId && user.teamId !== teamId && user.role !== 'ADMIN') {
    return res.status(403).json({
      error:
        'Permanent Fair-Play Lock: Your team affiliation is already locked. Please contact a Hackathon Admin if you selected the wrong team by mistake.',
    });
  }

  if (teamId !== 'SPECTATOR') {
    const team = storage.getTeamById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Selected team does not exist.' });
    }
    // Add user email to team's memberEmails if not already present
    if (!team.memberEmails.some((e) => e.toLowerCase() === user.email.toLowerCase())) {
      team.memberEmails.push(user.email.toLowerCase());
      storage.upsertTeam(team);
    }
  }

  user.teamId = teamId;
  user.teamLocked = true;
  storage.upsertUser(user);

  const teamLabel =
    teamId === 'SPECTATOR'
      ? 'Spectator / Executive / Non-Competing'
      : storage.getTeamById(teamId)?.name || teamId;

  storage.logTelemetry(
    'TEAM_SELECTED',
    user.email,
    user.name,
    `Selected & locked affiliation: ${teamLabel}`,
    teamId === 'SPECTATOR' ? undefined : teamId
  );

  res.json({ user });
});

// POST /api/votes - Cast or Update a 1-5 Rubric Vote across the 4 criteria
app.post('/api/votes', (req, res) => {
  const { voterEmail, teamId, scores, comment } = req.body;
  if (!voterEmail || !teamId || !scores) {
    return res.status(400).json({ error: 'Missing required vote fields.' });
  }

  const config = storage.getConfig();
  if (!config.votingOpen) {
    return res.status(403).json({ error: 'Voting is currently closed by the Hackathon Admin.' });
  }

  const user = getOrSyncUser(voterEmail);

  const team = storage.getTeamById(teamId);
  if (!team) {
    return res.status(404).json({ error: 'Target team not found.' });
  }

  // Enforce Anti-Self-Voting Guardrail
  const check = canUserVoteForTeam(user, team);
  if (!check.allowed) {
    storage.logTelemetry(
      'SELF_VOTE_BLOCKED',
      user.email,
      user.name,
      `Blocked self-vote attempt on ${team.name}: ${check.reason}`,
      team.id
    );
    return res.status(403).json({ error: check.reason });
  }

  if (!validateRubricScores(scores as RubricScores1To5)) {
    return res.status(400).json({
      error: 'Invalid rubric scores: All 4 criteria must be integers rated between 1 and 5.',
    });
  }

  const averageScore = computeRubricAverage(scores as RubricScores1To5);
  const isJuryVoter =
    user.role === 'SPECIAL_JURY' ||
    config.juryAllowlist.some((e) => e.trim().toLowerCase() === user.email.toLowerCase());
  const voterRole: 'PARTICIPANT' | 'SPECIAL_JURY' = isJuryVoter ? 'SPECIAL_JURY' : 'PARTICIPANT';

  const vote: Vote = {
    id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    voterEmail: user.email,
    voterName: user.name,
    voterRole,
    voterTeamId: user.teamId || undefined,
    teamId: team.id,
    scores: {
      innovation: Number(scores.innovation),
      technicalExecution: Number(scores.technicalExecution),
      businessImpact: Number(scores.businessImpact),
      pitchQuality: Number(scores.pitchQuality),
    },
    averageScore,
    comment: comment?.trim() || '',
    timestamp: new Date().toISOString(),
  };

  storage.upsertVote(vote);
  storage.logTelemetry(
    'VOTE_CAST',
    user.email,
    user.name,
    `Cast ${voterRole} vote on ${team.name} (Score: ${averageScore.toFixed(2)} / 5.00)`,
    team.id
  );

  res.json({ vote });
});

// POST /api/admin/ai-judge - Admin triggers Gemini Master Transcript Judge
app.post('/api/admin/ai-judge', async (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const config = storage.getConfig();
  const transcriptToAnalyze =
    req.body.masterTranscriptText !== undefined
      ? req.body.masterTranscriptText
      : config.masterTranscriptText;
  const { aiModelName } = req.body;
  if (!transcriptToAnalyze || typeof transcriptToAnalyze !== 'string' || !transcriptToAnalyze.trim()) {
    return res.status(400).json({ error: 'Please provide the master transcript text.' });
  }

  const modelToUse = aiModelName || 'gemini-3.8-flash';
  const teams = storage.getTeams();

  const result = await analyzeMasterTranscriptWithGemini(
    transcriptToAnalyze,
    teams,
    modelToUse
  );

  // Update teams with AI evaluations
  for (const evalItem of result.evaluations) {
    const existingTeam = storage.getTeamById(evalItem.teamId);
    if (existingTeam) {
      existingTeam.aiEvaluation = evalItem;
      storage.upsertTeam(existingTeam);
    } else {
      // Auto-create newly discovered team from transcript if not yet in DB
      const newTeam: Team = {
        id: evalItem.teamId,
        name: evalItem.teamName,
        projectTitle: evalItem.projectTitle,
        tagline: evalItem.executiveSummary.substring(0, 90) + '...',
        description: evalItem.executiveSummary,
        category: 'AI Hackathon Finalist',
        memberEmails: [],
        aiEvaluation: evalItem,
      };
      storage.upsertTeam(newTeam);
    }
  }

  storage.updateConfig({
    masterTranscriptText: transcriptToAnalyze,
    aiModelName: modelToUse,
    lastAiRunTimestamp: new Date().toISOString(),
  });

  storage.logTelemetry(
    'AI_TRANSCRIPT_ANALYZED',
    adminUser.email,
    adminUser.name,
    `Gemini (${result.modelUsed}) analyzed Master Transcript: ${result.evaluations.length} teams scored on 1–5 rubric.`
  );

  res.json(result);
});

// POST /api/admin/ceremony-reveal - Toggle Ceremony Suspense vs Podium Reveal Mode
app.post('/api/admin/ceremony-reveal', (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const { ceremonyRevealed, votingOpen } = req.body;
  const updated = storage.updateConfig({
    ...(typeof ceremonyRevealed === 'boolean' ? { ceremonyRevealed } : {}),
    ...(typeof votingOpen === 'boolean' ? { votingOpen } : {}),
  });

  storage.logTelemetry(
    'CEREMONY_REVEAL_TOGGLED',
    adminUser.email,
    adminUser.name,
    `Ceremony Reveal Mode set to ${updated.ceremonyRevealed ? 'REVEALED 🏆' : 'SEALED 🔒'} (Voting Open: ${updated.votingOpen})`
  );

  res.json({ config: updated });
});

// POST /api/admin/users/override - Admin unlocks/reassigns user team or changes role
app.post('/api/admin/users/override', (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const { targetEmail, newTeamId, newRole, unlockTeam } = req.body;
  if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.trim()) {
    return res.status(400).json({ error: 'targetEmail is required.' });
  }
  const targetUser = getOrSyncUser(targetEmail);

  if (newTeamId !== undefined) {
    targetUser.teamId = newTeamId;
  }
  if (typeof unlockTeam === 'boolean') {
    targetUser.teamLocked = !unlockTeam;
  }
  if (newRole) {
    targetUser.role = newRole;
    const config = storage.getConfig();
    const lower = targetUser.email.toLowerCase();
    if (newRole === 'SPECIAL_JURY' && !config.juryAllowlist.includes(lower)) {
      config.juryAllowlist.push(lower);
      storage.updateConfig({ juryAllowlist: config.juryAllowlist });
    } else if (newRole === 'ADMIN' && !config.adminAllowlist.includes(lower)) {
      config.adminAllowlist.push(lower);
      storage.updateConfig({ adminAllowlist: config.adminAllowlist });
    }
  }

  storage.upsertUser(targetUser);
  storage.logTelemetry(
    'TEAM_UNLOCKED_BY_ADMIN',
    adminUser.email,
    adminUser.name,
    `Admin updated user ${targetUser.email}: Team=${targetUser.teamId || 'None'}, Role=${targetUser.role}, Locked=${targetUser.teamLocked}`
  );

  res.json({ user: targetUser });
});

// POST /api/admin/allowlists - Update Jury/Admin allowlists & weights
app.post('/api/admin/allowlists', (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const { juryAllowlist, adminAllowlist, weights } = req.body;
  const updated = storage.updateConfig({
    ...(Array.isArray(juryAllowlist)
      ? { juryAllowlist: juryAllowlist.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean) }
      : {}),
    ...(Array.isArray(adminAllowlist)
      ? { adminAllowlist: adminAllowlist.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean) }
      : {}),
    ...(weights ? { weights } : {}),
  });

  // Sync roles of existing users
  for (const u of storage.getAllUsers()) {
    u.role = resolveUserRole(u.email);
    if ((u.role === 'ADMIN' || u.role === 'SPECIAL_JURY') && u.teamId === null) {
      u.teamId = 'SPECTATOR';
      u.teamLocked = true;
    }
    storage.upsertUser(u);
  }

  res.json({ config: updated });
});

// POST /api/admin/teams - Create or update a team
app.post('/api/admin/teams', (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const teamData = req.body as Partial<Team>;
  if (!teamData.name?.trim() || !teamData.projectTitle?.trim()) {
    return res.status(400).json({ error: 'Team name and project title are required.' });
  }

  const id =
    teamData.id ||
    `team-${teamData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`;

  const existing = storage.getTeamById(id);
  const team: Team = {
    id,
    name: teamData.name.trim(),
    projectTitle: teamData.projectTitle.trim(),
    tagline: teamData.tagline?.trim() || teamData.projectTitle.trim(),
    description: teamData.description?.trim() || '',
    category: teamData.category?.trim() || 'General AI Track',
    memberEmails: Array.isArray(teamData.memberEmails)
      ? teamData.memberEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : existing?.memberEmails || [],
    githubUrl: teamData.githubUrl || existing?.githubUrl,
    slideDeckUrl: teamData.slideDeckUrl || existing?.slideDeckUrl,
    aiEvaluation: teamData.aiEvaluation || existing?.aiEvaluation,
  };

  storage.upsertTeam(team);
  res.json({ team });
});

// DELETE /api/admin/teams/:teamId - Admin deletes a team
app.delete('/api/admin/teams/:teamId', (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const teamId = req.params.teamId;
  const existingTeam = storage.getTeamById(teamId);
  if (!existingTeam) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  const deleted = storage.deleteTeam(teamId);
  if (deleted) {
    storage.logTelemetry(
      'TEAM_DELETED',
      adminUser.email,
      adminUser.name,
      `Deleted team "${existingTeam.name}" (${existingTeam.projectTitle}) and removed its associated votes.`,
      teamId
    );
  }

  res.json({ status: 'deleted', teamId });
});

// DELETE /api/admin/users/:email - Admin deletes a user and cleans up their votes
app.delete('/api/admin/users/:email', (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const targetEmail = decodeURIComponent(req.params.email || '').trim().toLowerCase();
  if (!targetEmail) {
    return res.status(400).json({ error: 'User email is required.' });
  }

  if (targetEmail === adminUser.email.toLowerCase()) {
    return res.status(400).json({ error: 'Cannot delete your own active Admin account.' });
  }

  const existingUser = storage.getUser(targetEmail);
  if (!existingUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const deleted = storage.deleteUser(targetEmail);
  if (deleted) {
    storage.logTelemetry(
      'USER_DELETED',
      adminUser.email,
      adminUser.name,
      `Deleted user "${existingUser.name}" (${existingUser.email}) and removed their cast votes.`
    );
  }

  res.json({ status: 'deleted', email: targetEmail });
});

// POST /api/admin/google-client-id - Save Google OAuth 2.0 Client ID dynamically
app.post('/api/admin/google-client-id', (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;
  const { googleClientId } = req.body;
  const cleaned = String(googleClientId || '').trim();
  storage.updateConfig({ googleClientId: cleaned });
  storage.logTelemetry(
    'ROLE_UPDATED',
    adminUser.email,
    adminUser.name,
    `Updated Google OAuth 2.0 Client ID configuration`
  );
  res.json({ status: 'updated', googleClientId: cleaned });
});

// POST /api/admin/reset-demo - Reset DB to clean seed state
app.post('/api/admin/reset-demo', (req, res) => {
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;
  storage.resetToSeed();
  res.json({ status: 'reset_complete' });
});

// Public OAuth Branding Collaterals: Privacy Policy (/privacy) & Terms of Service (/terms)
app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — Genesis × Skelar Hackathon 2026 Voting Portal</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
      background-color: #090D16;
      color: #E5E7EB;
      line-height: 1.65;
      margin: 0;
      padding: 2.5rem 1.25rem;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 999px;
      padding: 0.25rem 0.85rem;
      font-size: 0.78rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h1 { color: #F9FAFB; font-size: 1.85rem; margin-top: 0; }
    h2 { color: #38BDF8; font-size: 1.2rem; margin-top: 1.75rem; }
    p, li { color: #D1D5DB; font-size: 0.95rem; }
    a { color: #34D399; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .footer-nav {
      margin-top: 2.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.88rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Genesis × Skelar Hackathon 2026</span>
    <h1>Privacy Policy</h1>
    <p><strong>Effective Date:</strong> September 17, 2026</p>
    <p>Welcome to the <strong>Genesis × Skelar Hackathon 2026 Voting Portal</strong> ("the Application"). This Privacy Policy explains how we collect, use, and safeguard information when you sign in and participate in hackathon project evaluation.</p>

    <h2>1. Information We Collect via Google Sign-In</h2>
    <p>When you authenticate using Google OAuth 2.0 ("Sign in with Google"), we request basic, read-only profile scopes (<code>email</code>, <code>profile</code>, and <code>openid</code>). Specifically, we receive and store:</p>
    <ul>
      <li><strong>Email Address:</strong> Used to uniquely identify your voter session, determine your hackathon role (Participant, Special Jury, or Organizer Admin), and prevent duplicate voting.</li>
      <li><strong>Display Name & Profile Picture:</strong> Displayed within your session header and to hackathon administrators in the voting audit log.</li>
      <li><strong>Team Affiliation & Rubric Votes:</strong> Your selected hackathon team (to enforce anti-self-voting rules) and the 1–5 rubric scores you submit for finalist projects.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>Your information is used strictly for operating the Genesis × Skelar Hackathon 2026 voting and judging process:</p>
    <ul>
      <li>Enforcing conflict-of-interest rules so participants cannot vote for their own competing team.</li>
      <li>Computing composite 3-Pillar scores (Participants 33.33%, Gemini AI Transcript Judge 33.33%, Special Jury 33.33%).</li>
      <li>Providing auditability and transparency for hackathon organizers.</li>
    </ul>

    <h2>3. Data Sharing & Third Parties</h2>
    <p>We do <strong>not</strong> sell, rent, or share your personal information or Google user data with any third-party marketers or external services. Data is stored securely in Google Cloud (Cloud Run & Firestore) strictly for the duration of the hackathon event.</p>

    <h2>4. Data Retention & Deletion</h2>
    <p>Hackathon administrators can delete any registered user profile and associated votes at any time directly from the Admin Dashboard. You may also request immediate deletion of your account and votes by contacting the hackathon organizing committee.</p>

    <div class="footer-nav">
      <a href="/">← Back to Genesis × Skelar Voting Portal</a>
      <a href="/terms">View Terms of Service →</a>
    </div>
  </div>
</body>
</html>`);
});

app.get('/terms', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Terms of Service — Genesis × Skelar Hackathon 2026 Voting Portal</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
      background-color: #090D16;
      color: #E5E7EB;
      line-height: 1.65;
      margin: 0;
      padding: 2.5rem 1.25rem;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      background: rgba(56, 189, 248, 0.15);
      color: #38BDF8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 999px;
      padding: 0.25rem 0.85rem;
      font-size: 0.78rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h1 { color: #F9FAFB; font-size: 1.85rem; margin-top: 0; }
    h2 { color: #34D399; font-size: 1.2rem; margin-top: 1.75rem; }
    p, li { color: #D1D5DB; font-size: 0.95rem; }
    a { color: #38BDF8; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .footer-nav {
      margin-top: 2.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.88rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Genesis × Skelar Hackathon 2026</span>
    <h1>Terms of Service</h1>
    <p><strong>Effective Date:</strong> September 17, 2026</p>
    <p>By accessing or signing into the <strong>Genesis × Skelar Hackathon 2026 Voting Portal</strong> ("the Portal"), you agree to abide by these Terms of Service and the official hackathon voting rules.</p>

    <h2>1. Eligibility & Fair Voting Integrity</h2>
    <ul>
      <li>Each participant, jury member, and attendee may authenticate with a single valid Google account.</li>
      <li>Participants affiliated with a competing hackathon team are strictly prohibited from voting for their own team. You must accurately select your competing team affiliation upon initial login.</li>
      <li>Any attempt to manipulate scores, create unauthorized duplicate accounts, or bypass voting restrictions may result in vote disqualification by the Organizer Admins.</li>
    </ul>

    <h2>2. Project Collaterals & Intellectual Property</h2>
    <ul>
      <li>Competing teams retain ownership of their hackathon project code, descriptions, and pitches submitted to the Portal.</li>
      <li>By submitting team project descriptions and pitches, teams grant Genesis and Skelar a non-exclusive license to display and evaluate project details within the Hackathon Portal and ceremony presentations.</li>
    </ul>

    <h2>3. Disclaimer of Warranties</h2>
    <p>The Portal is provided "as is" for the Genesis × Skelar Hackathon 2026 event. The organizers reserve the right to modify voting windows, adjust ceremony reveal schedules, or remove invalid user accounts at their sole discretion.</p>

    <div class="footer-nav">
      <a href="/">← Back to Genesis × Skelar Voting Portal</a>
      <a href="/privacy">View Privacy Policy →</a>
    </div>
  </div>
</body>
</html>`);
});

// Serve static React SPA in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Genesis x Skelar Hackathon API Server Running. Start Vite client for UI.');
    }
  });
});

const PORT = Number(process.env.PORT) || 8080;
if (process.env.NODE_ENV !== 'test') {
  storage.initializeFromFirestore().finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Genesis x Skelar Hackathon Server listening on http://0.0.0.0:${PORT}`);
    });
  });
}

export default app;
