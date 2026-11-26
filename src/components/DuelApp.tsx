import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Bot,
  Check,
  Clock,
  Copy,
  Globe,
  LogOut,
  RotateCcw,
  Share2,
  Swords,
  Trophy,
  UserCheck,
} from 'lucide-react';
import {
  answerMilliseconds,
  BOT_PERSONA,
  checkDuelCompatibility,
  computeBotAnswers,
  computeDuelOutcome,
  decodeDuelChallenge,
  DUEL_PERSONAS,
  duelQuestions,
  encodeDuelChallenge,
  findDuelPersona,
  makeDuelSeed,
  makeRoomCode,
  normalizeRoomCode,
  type BotAnswer,
  type DuelMode,
  type DuelOutcome,
  type DuelPersona,
} from '@/core/duel';
import { questionTimeLimit, type VerseQuizQuestion } from '@/core/verse-quiz';
import type { Saying } from '@/core/types';
import { loadClientBundle } from '@/lib/client-bundle';
import {
  guestJoinRoom,
  hostCreateRoom,
  removeHostedRoom,
  setRoomStatus,
  subscribeOpponent,
  subscribeRoomStatus,
  updatePlayerProgress,
} from '@/lib/firebase-duel';

type MatchPhase = 'lobby' | 'waiting' | 'countdown' | 'playing' | 'waitingOpponent' | 'finished';

