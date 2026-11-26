import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type User } from 'firebase/auth';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  onDisconnect,
  serverTimestamp,
  type Database,
  type Unsubscribe,
} from 'firebase/database';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
} from 'firebase/app-check';
import { DUEL_ALGO_VERSION, type DuelMode } from '@/core/duel';

// Public Firebase Web Config for project `loixua-33681` (same RTDB as iOS/Android)
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || 'AIzaSyBLs6HEhmUkKMeUvRjRzugIGxRKYdlaAJI',
  authDomain: 'loixua-33681.firebaseapp.com',
  databaseURL: 'https://loixua-33681-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'loixua-33681',
  storageBucket: 'loixua-33681.firebasestorage.app',
  messagingSenderId: '263588340830',
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || '1:263588340830:web:42daea5f35b16afccec0cf',
  measurementId: import.meta.env.PUBLIC_GA_MEASUREMENT_ID || 'G-Q8Q80FWC3F',
};

let appInstance: FirebaseApp | null = null;
let appCheckInitialized = false;

function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
    const siteKey =
      import.meta.env.PUBLIC_FIREBASE_APP_CHECK_SITE_KEY ||
      '6Ld1RDMuAAAAADS9y4cqLcLImIpfVQKWxkrA3EG_';
    if (siteKey && !appCheckInitialized && typeof window !== 'undefined') {
      appCheckInitialized = true;
      const providerType = import.meta.env.PUBLIC_FIREBASE_APP_CHECK_PROVIDER;
      const provider =
        providerType === 'v3'
          ? new ReCaptchaV3Provider(siteKey)
          : new ReCaptchaEnterpriseProvider(siteKey);
      try {
        initializeAppCheck(appInstance, {
          provider,
          isTokenAutoRefreshEnabled: true,
        });
      } catch {
        // Ignore blocked App Check init so Unenforced RTDB fallback continues working
      }
    }
  }
  return appInstance;
}

function getDb(): Database {
  return getDatabase(getFirebaseApp());
}

async function ensureAnonUser(): Promise<User> {
  const auth = getAuth(getFirebaseApp());
  if (auth.currentUser) return auth.currentUser;
  const res = await withTimeout(signInAnonymously(auth), 10_000);
  return res.user;
}

