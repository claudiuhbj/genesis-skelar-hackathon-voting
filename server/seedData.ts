import { DatabaseSchema, Team } from './types.js';

export const SAMPLE_MASTER_TRANSCRIPT = `[GENESIS x SKELAR HACKATHON 2026 - GRAND FINALE DEMO TRANSCRIPT]
Date: September 17, 2026
Moderator (Elena - Genesis Venture Partner): Welcome everyone to the Genesis x Skelar Hackathon Finale! Today our finalist teams will pitch their AI-powered venture solutions. Judges, remember our 4 criteria: Innovation, Technical Execution, Business Impact, and Pitch Quality (1 to 5 scale). Let's welcome our first team: Team NeuralPulse!

---
[00:02:15] PITCH 1: Team NeuralPulse — Project: "AdScale Autonomous Creative Studio"
Speaker (Dmytro Kovalenko, Tech Lead): Hi everyone! At Skelar and Genesis, performance marketing teams spend over $40M annually testing video ad hooks across Meta and TikTok. The bottleneck? Creative fatigue happens in 72 hours.
Speaker (Oksana Melnyk, AI Engineer): We built AdScale Autonomous Creative Studio. Instead of manually editing video variations, our pipeline ingests real-time ROAS telemetry from BigQuery, identifies winning emotional hooks using Gemini 2.5 Pro multimodal video understanding, and autonomously synthesizes 50 localized video ad variants per hour using Veo and ElevenLabs voice cloning.
Judge Question (Viktor - Skelar CEO): Impressive speed, Oksana. Did you deploy the closed-loop ROAS feedback in production or is it mocked?
Speaker (Dmytro Kovalenko): Fully live! During the 48-hour hackathon we connected it to a live mobile app campaign. It generated 18 variants, automatically paused 12 underperformers, and lifted click-through rate by +34% with zero human intervention.
Moderator: Incredible live metrics! Thank you Team NeuralPulse.

---
[00:14:40] PITCH 2: Team FinGuard AI — Project: "SentinelPay Fraud & Chargeback Shield"
Speaker (Artem Bondar, Backend Architect): Hello Genesis & Skelar! Subscription apps lose up to 4.2% of net revenue to friendly fraud and payment cascading failures.
Speaker (Yulia Savchenko, ML Researcher): SentinelPay is a sub-40 millisecond edge inference engine built on Cloud Run and Vertex AI. When a user initiates a high-risk transaction or subscription cancellation, SentinelPay analyzes 120 behavioral signals and triggers an instant, hyper-personalized retention or verification micro-flow.
Judge Question (Max - Genesis CTO): How does your latency hold up under peak traffic spikes, and what's the false positive rate?
Speaker (Artem Bondar): We benchmarked at 12,000 RPS on Cloud Run with autoscaling. Latency stayed under 38ms at P99, and our shadow test on 250,000 historical Skelar transactions reduced chargebacks by 61% while keeping false positives below 0.3%.
Moderator: Awesome engineering depth from Team FinGuard AI!

---
[00:28:10] PITCH 3: Team VibeOps — Project: "DevPulse Self-Healing Cloud Run Copilot"
Speaker (Taras Shevchenko, DevOps Lead): Hey folks! Whenever a microservice crashes at 3 AM, on-call engineers waste 45 minutes correlating logs across Datadog, Sentry, and GitHub commits.
Speaker (Nazar Boyko, Full-Stack Dev): DevPulse hooks directly into Cloud Logging and GitHub webhooks. The moment an exception spike occurs, our agent isolates the offending commit, spins up an ephemeral sandbox, generates a unit test reproducing the crash, writes the patch, and posts a verified GitHub Pull Request straight to Slack within 90 seconds.
Judge Question (Elena - Genesis Partner): What happens if the generated patch introduces a regression?
Speaker (Taras Shevchenko): Great question! DevPulse never merges to main automatically. It runs the full CI test suite inside an isolated Cloud Build container and only alerts the human engineer with a 1-click "Approve & Deploy" button once all tests pass green.

---
[00:41:05] PITCH 4: Team PetCare AI — Project: "PawSense AI Vet Triage Companion"
Speaker (Alina Romanova, Product Manager): Hi everyone! Pet owners panic when their dog or cat shows unusual symptoms at night, leading to unnecessary $800 emergency vet visits.
Speaker (Maksym Lysenko, Mobile Dev): PawSense allows pet parents to record a 15-second video of their pet's breathing, gait, or skin condition. Our multimodal Gemini model analyzes visual and acoustic biomarkers against veterinary clinical protocols and provides an instant triage urgency score plus live vet tele-health routing.
Judge Question (Viktor - Skelar CEO): How did you validate medical accuracy during the hackathon?
Speaker (Alina Romanova): We partnered with 3 licensed veterinarians who curated 150 real clinical cases. PawSense achieved 94% concordance with human vet urgency triage, though we still need to improve low-light video stabilization in future sprints.
Moderator: Thank you to all four teams! The pitches were phenomenal.`;