interface PlayerProgress {
  persona: DuelPersona;
  score: number;
  completed: number;
  totalMs: number;
  finished: boolean;
  left: boolean;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export default function DuelApp() {
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [datasetVersion, setDatasetVersion] = useState<string>('');
  const [phase, setPhase] = useState<MatchPhase>('lobby');
  const [mode, setMode] = useState<DuelMode>('standard');
  const [myPersona, setMyPersona] = useState<DuelPersona>(DUEL_PERSONAS[0]);
  const [joinInput, setJoinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [seed, setSeed] = useState(0);
  const [questions, setQuestions] = useState<VerseQuizQuestion[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [qIndex, setQIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState(6);
  const [timeLeft, setTimeLeft] = useState(6);
  const [pickedOpt, setPickedOpt] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Array<number | null>>([]);

  const [myProgress, setMyProgress] = useState<PlayerProgress>({
    persona: DUEL_PERSONAS[0],
    score: 0,
    completed: 0,
    totalMs: 0,
    finished: false,
    left: false,
  });
  const [oppProgress, setOppProgress] = useState<PlayerProgress>({
    persona: BOT_PERSONA,
    score: 0,
    completed: 0,
    totalMs: 0,
    finished: false,
    left: false,
  });

  const [botAnswers, setBotAnswers] = useState<BotAnswer[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [outcome, setOutcome] = useState<DuelOutcome>('tie');

  const cleanupRefs = useRef<Array<() => void>>([]);
  const firebaseCtx = useRef<{ code: string; uid: string; isHost: boolean } | null>(null);
  const questionStartRef = useRef<number>(0);

  const clearListeners = () => {
    cleanupRefs.current.forEach((fn) => fn());
    cleanupRefs.current = [];
  };

  useEffect(() => {
    loadClientBundle().then((b) => {
      setSayings(b.sayings);
      setDatasetVersion(b.datasetVersion);
    });
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('join');
    if (codeParam) {
      setJoinInput(codeParam);
    }
    return () => {
      clearListeners();
      if (firebaseCtx.current?.isHost) {
        removeHostedRoom(firebaseCtx.current.code);
      }
    };
  }, []);

  useEffect(() => {
    if (phase === 'waiting' && roomCode) {
      const shareUrl = `https://tmkstudio.io.vn/d/${roomCode}`;
      QRCode.toDataURL(shareUrl, { width: 220, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [phase, roomCode]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      setQIndex(0);
      if (questions[0]) {
        const lim = questionTimeLimit(questions[0], mode === 'challenge');
        setTimeLimit(lim);
        setTimeLeft(lim);
        questionStartRef.current = performance.now();
      }
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 850);
    return () => window.clearTimeout(timer);
  }, [phase, countdown, questions, mode]);

  useEffect(() => {
    if (phase !== 'playing' || oppProgress.persona.id !== BOT_PERSONA.id || botAnswers.length === 0) return;
    let cancelled = false;
    let totalElapsed = 0;
    const timers: number[] = [];

    botAnswers.forEach((ans, idx) => {
      totalElapsed += ans.milliseconds;
      const t = window.setTimeout(() => {
        if (cancelled) return;
        setOppProgress((prev) => ({
          ...prev,
          completed: idx + 1,
          score: prev.score + (ans.correct ? 1 : 0),
          totalMs: prev.totalMs + ans.milliseconds,
          finished: idx === botAnswers.length - 1,
        }));
      }, totalElapsed);
      timers.push(t);
    });

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [phase, oppProgress.persona.id, botAnswers]);

  useEffect(() => {
    if (phase !== 'waitingOpponent') return;
    if (oppProgress.finished || oppProgress.left || oppProgress.persona.id === BOT_PERSONA.id) {
      finalizeMatch(myProgress, oppProgress);
    }
  }, [phase, oppProgress.finished, oppProgress.left]);

  useEffect(() => {
    if (phase !== 'playing' || pickedOpt !== null || !questions[qIndex]) return;
    const started = performance.now();
    questionStartRef.current = started;
    const t = window.setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      const rem = Math.max(0, timeLimit - elapsed);
      setTimeLeft(rem);
      if (rem <= 0) {
        window.clearInterval(t);
        handleAnswer(null, true);
      }
    }, 60);
    return () => window.clearInterval(t);
  }, [phase, qIndex, pickedOpt, timeLimit]);

  useEffect(() => {
    if (phase !== 'playing' || pickedOpt !== null || !questions[qIndex]) return;
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = Number(e.key) - 1;
        if (optIdx < questions[qIndex].options.length) {
          e.preventDefault();
          handleAnswer(optIdx);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const finalizeMatch = (me: PlayerProgress, opp: PlayerProgress) => {
    let finalOpp = opp;
    if (opp.persona.id === BOT_PERSONA.id && !opp.finished && botAnswers.length > 0) {
      finalOpp = {
        ...opp,
        score: botAnswers.filter((b) => b.correct).length,
        completed: botAnswers.length,
        totalMs: botAnswers.reduce((acc, b) => acc + b.milliseconds, 0),
        finished: true,
      };
      setOppProgress(finalOpp);
    }
    setOutcome(
      computeDuelOutcome(
        { score: me.score, totalMilliseconds: me.totalMs },
        { score: finalOpp.score, totalMilliseconds: finalOpp.totalMs }
      )
    );
    if (firebaseCtx.current?.isHost) {
      setRoomStatus(firebaseCtx.current.code, 'finished');
    }
    setPhase('finished');
  };

  const handleStartBot = (customSeed?: number, customCode?: string) => {
    if (sayings.length === 0) return;
    clearListeners();
    firebaseCtx.current = null;
    setErrorMsg(null);

    const matchSeed = customSeed ?? makeDuelSeed();
    const qs = duelQuestions(sayings, matchSeed);
    if (qs.length === 0) return;

    setRoomCode(customCode ?? makeRoomCode());
    setIsHost(false);
    setSeed(matchSeed);
    setQuestions(qs);
    setUserAnswers([]);
    setPickedOpt(null);
    setMyProgress({ persona: myPersona, score: 0, completed: 0, totalMs: 0, finished: false, left: false });
    setOppProgress({ persona: BOT_PERSONA, score: 0, completed: 0, totalMs: 0, finished: false, left: false });
    setBotAnswers(computeBotAnswers(qs, matchSeed, mode));
    setCountdown(3);
    setPhase('countdown');
  };

  const handleCreateRoom = async () => {
    if (sayings.length === 0 || busy) return;
    setBusy(true);
    setErrorMsg(null);
    clearListeners();

    const code = makeRoomCode();
    const matchSeed = makeDuelSeed();
    const qs = duelQuestions(sayings, matchSeed);

    try {
      const { uid, cleanup } = await hostCreateRoom({
        code,
        seed: matchSeed,
        mode,
        personaId: myPersona.id,
        datasetVersion,
        onGuestJoined: (guestUid, guestData) => {
          const guestPersona = findDuelPersona(guestData.name) ?? DUEL_PERSONAS[1];
          setOppProgress({
            persona: guestPersona,
            score: 0,
            completed: 0,
            totalMs: 0,
            finished: false,
            left: false,
          });
          setRoomStatus(code, 'playing');
          const unsubOpp = subscribeOpponent(code, guestUid, (data) => {
            setOppProgress((prev) => ({
              ...prev,
              completed: data.index ?? prev.completed,
              score: data.score ?? prev.score,
              totalMs: data.totalMs ?? prev.totalMs,
              finished: Boolean(data.finished),
              left: Boolean(data.left),
            }));
          });
          cleanupRefs.current.push(unsubOpp);
          setCountdown(3);
          setPhase('countdown');
        },
      });
      cleanupRefs.current.push(cleanup);
      firebaseCtx.current = { code, uid, isHost: true };

      setRoomCode(code);
      setIsHost(true);
      setSeed(matchSeed);
      setQuestions(qs);
      setUserAnswers([]);
      setPickedOpt(null);
      setMyProgress({ persona: myPersona, score: 0, completed: 0, totalMs: 0, finished: false, left: false });
      setOppProgress({ persona: BOT_PERSONA, score: 0, completed: 0, totalMs: 0, finished: false, left: false });
      setPhase('waiting');
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message === 'TIMEOUT'
          ? 'Không kết nối được máy chủ đấu. Kiểm tra lại mạng hoặc thử Đấu với Máy.'
          : 'Không thể tạo phòng đấu trực tuyến lúc này. Bạn có thể chọn Đấu với Máy.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleJoinRoom = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (sayings.length === 0 || busy) return;
    setErrorMsg(null);

    const challenge = decodeDuelChallenge(joinInput);
    if (challenge) {
      if (checkDuelCompatibility(challenge.algoVersion, challenge.datasetVersion, datasetVersion) === 'versionMismatch') {
        setErrorMsg(`Lời thách đấu này dùng dữ liệu v${challenge.datasetVersion} (Web đang dùng v${datasetVersion}).`);
        return;
      }
      const qs = duelQuestions(sayings, challenge.seed);
      const oppP = findDuelPersona(challenge.personaID) ?? DUEL_PERSONAS[1];
      setMode(challenge.mode);
      setRoomCode(encodeDuelChallenge(challenge));
      setIsHost(false);
      setSeed(challenge.seed);
      setQuestions(qs);
      setUserAnswers([]);
      setPickedOpt(null);
      setBotAnswers([]);
      setMyProgress({ persona: myPersona, score: 0, completed: 0, totalMs: 0, finished: false, left: false });
      setOppProgress({
        persona: oppP,
        score: challenge.score,
        completed: qs.length,
        totalMs: challenge.totalMilliseconds,
        finished: true,
        left: false,
      });
      setCountdown(3);
      setPhase('countdown');
      return;
    }

    let raw = joinInput.trim();
    const urlMatch = raw.match(/\/d\/([A-Za-z0-9]+)/);
    if (urlMatch) raw = urlMatch[1];
    const normalized = normalizeRoomCode(raw);
    if (!normalized) {
      setErrorMsg('Mã phòng không đúng định dạng 6 ký tự hoặc mã thách đấu.');
      return;
    }

    setBusy(true);
    clearListeners();
    try {
      const { uid, room, opponentUid } = await guestJoinRoom({
        code: normalized,
        personaId: myPersona.id,
        localDatasetVersion: datasetVersion,
      });
      firebaseCtx.current = { code: normalized, uid, isHost: false };
      const qs = duelQuestions(sayings, room.seed);
      const hostName = room.players?.[opponentUid]?.name ?? 'co-trang';
      const hostPersona = findDuelPersona(hostName) ?? DUEL_PERSONAS[1];

      setMode(room.mode);
      setRoomCode(normalized);
      setIsHost(false);
      setSeed(room.seed);
      setQuestions(qs);
      setUserAnswers([]);
      setPickedOpt(null);
      setBotAnswers([]);
      setMyProgress({ persona: myPersona, score: 0, completed: 0, totalMs: 0, finished: false, left: false });
      setOppProgress({ persona: hostPersona, score: 0, completed: 0, totalMs: 0, finished: false, left: false });

      const unsubStatus = subscribeRoomStatus(normalized, (st) => {
        if (st === 'playing') {
          setCountdown(3);
          setPhase('countdown');
        }
      });
      const unsubOpp = subscribeOpponent(normalized, opponentUid, (data) => {
        setOppProgress((prev) => ({
          ...prev,
          completed: data.index ?? prev.completed,
          score: data.score ?? prev.score,
          totalMs: data.totalMs ?? prev.totalMs,
          finished: Boolean(data.finished),
          left: Boolean(data.left),
        }));
      });
      cleanupRefs.current.push(unsubStatus, unsubOpp);

      setPhase('waiting');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tham gia phòng đấu.');
    } finally {
      setBusy(false);
    }
  };

  const handleAnswer = (optIdx: number | null, timedOut = false) => {
    if (pickedOpt !== null || phase !== 'playing') return;
    const q = questions[qIndex];
    if (!q) return;

    setPickedOpt(optIdx ?? -1);
    const elapsedSec = (performance.now() - questionStartRef.current) / 1000;
    const ms = answerMilliseconds(elapsedSec, timeLimit, timedOut);
    const isCorrect = optIdx !== null && optIdx === q.correctIndex;
    const isLast = qIndex + 1 >= questions.length;

    const nextMe: PlayerProgress = {
      ...myProgress,
      completed: qIndex + 1,
      score: myProgress.score + (isCorrect ? 1 : 0),
      totalMs: myProgress.totalMs + ms,
      finished: isLast,
    };
    setMyProgress(nextMe);
    setUserAnswers((prev) => [...prev, optIdx]);

    if (firebaseCtx.current) {
      updatePlayerProgress(firebaseCtx.current.code, firebaseCtx.current.uid, {
        index: nextMe.completed,
        score: nextMe.score,
        totalMs: nextMe.totalMs,
        finished: isLast,
      });
    }

    window.setTimeout(() => {
      if (isLast) {
        if (oppProgress.persona.id === BOT_PERSONA.id || oppProgress.finished || oppProgress.left) {
          finalizeMatch(nextMe, oppProgress);
        } else {
          setPhase('waitingOpponent');
          window.setTimeout(() => {
            setPhase((curr) => {
              if (curr === 'waitingOpponent') {
                finalizeMatch(nextMe, oppProgress);
              }
              return curr;
            });
          }, 45_000);
        }
      } else {
        const nextIdx = qIndex + 1;
        const lim = questionTimeLimit(questions[nextIdx], mode === 'challenge');
        setQIndex(nextIdx);
        setPickedOpt(null);
        setTimeLimit(lim);
        setTimeLeft(lim);
      }
    }, 650);
  };

  const handleLeave = () => {
    clearListeners();
    if (firebaseCtx.current?.isHost) {
      removeHostedRoom(firebaseCtx.current.code);
    }
    firebaseCtx.current = null;
    setPhase('lobby');
    setErrorMsg(null);
  };

  const challengeLink =
    phase === 'finished' && datasetVersion
      ? `https://tmkstudio.io.vn/d/${encodeDuelChallenge({
          seed,
          mode,
          personaID: myPersona.id,
          score: myProgress.score,
          totalMilliseconds: myProgress.totalMs,
          datasetVersion,
          algoVersion: 2,
        })}`
      : '';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="border-b pb-5 flex flex-wrap items-end justify-between gap-3" style={{ borderColor: 'var(--cdv-border)' }}>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
            Đấu trường 1v1
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
            Đấu nối vế trực tuyến
          </h1>
          <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            So tài 20 câu liên tiếp cùng bạn bè trên iOS, Android và Web — hoặc đấu nhanh với Máy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {phase === 'lobby' ? (
            <>
              <a href="/do-vui-hom-nay" className="cdv-btn-secondary text-xs">Đố nhanh mỗi ngày</a>
              <a href="/do-vui" className="cdv-btn-secondary text-xs">Luyện solo 20 câu</a>
            </>
          ) : (
            <button type="button" onClick={handleLeave} className="cdv-btn-secondary text-xs">
              <LogOut size={14} aria-hidden="true" />
              <span>Rời phòng</span>
            </button>
          )}
        </div>
      </header>

      {errorMsg && (
        <div role="alert" className="cdv-surface p-4 text-xs font-medium" style={{ borderColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-cinnabar-text)' }}>
          {errorMsg}
        </div>
      )}

      {phase === 'lobby' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Left: Persona & Speed Mode */}
          <div className="cdv-surface p-6 space-y-6">
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
                1. Chọn danh hiệu nhân vật
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {DUEL_PERSONAS.map((p) => {
                  const selected = myPersona.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setMyPersona(p)}
                      className="px-3 py-2.5 rounded-lg border text-left cursor-pointer text-xs flex items-center gap-2"
                      style={
                        selected
                          ? { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 12%, var(--cdv-elevated))', fontWeight: 700 }
                          : { borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }
                      }
                    >
                      <UserCheck size={14} style={{ color: selected ? 'var(--cdv-cinnabar-text)' : 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--cdv-border)' }}>
              <h2 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
                2. Tốc độ trận đấu
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { id: 'standard', title: 'Tiêu chuẩn', desc: '4.5s – 9s mỗi câu' },
                    { id: 'challenge', title: 'Thử thách', desc: 'Nhanh hơn 40% (3s – 5.5s)' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className="p-3.5 rounded-lg border text-left cursor-pointer"
                    style={
                      mode === m.id
                        ? { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 10%, var(--cdv-elevated))' }
                        : { borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }
                    }
                  >
                    <p className="font-bold text-sm m-0">{m.title}</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--cdv-text-secondary)' }}>{m.desc}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Match Entry */}
          <div className="space-y-4">
            <div className="cdv-surface p-6 space-y-3">
              <h2 className="text-sm font-bold m-0">Khởi tạo trận đấu</h2>
              <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
                Tạo phòng Online lấy mã 6 ký tự và mã QR cho bạn bè vào đấu cùng lúc.
              </p>
              <div className="grid gap-2 pt-1">
                <button
                  type="button"
                  disabled={sayings.length === 0 || busy}
                  onClick={handleCreateRoom}
                  className="cdv-btn-primary text-xs w-full py-2.5"
                >
                  <Globe size={15} aria-hidden="true" />
                  <span>{busy ? 'Đang tạo phòng...' : 'Tạo phòng đấu Online 1v1'}</span>
                </button>
                <button
                  type="button"
                  disabled={sayings.length === 0 || busy}
                  onClick={() => handleStartBot()}
                  className="cdv-btn-secondary text-xs w-full py-2.5"
                >
                  <Bot size={15} aria-hidden="true" />
                  <span>Đấu ngay với Máy</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="cdv-surface p-6 space-y-3">
              <h2 className="text-sm font-bold m-0">Tham gia bằng mã hoặc link thách đấu</h2>
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Mã 6 ký tự (ABC234) hoặc link C2_..."
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm font-mono"
                style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
              />
              <button
                type="submit"
                disabled={!joinInput.trim() || busy}
                className={`${joinInput.trim() ? 'cdv-btn-primary' : 'cdv-btn-secondary opacity-55 cursor-not-allowed'} text-xs w-full py-2.5`}
              >
                <Swords size={14} aria-hidden="true" />
                <span>Vào phòng thi đấu</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="cdv-surface p-8 text-center space-y-5 max-w-xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
            {isHost ? 'Đang chờ đối thủ vào phòng' : 'Đã vào phòng — Đang chờ bắt đầu'}
          </p>
          <div className="cdv-elevated px-6 py-4 inline-flex items-center gap-3">
            <p className="text-3xl font-mono font-bold tracking-[0.25em] m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
              {roomCode}
            </p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(roomCode).catch(() => {});
                setCopiedCode(true);
                window.setTimeout(() => setCopiedCode(false), 1800);
              }}
              aria-label="Sao chép mã phòng"
              title="Sao chép mã phòng"
              className="p-2 rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-card)', color: 'var(--cdv-text)' }}
            >
              {copiedCode ? <Check size={15} style={{ color: 'var(--cdv-bamboo-text)' }} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            </button>
          </div>
          {isHost && qrDataUrl && (
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt={`Mã QR phòng ${roomCode}`} width={180} height={180} className="rounded-xl bg-white p-2" />
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`https://tmkstudio.io.vn/d/${roomCode}`).catch(() => {});
                    setCopiedCode(true);
                    window.setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="cdv-btn-secondary text-xs"
                >
                  {copiedCode ? <Check size={14} style={{ color: 'var(--cdv-bamboo-text)' }} /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Đã chép link mời' : 'Link chung (App + Web)'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/dau?code=${roomCode}`).catch(() => {});
                    setCopiedChallenge(true);
                    window.setTimeout(() => setCopiedChallenge(false), 2000);
                  }}
                  className="cdv-btn-secondary text-xs"
                >
                  {copiedChallenge ? <Check size={14} style={{ color: 'var(--cdv-bamboo-text)' }} /> : <Share2 size={14} />}
                  <span>{copiedChallenge ? 'Đã chép link Web' : 'Link trực tiếp Web'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (firebaseCtx.current?.isHost) removeHostedRoom(firebaseCtx.current.code);
                    handleStartBot(seed, roomCode);
                  }}
                  className="cdv-btn-secondary text-xs"
                >
                  <Bot size={14} />
                  <span>Đấu với Máy ngay</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'countdown' && (
        <div className="cdv-surface p-12 text-center space-y-4 max-w-xl mx-auto">
          <p className="text-sm font-semibold m-0">
            {myProgress.persona.name} vs {oppProgress.persona.name}
          </p>
          <p className="text-6xl font-bold tabular-nums m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
            {countdown > 0 ? countdown : 'Bắt đầu'}
          </p>
        </div>
      )}

      {(phase === 'playing' || phase === 'waitingOpponent') && questions[qIndex] && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="cdv-surface p-4 grid grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold tabular-nums">
                <span>{myProgress.persona.name} (Bạn)</span>
                <span>{myProgress.score}/20</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cdv-border)' }}>
                <div className="h-full transition-all" style={{ width: `${(myProgress.completed / questions.length) * 100}%`, backgroundColor: 'var(--cdv-cinnabar-text)' }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold tabular-nums">
                <span>{oppProgress.persona.name}</span>
                <span>{oppProgress.score}/20</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cdv-border)' }}>
                <div className="h-full transition-all" style={{ width: `${(oppProgress.completed / questions.length) * 100}%`, backgroundColor: 'var(--cdv-indigo-text)' }} />
              </div>
            </div>
          </div>

          {phase === 'waitingOpponent' ? (
            <div className="cdv-surface p-10 text-center space-y-3">
              <p className="font-bold text-base m-0">Bạn đã hoàn thành 20/20 câu!</p>
              <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
                Đang chờ {oppProgress.persona.name} hoàn tất ({oppProgress.completed}/20)...
              </p>
              <button type="button" onClick={() => finalizeMatch(myProgress, oppProgress)} className="cdv-btn-secondary text-xs">
                Xem kết quả ngay
              </button>
            </div>
          ) : (
            <div className="cdv-surface p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
                <span>Câu {qIndex + 1}/{questions.length}</span>
                <span className="inline-flex items-center gap-1" style={{ color: timeLeft <= 2 ? 'var(--cdv-cinnabar-text)' : 'var(--cdv-text-secondary)' }}>
                  <Clock size={14} aria-hidden="true" />
                  <span>{timeLeft.toFixed(1)}s</span>
                </span>
              </div>
              <p className="cdv-poem cdv-poem-hero font-medium text-center m-0 py-3">
                {questions[qIndex].prompt}, …
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {questions[qIndex].options.map((opt, idx) => {
                  const isPicked = pickedOpt === idx;
                  const isRight = idx === questions[qIndex].correctIndex;
                  let style: React.CSSProperties = {
                    borderColor: 'var(--cdv-border)',
                    backgroundColor: 'var(--cdv-elevated)',
                    color: 'var(--cdv-text)',
                  };
                  if (pickedOpt !== null) {
                    if (isRight) style = { borderColor: 'var(--cdv-bamboo-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-bamboo-text) 16%, var(--cdv-elevated))', fontWeight: 600 };
                    else if (isPicked) style = { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 16%, var(--cdv-elevated))' };
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={pickedOpt !== null}
                      onClick={() => handleAnswer(idx)}
                      className="p-4 rounded-xl border text-left text-sm sm:text-base cursor-pointer flex items-start gap-3"
                      style={style}
                    >
                      <span className="px-2 py-0.5 rounded border text-xs font-mono shrink-0 mt-0.5" style={{ borderColor: 'var(--cdv-border)' }}>
                        {OPTION_KEYS[idx]}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              <p className="hidden sm:block text-center text-xs m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
                Mẹo: Nhấn phím <kbd className="font-mono px-1 border rounded">1</kbd> – <kbd className="font-mono px-1 border rounded">4</kbd> để chọn nhanh đáp án.
              </p>
            </div>
          )}
        </div>
      )}

      {phase === 'finished' && (
        <div className="cdv-surface p-6 sm:p-8 space-y-6 cdv-animate-pop">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--cdv-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 12%, transparent)', color: 'var(--cdv-cinnabar-text)' }}>
                <Trophy size={28} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold m-0">
                  {outcome === 'win' ? 'Chiến thắng!' : outcome === 'tie' ? 'Hòa nhau!' : 'Chưa thắng — thử lại nhé!'}
                </h2>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--cdv-text-secondary)' }}>
                  So tài {questions.length} câu ({mode === 'challenge' ? 'Chế độ Thử thách' : 'Chế độ Tiêu chuẩn'})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {challengeLink && (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(challengeLink).catch(() => {});
                    setCopiedChallenge(true);
                    window.setTimeout(() => setCopiedChallenge(false), 2000);
                  }}
                  className="cdv-btn-secondary text-xs"
                >
                  {copiedChallenge ? <Check size={14} style={{ color: 'var(--cdv-bamboo-text)' }} /> : <Share2 size={14} />}
                  <span>{copiedChallenge ? 'Đã chép link thách đấu' : 'Thách đấu bạn bè'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => (oppProgress.persona.id === BOT_PERSONA.id ? handleStartBot() : handleCreateRoom())}
                className="cdv-btn-primary text-xs"
              >
                <RotateCcw size={14} />
                <span>Đấu lại</span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-center">
            <div className="cdv-elevated p-5">
              <p className="text-xs font-semibold m-0">{myProgress.persona.name} (Bạn)</p>
              <p className="text-3xl font-bold tabular-nums m-0 mt-1" style={{ color: 'var(--cdv-cinnabar-text)' }}>{myProgress.score}/20</p>
              <p className="text-xs tabular-nums m-0 mt-1" style={{ color: 'var(--cdv-text-secondary)' }}>
                {(myProgress.totalMs / 1000).toFixed(1)}s tổng thời gian
              </p>
            </div>
            <div className="cdv-elevated p-5">
              <p className="text-xs font-semibold m-0">{oppProgress.persona.name}</p>
              <p className="text-3xl font-bold tabular-nums m-0 mt-1" style={{ color: 'var(--cdv-indigo-text)' }}>{oppProgress.score}/20</p>
              <p className="text-xs tabular-nums m-0 mt-1" style={{ color: 'var(--cdv-text-secondary)' }}>
                {(oppProgress.totalMs / 1000).toFixed(1)}s tổng thời gian
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
              Xem lại 20 câu
            </h3>
            <div className="grid gap-2.5 md:grid-cols-2">
              {questions.map((q, i) => {
                const s = sayings.find((x) => x.id === q.sayingID);
                const ok = userAnswers[i] === q.correctIndex;
                return (
                  <div key={i} className="cdv-elevated p-3.5 text-xs flex items-center justify-between gap-2">
                    <span>
                      <strong style={{ color: ok ? 'var(--cdv-bamboo-text)' : 'var(--cdv-cinnabar-text)' }}>{ok ? 'Đúng' : 'Sai'}</strong> · {q.prompt} — {q.options[q.correctIndex]}
                    </span>
                    {s && (
                      <a href={`/cau/${s.slug || s.id}`} className="underline shrink-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                        Xem
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
