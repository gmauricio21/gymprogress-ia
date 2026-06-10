import { readFileSync } from 'fs';
import { join } from 'path';
import {
  cert,
  getApps,
  initializeApp,
  ServiceAccount,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountPath = join(process.cwd(), 'firebase-service-account.json');

const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, 'utf8'),
) as ServiceAccount;

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