function withTimeout<T>(promise: Promise<T>, ms = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      (val) => {
        window.clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export interface RemotePlayerData {
  name: string;
  joinedAt: number;
  index: number;
  score: number;
  totalMs: number;
  finished: boolean;
  left: boolean;
}

export interface RemoteRoomData {
  seed: number;
  mode: DuelMode;
  algoVersion: number;
  datasetVersion: string;
  hostUid: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  expiresAt: number;
  players: Record<string, RemotePlayerData>;
}

export async function hostCreateRoom(params: {
  code: string;
  seed: number;
  mode: DuelMode;
  personaId: string;
  datasetVersion: string;
  onGuestJoined: (guestUid: string, guestData: RemotePlayerData) => void;
}): Promise<{ uid: string; cleanup: () => void }> {
  const user = await ensureAnonUser();
  const db = getDb();
  const roomRef = ref(db, `rooms/${params.code}`);
  const nowMs = Date.now();
  const expiresAtMs = nowMs + 7_140_000;

  await withTimeout(
    set(roomRef, {
      seed: params.seed,
      mode: params.mode,
      algoVersion: DUEL_ALGO_VERSION,
      datasetVersion: params.datasetVersion,
      hostUid: user.uid,
      status: 'waiting',
      createdAt: serverTimestamp(),
      expiresAt: expiresAtMs,
      players: {
        [user.uid]: {
          name: params.personaId,
          joinedAt: serverTimestamp(),
          index: 0,
          score: 0,
          totalMs: 0,
          finished: false,
          left: false,
        },
      },
    })
  );

  const leftRef = ref(db, `rooms/${params.code}/players/${user.uid}/left`);
  const disconnectHandle = onDisconnect(leftRef);
  await disconnectHandle.set(true).catch(() => {});

  const playersRef = ref(db, `rooms/${params.code}/players`);
  const unsub = onChildAdded(playersRef, (snap) => {
    if (snap.key && snap.key !== user.uid && snap.val()) {
      params.onGuestJoined(snap.key, snap.val() as RemotePlayerData);
    }
  });

  return {
    uid: user.uid,
    cleanup: () => {
      unsub();
      disconnectHandle.cancel().catch(() => {});
    },
  };
}

export async function guestJoinRoom(params: {
  code: string;
  personaId: string;
  localDatasetVersion: string;
}): Promise<{ uid: string; room: RemoteRoomData; opponentUid: string }> {
  const user = await ensureAnonUser();
  const db = getDb();
  const roomRef = ref(db, `rooms/${params.code}`);
  const snap = await withTimeout(get(roomRef));

  if (!snap.exists()) {
    throw new Error(`Không tìm thấy phòng thi đấu '${params.code}'.`);
  }
  const room = snap.val() as RemoteRoomData;

  if (room.status !== 'waiting') {
    throw new Error(
      room.status === 'finished' ? 'Phòng thi đấu này đã kết thúc.' : 'Trận đấu trong phòng này đã bắt đầu.'
    );
  }
  if (room.expiresAt && room.expiresAt < Date.now()) {
    throw new Error('Phòng thi đấu này đã hết hạn.');
  }
  const playerEntries = Object.entries(room.players || {});
  if (playerEntries.length >= 2 && !room.players[user.uid]) {
    throw new Error('Phòng thi đấu đã đủ 2 người chơi.');
  }
  if (room.algoVersion !== DUEL_ALGO_VERSION || room.datasetVersion !== params.localDatasetVersion) {
    throw new Error(
      `Phiên bản dữ liệu hoặc luật chơi khác nhau (Phòng: v${room.datasetVersion} / algo ${room.algoVersion}, Web: v${params.localDatasetVersion} / algo ${DUEL_ALGO_VERSION}).`
    );
  }

  await withTimeout(
    set(ref(db, `rooms/${params.code}/players/${user.uid}`), {
      name: params.personaId,
      joinedAt: serverTimestamp(),
      index: 0,
      score: 0,
      totalMs: 0,
      finished: false,
      left: false,
    })
  );

  const leftRef = ref(db, `rooms/${params.code}/players/${user.uid}/left`);
  onDisconnect(leftRef)
    .set(true)
    .catch(() => {});

  return { uid: user.uid, room, opponentUid: room.hostUid };
}

export function subscribeOpponent(
  code: string,
  opponentUid: string,
  cb: (data: RemotePlayerData) => void
): Unsubscribe {
  const db = getDb();
  return onValue(ref(db, `rooms/${code}/players/${opponentUid}`), (snap) => {
    if (snap.exists()) cb(snap.val() as RemotePlayerData);
  });
}

export function subscribeRoomStatus(
  code: string,
  cb: (status: RemoteRoomData['status']) => void
): Unsubscribe {
  const db = getDb();
  return onValue(ref(db, `rooms/${code}/status`), (snap) => {
    if (snap.exists()) cb(snap.val() as RemoteRoomData['status']);
  });
}

export function setRoomStatus(code: string, status: RemoteRoomData['status']) {
  const db = getDb();
  return set(ref(db, `rooms/${code}/status`), status).catch(() => {});
}

export function updatePlayerProgress(
  code: string,
  uid: string,
  payload: { index: number; score: number; totalMs: number; finished: boolean; left?: boolean }
) {
  const db = getDb();
  return update(ref(db, `rooms/${code}/players/${uid}`), payload).catch(() => {});
}

export function removeHostedRoom(code: string) {
  const db = getDb();
  return remove(ref(db, `rooms/${code}`)).catch(() => {});
}
