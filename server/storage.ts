import fs from 'fs';
import path from 'path';
import { Firestore } from '@google-cloud/firestore';
import { INITIAL_DATABASE_STATE } from './seedData.js';
import {
  AppConfig,
  DatabaseSchema,
  Team,
  TelemetryEvent,
  TelemetryEventType,
  User,
  Vote,
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'hackathon_db.json');

export class StorageService {
  private db: DatabaseSchema;
  private firestore: Firestore | null = null;
  private useFirestore: boolean = false;

  constructor() {
    this.db = this.loadLocalDb(false);
    this.ensureEnvAdminsAndClientId(this.db);

    const isCloudRun = Boolean(process.env.K_SERVICE);
    const shouldUseFirestore =
      process.env.USE_FIRESTORE !== 'false' &&
      (process.env.USE_FIRESTORE === 'true' || isCloudRun);

    if (shouldUseFirestore) {
      try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'claudiu-test-project-1';
        this.firestore = new Firestore({
          projectId,
          ignoreUndefinedProperties: true,
        });
        this.useFirestore = true;
        console.log(`🔥 Firestore connected for project: ${projectId}`);
      } catch (err) {
        console.warn('⚠️ Firestore initialization failed, using local JSON DB fallback:', err);
      }
    }
  }

  private ensureEnvAdminsAndClientId(data: DatabaseSchema): void {
    const envAdmins = [
      process.env.INITIAL_ADMIN_EMAIL,
      ...(process.env.INITIAL_ADMIN_EMAILS ? process.env.INITIAL_ADMIN_EMAILS.split(',') : []),
    ]
      .map((e) => e?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e));

    for (const email of envAdmins) {
      if (!data.config.adminAllowlist.some((a) => a.toLowerCase() === email)) {
        data.config.adminAllowlist.push(email);
      }
      if (data.users[email]) {
        data.users[email].role = 'ADMIN';
      }
    }
    if (process.env.GOOGLE_CLIENT_ID && !data.config.googleClientId) {
      data.config.googleClientId = process.env.GOOGLE_CLIENT_ID.trim();
    }
  }

  public async initializeFromFirestore(): Promise<void> {
    if (!this.useFirestore || !this.firestore) return;
    try {
      const docRef = this.firestore.collection('genesis_skelar_hackathon').doc('master_state');
      const snapshot = await docRef.get();
      if (snapshot.exists) {
        const remoteData = snapshot.data() as DatabaseSchema;
        if (remoteData && remoteData.config && remoteData.teams) {
          this.ensureEnvAdminsAndClientId(remoteData);
          this.db = remoteData;
          this.saveLocalDb(this.db, false);
          console.log('✅ Loaded existing state from Firestore (genesis_skelar_hackathon/master_state)');
          return;
        }
      }
      // If not found in Firestore yet, seed Firestore with current initial state
      this.ensureEnvAdminsAndClientId(this.db);
      const cleanInitial = JSON.parse(JSON.stringify(this.db));
      await docRef.set(cleanInitial);
      console.log('🌱 Seeded initial state to Firestore (genesis_skelar_hackathon/master_state)');
    } catch (err) {
      console.error('⚠️ Failed to load/seed state from Firestore on startup:', err);
    }
  }

  private loadLocalDb(syncToFirestore: boolean = true): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        return JSON.parse(raw) as DatabaseSchema;
      }
    } catch (err) {
      console.warn('⚠️ Could not read existing local DB, seeding initial database state:', err);
    }

    const initialClone: DatabaseSchema = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));
    this.saveLocalDb(initialClone, syncToFirestore);
    return initialClone;
  }

  private saveLocalDb(data: DatabaseSchema = this.db, syncToFirestore: boolean = true): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist local JSON DB:', err);
    }

    if (syncToFirestore && this.useFirestore && this.firestore) {
      try {
        const cleanData = JSON.parse(JSON.stringify(data));
        this.firestore
          .collection('genesis_skelar_hackathon')
          .doc('master_state')
          .set(cleanData)
          .catch((err) => console.error('Firestore background sync error:', err));
      } catch (err) {
        console.error('Firestore synchronous serialize error:', err);
      }
    }
  }

  public getState(): DatabaseSchema {
    return this.db;
  }

  public getConfig(): AppConfig {
    return this.db.config;
  }

  public updateConfig(partial: Partial<AppConfig>): AppConfig {
    this.db.config = { ...this.db.config, ...partial };
    this.saveLocalDb();
    return this.db.config;
  }

  public getUser(email: string): User | undefined {
    return this.db.users[email.toLowerCase()];
  }

  public getAllUsers(): User[] {
    return Object.values(this.db.users).sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
  }

  public upsertUser(user: User): User {
    const key = user.email.toLowerCase();
    this.db.users[key] = user;
    this.saveLocalDb();
    return user;
  }

  public deleteUser(email: string): boolean {
    const key = email.trim().toLowerCase();
    const existed = Boolean(this.db.users[key]);
    if (!existed) {
      return false;
    }
    delete this.db.users[key];
    // Clean up any votes cast by this user
    this.db.votes = this.db.votes.filter((v) => v.voterEmail.toLowerCase() !== key);
    // Clean up any team memberEmails references
    for (const team of this.db.teams) {
      team.memberEmails = team.memberEmails.filter((e) => e.toLowerCase() !== key);
    }
    this.saveLocalDb();
    return true;
  }

  public getTeams(): Team[] {
    return this.db.teams;
  }

  public getTeamById(teamId: string): Team | undefined {
    return this.db.teams.find((t) => t.id === teamId);
  }

  public upsertTeam(team: Team): Team {
    const idx = this.db.teams.findIndex((t) => t.id === team.id);
    if (idx >= 0) {
      this.db.teams[idx] = team;
    } else {
      this.db.teams.push(team);
    }
    this.saveLocalDb();
    return team;
  }

  public deleteTeam(teamId: string): boolean {
    const initialLen = this.db.teams.length;
    this.db.teams = this.db.teams.filter((t) => t.id !== teamId);
    this.db.votes = this.db.votes.filter((v) => v.teamId !== teamId);
    for (const user of Object.values(this.db.users)) {
      if (user.teamId === teamId) {
        user.teamId = null;
        user.teamLocked = false;
      }
    }
    this.saveLocalDb();
    return this.db.teams.length < initialLen;
  }

  public getVotes(): Vote[] {
    return this.db.votes;
  }

  public upsertVote(vote: Vote): Vote {
    const existingIdx = this.db.votes.findIndex(
      (v) =>
        v.voterEmail.toLowerCase() === vote.voterEmail.toLowerCase() &&
        v.teamId === vote.teamId
    );
    if (existingIdx >= 0) {
      this.db.votes[existingIdx] = vote;
    } else {
      this.db.votes.push(vote);
    }
    this.saveLocalDb();
    return vote;
  }

  public logTelemetry(
    type: TelemetryEventType,
    actorEmail: string,
    actorName: string,
    details: string,
    targetTeamId?: string
  ): TelemetryEvent {
    const event: TelemetryEvent = {
      id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      actorEmail,
      actorName,
      targetTeamId,
      details,
    };
    this.db.telemetry.unshift(event);
    // Keep most recent 500 events
    if (this.db.telemetry.length > 500) {
      this.db.telemetry = this.db.telemetry.slice(0, 500);
    }
    this.saveLocalDb();
    return event;
  }

  public getTelemetry(): TelemetryEvent[] {
    return this.db.telemetry;
  }

  public resetToSeed(): DatabaseSchema {
    this.db = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));
    this.saveLocalDb();
    return this.db;
  }
}

export const storage = new StorageService();
