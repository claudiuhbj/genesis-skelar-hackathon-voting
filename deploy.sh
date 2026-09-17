#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-claudiu-test-project-1}"
SERVICE_NAME="genesis-skelar-voting"
REGION="${REGION:-europe-west1}"
ADMIN_EMAIL="${INITIAL_ADMIN_EMAIL:-admin@genesis.tech}"

echo "🚀 Deploying Genesis x Skelar Hackathon Voting Portal to Google Cloud Run..."
echo "📌 Target GCP Project: ${PROJECT_ID}"
echo "📌 Region: ${REGION}"

gcloud config set project "${PROJECT_ID}"

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},USE_FIRESTORE=true,INITIAL_ADMIN_EMAIL=${ADMIN_EMAIL},GOOGLE_CLOUD_LOCATION=us-central1"

echo "✅ Deployment complete! Service URL:"
gcloud run services describe "${SERVICE_NAME}" --project "${PROJECT_ID}" --region "${REGION}" --format='value(status.url)'
