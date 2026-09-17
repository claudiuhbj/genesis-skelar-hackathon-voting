# Genesis × Skelar Hackathon 2026 — Official Voting & Gemini AI Judge Portal

Official public voting web application and multi-pillar evaluation engine built for the **Genesis × Skelar Hackathon 2026**. Designed to run on **Google Cloud Run** with **Google Cloud Firestore** persistence and **Vertex AI (Gemini 2.5 Flash)** automated pitch transcript evaluation.

---

## 🌟 Key Capabilities

### 1. Three-Pillar Weighted Leaderboard
Every hackathon team is evaluated across three balanced scoring pillars (on a **1.0 to 5.0 scale** across 4 core criteria: *Innovation*, *Technical Depth*, *Business Impact*, and *Pitch Quality*):
- **A) Participant Votes (35% Weight)**: Peer voting from verified hackathon participants. Strictly enforces **Anti-Self-Voting** (participants select their team upon login and are cryptographically blocked from voting for their own team).
- **B) Gemini AI Judge (30% Weight)**: Automated AI evaluation using **Vertex AI (`gemini-2.5-flash`)** that analyzes team pitch transcripts, scores all 4 rubric dimensions (1–5), and synthesizes structured executive summaries, key strengths, and areas for improvement.
- **C) Special Jury Votes (35% Weight)**: High-weight evaluation from designated VIP Jury members and executives.

### 2. Primary Google OAuth 2.0 Authentication + Dynamic Setup
- **Sign in with Google (Primary)**: Full Google Identity Services (OAuth 2.0 JWT verification via `google-auth-library`).
- **Dynamic Live OAuth Client ID Configuration**: Organizers can configure or update the Google OAuth 2.0 Web Client ID directly from the UI modal or Admin Dashboard without rebuilding or redeploying the container.
- **Fallback Authentication Accordion**: Email & Password authentication and 1-click Demo Personas are tucked inside a collapsible fallback panel for rapid testing or external guest access.

### 3. Inline Team Management & Admin Controls
- **Inline Editing**: Team members can edit their own team's Name, Project Title, and Description directly on the project card. Admins can edit any team inline or delete teams.
- **Admin Control Panel**:
  - Toggle **Voting Open / Locked** status.
  - Reveal or hide **Live Leaderboard Standings** (Dramatic Podium Reveal mode).
  - Run or re-run **Gemini AI Judge** evaluations per team or in batch.
  - Pre-register users and dynamically assign roles (`PARTICIPANT`, `JURY`, `ADMIN`).

---

## 🏗️ Technical Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend SPA** | React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Backend API** | Node.js 22, Express.js, TypeScript (`tsx`) |
| **Authentication** | Google Identity Services (OAuth 2.0 ID Token Verification via `google-auth-library`) |
| **Database** | Google Cloud Firestore (`genesis_skelar_hackathon/master_state`) with local JSON fallback |
| **AI Evaluation** | Google Cloud Vertex AI (`@google/genai` SDK using `gemini-2.5-flash` with `responseSchema`) |
| **Hosting** | Google Cloud Run (Containerized multi-stage Docker build) |

---

## 🔐 Setting Up Google Sign-In (1-Minute GCP Console Guide)

To enable the **Google Identity Services** popup button on your live Cloud Run URL:

1. Open the [Google Cloud Console — Credentials Page](https://console.cloud.google.com/apis/credentials?project=claudiu-test-project-1).
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name it: `Genesis Skelar Hackathon Voting Portal`.
5. Under **Authorized JavaScript origins**, add your Cloud Run URL (and `http://localhost:8080` for local testing):
   - `https://genesis-skelar-voting-<hash>-ew.a.run.app`
6. Click **Create** and copy the generated **Client ID** (`xxxx.apps.googleusercontent.com`).
7. **Apply Immediately (No Redeploy Needed)**:
   - Open the live web app → Click **Sign in with Google** → Click **Configure Client ID** in the modal and paste your Client ID!
   - *(Alternatively, pass `GOOGLE_CLIENT_ID=<your-client-id>` as a Cloud Run environment variable).*

---

## 🚀 Deployment to Google Cloud Run

Deploy directly to Google Cloud Run using the included `deploy.sh` script or `gcloud` CLI:

```bash
gcloud run deploy genesis-skelar-voting \
  --source . \
  --project claudiu-test-project-1 \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=claudiu-test-project-1,USE_FIRESTORE=true,INITIAL_ADMIN_EMAIL=admin@genesis.tech,GOOGLE_CLOUD_LOCATION=us-central1"
```

---

## 💻 Local Development & Automated Testing

```bash
# Install dependencies
npm install

# Run automated E2E & Scoring unit tests (Vitest)
npm test

# Start full-stack development server (port 8080)
npm run dev
```