export const SEED_TEAMS: Team[] = [
  {
    id: 'team-neuralpulse',
    name: 'Team NeuralPulse',
    projectTitle: 'AdScale Autonomous Creative Studio',
    tagline: 'Closed-loop autonomous video ad synthesis & ROAS optimization engine',
    description:
      'Ingests real-time Meta/TikTok ROAS telemetry, extracts high-converting visual hooks via multimodal Gemini video analysis, and autonomously generates localized video ad variations with +34% live CTR lift.',
    category: 'AI Marketing & Growth Automation',
    memberEmails: ['dmytro.k@skelar.tech', 'oksana.m@skelar.tech', 'neuralpulse@genesis.tech'],
    githubUrl: 'https://github.com/genesis-skelar/adscale-autonomous-studio',
    slideDeckUrl: 'https://docs.google.com/presentation/d/adscale-demo-deck',
    aiEvaluation: {
      teamId: 'team-neuralpulse',
      teamName: 'Team NeuralPulse',
      projectTitle: 'AdScale Autonomous Creative Studio',
      detectedSpeakers: ['Dmytro Kovalenko', 'Oksana Melnyk'],
      scores: {
        innovation: 5,
        technicalExecution: 5,
        businessImpact: 5,
        pitchQuality: 5,
      },
      averageScore: 5.0,
      executiveSummary:
        'Team NeuralPulse delivered a live, production-tested autonomous creative studio that closed the loop between BigQuery ROAS telemetry and generative video synthesis, proving a +34% live CTR lift during the 48-hour hackathon.',
      notableQuote:
        'During the 48-hour hackathon we connected it to a live mobile app campaign. It generated 18 variants, automatically paused 12 underperformers, and lifted click-through rate by +34% with zero human intervention.',
      aiRoast:
        'You built an AI that autonomously generates TikTok ads and burns marketing budget with zero human supervision—what could possibly go wrong before Monday morning standup?',
      strengths: [
        'Verified live production deployment with real mobile ad campaign ROAS lift (+34% CTR)',
        'Direct strategic alignment with Genesis & Skelar performance marketing scale ($40M+ spend)',
        'Seamless multimodal Gemini + generative video + automated budget pausing loop',
      ],
      weaknesses: [
        'Long-term brand safety guardrails for autonomous video generation could be expanded',
      ],
      modelUsed: 'gemini-3.8-flash',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  },
  {
    id: 'team-finguard',
    name: 'Team FinGuard AI',
    projectTitle: 'SentinelPay Fraud & Chargeback Shield',
    tagline: 'Sub-40ms edge ML chargeback prevention & dynamic retention micro-flows',
    description:
      'Real-time edge inference engine on Cloud Run that evaluates 120 behavioral signals during high-risk checkout and subscription cancellation flows, reducing friendly fraud chargebacks by 61% at 12,000 RPS.',
    category: 'FinTech & Revenue Protection',
    memberEmails: ['artem.b@genesis.tech', 'yulia.s@genesis.tech', 'finguard@skelar.tech'],
    githubUrl: 'https://github.com/genesis-skelar/sentinelpay-shield',
    slideDeckUrl: 'https://docs.google.com/presentation/d/sentinelpay-deck',
    aiEvaluation: {
      teamId: 'team-finguard',
      teamName: 'Team FinGuard AI',
      projectTitle: 'SentinelPay Fraud & Chargeback Shield',
      detectedSpeakers: ['Artem Bondar', 'Yulia Savchenko'],
      scores: {
        innovation: 4,
        technicalExecution: 5,
        businessImpact: 5,
        pitchQuality: 4,
      },
      averageScore: 4.5,
      executiveSummary:
        'SentinelPay demonstrated exceptional engineering rigor with a 38ms P99 latency at 12,000 RPS on Cloud Run, achieving a 61% chargeback reduction on 250,000 historical Skelar transactions.',
      notableQuote:
        'We benchmarked at 12,000 RPS on Cloud Run with autoscaling. Latency stayed under 38ms at P99, and our shadow test on 250,000 historical Skelar transactions reduced chargebacks by 61% while keeping false positives below 0.3%.',
      aiRoast:
        'Analyzing 120 behavioral signals in 38 milliseconds just to stop someone from canceling a subscription—at this point your AI knows the user is broke before their own bank does.',
      strengths: [
        'Outstanding technical benchmark (12,000 RPS at <38ms P99 latency)',
        'Validated on 250,000 real historical transactions with 61% chargeback reduction',
        'Immediate bottom-line impact for subscription unit economics',
      ],
      weaknesses: [
        'UI/UX of the dynamic customer retention micro-flow could be shown in greater detail',
      ],
      modelUsed: 'gemini-3.8-flash',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  },
  {
    id: 'team-vibeops',
    name: 'Team VibeOps',
    projectTitle: 'DevPulse Self-Healing Cloud Run Copilot',
    tagline: 'Autonomous incident root-cause isolation, sandbox reproduction & PR synthesis',
    description:
      'Monitors production telemetry, isolates crashing commits, automatically writes a failing reproduction test in an isolated sandbox container, synthesizes the fix, and posts a verified GitHub PR in 90 seconds.',
    category: 'Developer Tools & DevOps AI',
    memberEmails: ['taras.s@skelar.tech', 'nazar.b@skelar.tech', 'vibeops@genesis.tech'],
    githubUrl: 'https://github.com/genesis-skelar/devpulse-copilot',
    slideDeckUrl: 'https://docs.google.com/presentation/d/devpulse-deck',
    aiEvaluation: {
      teamId: 'team-vibeops',
      teamName: 'Team VibeOps',
      projectTitle: 'DevPulse Self-Healing Cloud Run Copilot',
      detectedSpeakers: ['Taras Shevchenko', 'Nazar Boyko'],
      scores: {
        innovation: 5,
        technicalExecution: 4,
        businessImpact: 4,
        pitchQuality: 5,
      },
      averageScore: 4.5,
      executiveSummary:
        'DevPulse showcased a developer-favorite autonomous debugging workflow that turns production exception spikes into verified, CI-tested GitHub Pull Requests within 90 seconds.',
      notableQuote:
        'DevPulse never merges to main automatically. It runs the full CI test suite inside an isolated Cloud Build container and only alerts the human engineer with a 1-click Approve & Deploy button once all tests pass green.',
      aiRoast:
        'Naming your team "VibeOps" while building an AI that fixes production outages is peak 2026 energy: first you vibe-coded the bug into production, and now you vibe-coded a bot to apologize for it.',
      strengths: [
        'Safe human-in-the-loop architecture with isolated CI sandbox verification',
        'Dramatically reduces MTTR (Mean Time To Resolution) for 3 AM on-call incidents',
        'Crisp, highly engaging pitch and Q&A handling',
      ],
      weaknesses: [
        'Complex multi-service distributed race conditions may require deeper context windows',
      ],
      modelUsed: 'gemini-3.8-flash',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  },
  {
    id: 'team-petcare',
    name: 'Team PetCare AI',
    projectTitle: 'PawSense AI Vet Triage Companion',
    tagline: 'Multimodal 15-second video & acoustic pet symptom triage with 94% vet concordance',
    description:
      'Empowers pet owners to record a short video of pet symptoms; Gemini multimodal analysis evaluates respiratory, gait, and dermatological biomarkers to provide instant veterinary urgency scoring.',
    category: 'Consumer AI & Digital Health',
    memberEmails: ['alina.r@genesis.tech', 'maksym.l@genesis.tech', 'petcare@skelar.tech'],
    githubUrl: 'https://github.com/genesis-skelar/pawsense-vet-ai',
    slideDeckUrl: 'https://docs.google.com/presentation/d/pawsense-deck',
    aiEvaluation: {
      teamId: 'team-petcare',
      teamName: 'Team PetCare AI',
      projectTitle: 'PawSense AI Vet Triage Companion',
      detectedSpeakers: ['Alina Romanova', 'Maksym Lysenko'],
      scores: {
        innovation: 4,
        technicalExecution: 4,
        businessImpact: 4,
        pitchQuality: 5,
      },
      averageScore: 4.25,
      executiveSummary:
        'PawSense combined compassionate consumer product design with clinical validation, achieving 94% triage concordance across 150 veterinary cases.',
      notableQuote:
        'We partnered with 3 licensed veterinarians who curated 150 real clinical cases. PawSense achieved 94% concordance with human vet urgency triage.',
      aiRoast:
        '94% veterinary concordance on a 15-second video clip is impressive, though the remaining 6% is probably Gemini diagnosing an overdramatic Golden Retriever with "severe treat deficiency."',
      strengths: [
        'Strong domain validation with 3 licensed veterinarians (94% concordance)',
        'High emotional resonance and clear consumer subscription monetization path',
      ],
      weaknesses: [
        'Low-light video stabilization and background noise filtering still in progress',
      ],
      modelUsed: 'gemini-3.8-flash',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  },
];

export const PRIMARY_ADMIN_EMAIL = (
  process.env.INITIAL_ADMIN_EMAIL ||
  process.env.INITIAL_ADMIN_EMAILS?.split(',')[0] ||
  'admin@genesis.tech'
)
  .trim()
  .toLowerCase();

export const PRIMARY_ADMIN_NAME =
  process.env.INITIAL_ADMIN_NAME || 'Hackathon Organizer (Admin)';

export const INITIAL_DATABASE_STATE: DatabaseSchema = {
  users: {
    [PRIMARY_ADMIN_EMAIL]: {
      id: 'user-primary-admin',
      email: PRIMARY_ADMIN_EMAIL,
      name: PRIMARY_ADMIN_NAME,
      picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      role: 'ADMIN',
      teamId: 'SPECTATOR',
      teamLocked: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      lastActiveAt: new Date().toISOString(),
    },
    'viktor.jury@skelar.tech': {
      id: 'user-jury-viktor',
      email: 'viktor.jury@skelar.tech',
      name: 'Viktor S. (Special Jury - Skelar Executive)',
      role: 'SPECIAL_JURY',
      teamId: 'SPECTATOR',
      teamLocked: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    'elena.jury@genesis.tech': {
      id: 'user-jury-elena',
      email: 'elena.jury@genesis.tech',
      name: 'Elena V. (Special Jury - Genesis Partner)',
      role: 'SPECIAL_JURY',
      teamId: 'SPECTATOR',
      teamLocked: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    'dmytro.k@skelar.tech': {
      id: 'user-participant-dmytro',
      email: 'dmytro.k@skelar.tech',
      name: 'Dmytro Kovalenko (Team NeuralPulse)',
      role: 'PARTICIPANT',
      teamId: 'team-neuralpulse',
      teamLocked: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    'artem.b@genesis.tech': {
      id: 'user-participant-artem',
      email: 'artem.b@genesis.tech',
      name: 'Artem Bondar (Team FinGuard AI)',
      role: 'PARTICIPANT',
      teamId: 'team-finguard',
      teamLocked: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    'alex.spectator@skelar.tech': {
      id: 'user-participant-alex',
      email: 'alex.spectator@skelar.tech',
      name: 'Alex M. (Product Designer - Spectator Voter)',
      role: 'PARTICIPANT',
      teamId: 'SPECTATOR',
      teamLocked: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  },
  teams: SEED_TEAMS,
  votes: [
    // Special Jury Votes
    {
      id: 'vote-jury-1',
      voterEmail: 'viktor.jury@skelar.tech',
      voterName: 'Viktor S. (Special Jury)',
      voterRole: 'SPECIAL_JURY',
      teamId: 'team-neuralpulse',
      scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 4 },
      averageScore: 4.75,
      comment: 'Live +34% CTR lift on real ad spend is extraordinary for a 48h hackathon.',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'vote-jury-2',
      voterEmail: 'elena.jury@genesis.tech',
      voterName: 'Elena V. (Special Jury)',
      voterRole: 'SPECIAL_JURY',
      teamId: 'team-neuralpulse',
      scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
      averageScore: 5.0,
      comment: 'Ready to scale across all Genesis and Skelar portfolio companies immediately.',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: 'vote-jury-3',
      voterEmail: 'viktor.jury@skelar.tech',
      voterName: 'Viktor S. (Special Jury)',
      voterRole: 'SPECIAL_JURY',
      teamId: 'team-finguard',
      scores: { innovation: 4, technicalExecution: 5, businessImpact: 5, pitchQuality: 4 },
      averageScore: 4.5,
      comment: 'Sub-40ms latency at 12k RPS on Cloud Run solves a massive chargeback pain point.',
      timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    },
    {
      id: 'vote-jury-4',
      voterEmail: 'elena.jury@genesis.tech',
      voterName: 'Elena V. (Special Jury)',
      voterRole: 'SPECIAL_JURY',
      teamId: 'team-vibeops',
      scores: { innovation: 5, technicalExecution: 4, businessImpact: 4, pitchQuality: 5 },
      averageScore: 4.5,
      comment: 'Every engineering team wants this self-healing PR bot.',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: 'vote-jury-5',
      voterEmail: 'viktor.jury@skelar.tech',
      voterName: 'Viktor S. (Special Jury)',
      voterRole: 'SPECIAL_JURY',
      teamId: 'team-petcare',
      scores: { innovation: 4, technicalExecution: 4, businessImpact: 4, pitchQuality: 4 },
      averageScore: 4.0,
      comment: 'Strong veterinary validation and great consumer product polish.',
      timestamp: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
    },
    // Participant Votes (cross-team & spectator votes)
    {
      id: 'vote-part-1',
      voterEmail: 'artem.b@genesis.tech',
      voterName: 'Artem Bondar (Team FinGuard AI)',
      voterRole: 'PARTICIPANT',
      teamId: 'team-neuralpulse',
      scores: { innovation: 5, technicalExecution: 5, businessImpact: 5, pitchQuality: 5 },
      averageScore: 5.0,
      comment: 'Huge respect from FinGuard team—your live ad ROAS loop is killer!',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'vote-part-2',
      voterEmail: 'dmytro.k@skelar.tech',
      voterName: 'Dmytro Kovalenko (Team NeuralPulse)',
      voterRole: 'PARTICIPANT',
      teamId: 'team-finguard',
      scores: { innovation: 5, technicalExecution: 5, businessImpact: 4, pitchQuality: 4 },
      averageScore: 4.5,
      comment: '38ms P99 at 12,000 RPS is insane engineering.',
      timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    },
    {
      id: 'vote-part-3',
      voterEmail: 'alex.spectator@skelar.tech',
      voterName: 'Alex M. (Spectator)',
      voterRole: 'PARTICIPANT',
      teamId: 'team-vibeops',
      scores: { innovation: 5, technicalExecution: 5, businessImpact: 4, pitchQuality: 5 },
      averageScore: 4.75,
      comment: 'DevPulse saved our on-call sanity just watching the demo!',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: 'vote-part-4',
      voterEmail: 'alex.spectator@skelar.tech',
      voterName: 'Alex M. (Spectator)',
      voterRole: 'PARTICIPANT',
      teamId: 'team-petcare',
      scores: { innovation: 4, technicalExecution: 4, businessImpact: 5, pitchQuality: 5 },
      averageScore: 4.5,
      comment: 'As a dog owner, I would subscribe to PawSense today.',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ],
  telemetry: [
    {
      id: 'tel-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
      type: 'TEAM_SELECTED',
      actorEmail: 'dmytro.k@skelar.tech',
      actorName: 'Dmytro Kovalenko',
      targetTeamId: 'team-neuralpulse',
      details: 'Selected & locked affiliation with Team NeuralPulse (Self-voting disabled for team-neuralpulse)',
    },
    {
      id: 'tel-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      type: 'SELF_VOTE_BLOCKED',
      actorEmail: 'dmytro.k@skelar.tech',
      actorName: 'Dmytro Kovalenko',
      targetTeamId: 'team-neuralpulse',
      details: 'Fair Play Guardrail blocked attempt by dmytro.k@skelar.tech to cast vote on own team (Team NeuralPulse)',
    },
    {
      id: 'tel-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      type: 'AI_TRANSCRIPT_ANALYZED',
      actorEmail: PRIMARY_ADMIN_EMAIL,
      actorName: PRIMARY_ADMIN_NAME,
      details: 'Gemini (gemini-3.8-flash) analyzed Master Finale Transcript (4 teams evaluated on 1–5 rubric scale)',
    },
    {
      id: 'tel-4',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      type: 'VOTE_CAST',
      actorEmail: 'elena.jury@genesis.tech',
      actorName: 'Elena V. (Special Jury)',
      targetTeamId: 'team-neuralpulse',
      details: 'Special Jury vote cast for Team NeuralPulse (Score: 5.00 / 5.00)',
    },
  ],
  config: {
    ceremonyRevealed: false, // Default to Ceremony Suspense Mode for Public Voters; Admin sees everything live!
    votingOpen: true,
    weights: {
      participants: 1 / 3,
      aiJudge: 1 / 3,
      specialJury: 1 / 3,
    },
    juryAllowlist: [
      'viktor.jury@skelar.tech',
      'elena.jury@genesis.tech',
      'max.jury@genesis.tech',
      'jury@skelar.tech',
    ],
    adminAllowlist: Array.from(
      new Set([
        PRIMARY_ADMIN_EMAIL,
        ...(process.env.INITIAL_ADMIN_EMAILS
          ? process.env.INITIAL_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
          : []),
        'admin@genesis.tech',
        'admin@skelar.tech',
      ])
    ),
    masterTranscriptText: SAMPLE_MASTER_TRANSCRIPT,
    lastAiRunTimestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    aiModelName: 'gemini-3.8-flash',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  },
};
