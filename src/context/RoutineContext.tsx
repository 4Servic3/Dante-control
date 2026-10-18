import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  BreastSide,
  DiaperSubType,
  FeedingSubType,
  FraldaEvent,
  MamadaEvent,
  RotineStorageData,
  RoutineEvent,
  SonoEvent,
  TodaySummary,
  WakeWindowInfo,
  WakeWindowZone,
} from '../types/routine';
import {
  formatDurationMinutes,
  formatRelativeTimeSince,
  formatSecondsHuman,
  formatTimeHHMM,
  getLocalDateKey,
  getStartOfToday,
} from '../utils/dateHelpers';
import { supabase } from '../utils/supabase/client';

export const STORAGE_KEY = 'rotine_baby_data_v1';

export type SiriCommandKey =
  | 'mamar_esquerdo'
  | 'mamar_direito'
  | 'parar_mamada'
  | 'xixi'
  | 'coco'
  | 'xixi_coco'
  | 'dormiu'
  | 'acordou';

export interface SiriConfirmationBanner {
  command: string;
  title: string;
  detail: string;
  tone: 'amber' | 'emerald' | 'sky';
  timeFormatted: string;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function saveToLocalStorageImmediate(state: RotineStorageData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Erro ao salvar dados no localStorage:', err);
  }
}

async function syncStateToSupabase(state: RotineStorageData) {
  try {
    await supabase.from('routine_state').upsert(
      {
        id: 'default_baby',
        baby_name: state.babyProfile.name,
        payload: state,
        updated_at: state.updatedAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Caso a tabela ainda não tenha sido criada no Supabase, mantém offline no localStorage sem erros
  }
}

async function syncEventToSupabase(ev: RoutineEvent) {
  try {
    await supabase.from('routine_events').upsert(
      {
        id: ev.id,
        type: ev.type,
        date_key: ev.dateKey,
        timestamp: ev.timestamp,
        time_formatted: ev.timeFormatted,
        feeding_type: ev.type === 'mamada' ? ev.feedingType || 'peito' : null,
        breast: ev.type === 'mamada' ? ev.breast || null : null,
        volume_ml: ev.type === 'mamada' ? ev.volumeMl || null : null,
        diaper_type: ev.type === 'fralda' ? ev.diaperType : null,
        has_pee: ev.type === 'fralda' ? ev.hasPee : null,
        has_poop: ev.type === 'fralda' ? ev.hasPoop : null,
        start_time: ev.type === 'sono' ? ev.startTime : null,
        end_time: ev.type === 'sono' ? ev.endTime : null,
        duration_minutes: 'durationMinutes' in ev ? ev.durationMinutes : null,
        duration_seconds: 'durationSeconds' in ev ? ev.durationSeconds || null : null,
        notes: ev.notes || null,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Ignora silenciosamente se a tabela não existir ainda
  }
}

/**
 * Gera registros realistas para um dia anterior completo (24h de rotina de recém-nascido)
 * para que o painel do Pediatra (últimos 7 dias) já tenha histórico rico.
 */
function createPastDaySeedEvents(baseDate: Date, dayOffset: number): RoutineEvent[] {
  const dateKey = getLocalDateKey(baseDate);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  const atTime = (h: number, m: number) => new Date(year, month, day, h, m, 0, 0);

  const feedHours = [1, 4, 7, 10, 13, 16, 19, 22];
  const peeHours = [1, 4, 8, 11, 14, 17, 20];
  const sleepBlocks = [
    { startH: 1, startM: 30, dur: 150 + (dayOffset % 2) * 15 },
    { startH: 4, startM: 30, dur: 140 },
    { startH: 7, startM: 45, dur: 110 + (dayOffset % 3) * 10 },
    { startH: 10, startM: 45, dur: 115 },
    { startH: 14, startM: 0, dur: 105 },
    { startH: 17, startM: 0, dur: 95 },
    { startH: 20, startM: 0, dur: 135 },
  ];

  const events: RoutineEvent[] = [];

  feedHours.forEach((h, idx) => {
    const t = atTime(h, (idx * 7 + dayOffset * 5) % 45);
    const breast: BreastSide = (idx + dayOffset) % 2 === 0 ? 'Esquerdo' : 'Direito';
    const dur = 15 + ((idx + dayOffset) % 4) * 3;
    events.push({
      id: `seed_past_${dateKey}_mamada_${idx}`,
      type: 'mamada',
      feedingType: 'peito',
      dateKey,
      timestamp: t.toISOString(),
      timeFormatted: formatTimeHHMM(t),
      breast,
      durationMinutes: dur,
      durationSeconds: dur * 60,
    });
  });

  peeHours.forEach((h, idx) => {
    if (idx === 6 && dayOffset % 2 === 1) return;
    const t = atTime(h, 25);
    const hasPoop = idx % 2 === 0;
    const diaperType: DiaperSubType = hasPoop ? 'ambos' : 'xixi';
    events.push({
      id: `seed_past_${dateKey}_fralda_${idx}`,
      type: 'fralda',
      dateKey,
      timestamp: t.toISOString(),
      timeFormatted: formatTimeHHMM(t),
      diaperType,
      hasPee: true,
      hasPoop,
    });
  });

  sleepBlocks.forEach((b, idx) => {
    const start = atTime(b.startH, b.startM);
    const end = new Date(start.getTime() + b.dur * 60000);
    events.push({
      id: `seed_past_${dateKey}_sono_${idx}`,
      type: 'sono',
      dateKey,
      timestamp: end.toISOString(),
      timeFormatted: formatTimeHHMM(start),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationMinutes: b.dur,
      durationSeconds: b.dur * 60,
    });
  });

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Gera dados iniciais acolhedores para o dia de hoje + últimos 6 dias
 * caso o localStorage esteja vazio.
 */
function createInitialSeedData(now: Date = new Date()): RotineStorageData {
  const todayKey = getLocalDateKey(now);
  const startOfToday = getStartOfToday(now);
  const msSinceMidnight = now.getTime() - startOfToday.getTime();

  const minutesAgoToday = (minsAgo: number): Date => {
    const targetMs = now.getTime() - minsAgo * 60 * 1000;
    if (targetMs < startOfToday.getTime() + 60 * 1000) {
      return new Date(startOfToday.getTime() + Math.max(1, Math.floor(msSinceMidnight * 0.2)));
    }
    return new Date(targetMs);
  };

  const t1 = minutesAgoToday(360);
  const t2 = minutesAgoToday(240);
  const t3 = minutesAgoToday(150);
  const t4 = minutesAgoToday(80);

  const s1Start = minutesAgoToday(330);
  const s1End = minutesAgoToday(245);

  const s2Start = minutesAgoToday(210);
  const s2End = minutesAgoToday(115);

  const s3Start = minutesAgoToday(70);
  const s3End = minutesAgoToday(25);

  const rawEventsToday: RoutineEvent[] = [
    {
      id: 'mamada_seed_1',
      type: 'mamada',
      feedingType: 'peito',
      dateKey: todayKey,
      timestamp: t1.toISOString(),
      timeFormatted: formatTimeHHMM(t1),
      breast: 'Direito',
      durationMinutes: 18,
      durationSeconds: 18 * 60,
      notes: 'Mamada tranquila da madrugada',
    },
    {
      id: 'fralda_seed_1',
      type: 'fralda',
      dateKey: todayKey,
      timestamp: new Date(t1.getTime() + 15 * 60000).toISOString(),
      timeFormatted: formatTimeHHMM(new Date(t1.getTime() + 15 * 60000)),
      diaperType: 'xixi',
      hasPee: true,
      hasPoop: false,
    },
    {
      id: 'sono_seed_1',
      type: 'sono',
      dateKey: todayKey,
      timestamp: s1End.toISOString(),
      timeFormatted: formatTimeHHMM(s1Start),
      startTime: s1Start.toISOString(),
      endTime: s1End.toISOString(),
      durationMinutes: 85,
      durationSeconds: 85 * 60,
      notes: 'Dormiu no berço',
    },
    {
      id: 'mamada_seed_2',
      type: 'mamada',
      feedingType: 'peito',
      dateKey: todayKey,
      timestamp: t2.toISOString(),
      timeFormatted: formatTimeHHMM(t2),
      breast: 'Esquerdo',
      durationMinutes: 22,
      durationSeconds: 22 * 60,
    },
    {
      id: 'fralda_seed_2',
      type: 'fralda',
      dateKey: todayKey,
      timestamp: new Date(t2.getTime() + 20 * 60000).toISOString(),
      timeFormatted: formatTimeHHMM(new Date(t2.getTime() + 20 * 60000)),
      diaperType: 'ambos',
      hasPee: true,
      hasPoop: true,
      notes: 'Amarelo mostarda normal',
    },
    {
      id: 'sono_seed_2',
      type: 'sono',
      dateKey: todayKey,
      timestamp: s2End.toISOString(),
      timeFormatted: formatTimeHHMM(s2Start),
      startTime: s2Start.toISOString(),
      endTime: s2End.toISOString(),
      durationMinutes: 95,
      durationSeconds: 95 * 60,
    },
    {
      id: 'fralda_seed_3',
      type: 'fralda',
      dateKey: todayKey,
      timestamp: t3.toISOString(),
      timeFormatted: formatTimeHHMM(t3),
      diaperType: 'xixi',
      hasPee: true,
      hasPoop: false,
    },
    {
      id: 'mamada_seed_3',
      type: 'mamada',
      feedingType: 'peito',
      dateKey: todayKey,
      timestamp: t4.toISOString(),
      timeFormatted: formatTimeHHMM(t4),
      breast: 'Direito',
      durationMinutes: 16,
      durationSeconds: 16 * 60,
      notes: 'Boa pega, arrotou rápido',
    },
    {
      id: 'fralda_seed_4',
      type: 'fralda',
      dateKey: todayKey,
      timestamp: new Date(t4.getTime() + 10 * 60000).toISOString(),
      timeFormatted: formatTimeHHMM(new Date(t4.getTime() + 10 * 60000)),
      diaperType: 'xixi',
      hasPee: true,
      hasPoop: false,
    },
    {
      id: 'sono_seed_3',
      type: 'sono',
      dateKey: todayKey,
      timestamp: s3End.toISOString(),
      timeFormatted: formatTimeHHMM(s3Start),
      startTime: s3Start.toISOString(),
      endTime: s3End.toISOString(),
      durationMinutes: 45,
      durationSeconds: 45 * 60,
    },
  ];

  const eventsToday = [...rawEventsToday].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const daysMap: Record<string, RoutineEvent[]> = {
    [todayKey]: eventsToday,
  };

  for (let i = 1; i <= 6; i++) {
    const pastDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const pastKey = getLocalDateKey(pastDate);
    daysMap[pastKey] = createPastDaySeedEvents(pastDate, i);
  }

  return {
    version: 2,
    updatedAt: now.toISOString(),
    babyProfile: {
      name: 'Noah',
      birthDate: getLocalDateKey(new Date(now.getTime() - 14 * 86400000)),
      dailyPeeGoal: 6,
      dailyPeeMaxGoal: 8,
    },
    activeSleep: {
      isSleeping: false,
      startTime: null,
      startedAt: null,
    },
    activeFeeding: {
      isFeeding: false,
      lado: 'Esquerdo',
      breast: 'Esquerdo',
      startTime: null,
      startedAt: null,
      previousSideSaved: null,
    },
    days: daysMap,
  };
}

function normalizeStoredData(parsed: RotineStorageData): RotineStorageData {
  const feedingSide: BreastSide =
    parsed.activeFeeding?.lado || parsed.activeFeeding?.breast || 'Esquerdo';
  const feedingStartMs =
    typeof parsed.activeFeeding?.startTime === 'number'
      ? parsed.activeFeeding.startTime
      : parsed.activeFeeding?.startedAt
      ? new Date(parsed.activeFeeding.startedAt).getTime()
      : null;

  const sleepStartMs =
    typeof parsed.activeSleep?.startTime === 'number'
      ? parsed.activeSleep.startTime
      : parsed.activeSleep?.startedAt
      ? new Date(parsed.activeSleep.startedAt).getTime()
      : null;

  const updatedDays = { ...parsed.days };
  if ((parsed.version || 1) < 2 && Object.keys(updatedDays).length === 1) {
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const pastDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const pastKey = getLocalDateKey(pastDate);
      if (!updatedDays[pastKey]) {
        updatedDays[pastKey] = createPastDaySeedEvents(pastDate, i);
      }
    }
  }

  return {
    ...parsed,
    version: 2,
    days: updatedDays,
    babyProfile: {
      ...parsed.babyProfile,
      dailyPeeGoal: parsed.babyProfile?.dailyPeeGoal || 6,
      dailyPeeMaxGoal: parsed.babyProfile?.dailyPeeMaxGoal || 8,
    },
    activeFeeding: {
      isFeeding: Boolean(parsed.activeFeeding?.isFeeding && feedingStartMs),
      lado: feedingSide,
      breast: feedingSide,
      startTime: feedingStartMs,
      startedAt: feedingStartMs ? new Date(feedingStartMs).toISOString() : null,
      previousSideSaved: parsed.activeFeeding?.previousSideSaved || null,
    },
    activeSleep: {
      isSleeping: Boolean(parsed.activeSleep?.isSleeping && sleepStartMs),
      startTime: sleepStartMs,
      startedAt: sleepStartMs ? new Date(sleepStartMs).toISOString() : null,
    },
  };
}

function calculateWakeWindowInfo(
  allEventsSorted: RoutineEvent[],
  now: Date,
  manualWakeOverrideMs: number | null
): WakeWindowInfo {
  const lastSleep = allEventsSorted.find((ev): ev is SonoEvent => ev.type === 'sono');
  const lastFeeding = allEventsSorted.find((ev): ev is MamadaEvent => ev.type === 'mamada');

  let referenceMs: number | null = manualWakeOverrideMs;

  if (!referenceMs) {
    const sleepEndMs = lastSleep
      ? new Date(lastSleep.endTime || lastSleep.timestamp).getTime()
      : null;
    const feedEndMs = lastFeeding ? new Date(lastFeeding.timestamp).getTime() : null;

    if (sleepEndMs && feedEndMs) {
      if (sleepEndMs >= feedEndMs) {
        referenceMs = sleepEndMs;
      } else if (now.getTime() - sleepEndMs <= 120 * 60000) {
        referenceMs = sleepEndMs;
      } else {
        referenceMs = feedEndMs;
      }
    } else {
      referenceMs = sleepEndMs ?? feedEndMs ?? null;
    }
  }

  if (!referenceMs) {
    return {
      awakeMinutes: 0,
      awakeFormatted: 'Recém-acordado',
      zone: 'tranquila',
      statusLabel: 'Janela tranquila',
      statusSubtext: 'Menos de 45 min acordado • Bebê descansado e receptivo',
      sinceTimeFormatted: null,
    };
  }

  const diffMs = Math.max(0, now.getTime() - referenceMs);
  const awakeMinutes = Math.floor(diffMs / 60000);
  const sinceTimeFormatted = formatTimeHHMM(new Date(referenceMs));

  let awakeFormatted = `${awakeMinutes} min`;
  if (awakeMinutes < 1) {
    awakeFormatted = 'Agora mesmo (0 min)';
  } else if (awakeMinutes >= 60) {
    const h = Math.floor(awakeMinutes / 60);
    const m = awakeMinutes % 60;
    awakeFormatted = m > 0 ? `${h}h ${m}m (${awakeMinutes} min)` : `${h}h (${awakeMinutes} min)`;
  }

  let zone: WakeWindowZone = 'tranquila';
  let statusLabel = 'Janela tranquila';
  let statusSubtext = 'Menos de 45 min acordado • Momento calmo para amamentar e trocar';

  if (awakeMinutes >= 45 && awakeMinutes <= 60) {
    zone = 'preparar';
    statusLabel = 'Hora de preparar para dormir';
    statusSubtext = 'Entre 45 e 60 min acordado • Diminua luzes e estímulos agora';
  } else if (awakeMinutes > 60) {
    zone = 'passou';
    statusLabel = 'Passou da janela - risco de efeito vulcão/cansaço excessivo';
    statusSubtext = 'Acima de 60 min acordado • Acolha no escuro para reduzir o cortisol';
  }

  return {
    awakeMinutes,
    awakeFormatted,
    zone,
    statusLabel,
    statusSubtext,
    sinceTimeFormatted,
  };
}

export interface ManualEventInput {
  type: 'mamada' | 'fralda' | 'sono';
  timeHHMM: string;
  feedingType?: FeedingSubType;
  breast?: BreastSide;
  durationMinutes?: number;
  volumeMl?: number;
  diaperType?: DiaperSubType;
  endTimeHHMM?: string;
  notes?: string;
}

interface RoutineContextType {
  data: RotineStorageData;
  now: Date;
  todayKey: string;
  todayEvents: RoutineEvent[];
  allEventsSorted: RoutineEvent[];
  todaySummary: TodaySummary;
  // Siri Deep Link Banner & Trigger
  siriConfirmationBanner: SiriConfirmationBanner | null;
  dismissSiriBanner: () => void;
  executeSiriCommand: (siriParam: string) => void;
  // Ações de Amamentação e Mamadeira
  addMamada: (breast: BreastSide, durationMinutes?: number, notes?: string) => MamadaEvent;
  addMamadeira: (volumeMl: number, notes?: string) => MamadaEvent;
  startFeedingTimer: (lado: BreastSide) => void;
  switchBreastAndSaveFirst: () => MamadaEvent | null;
  stopFeedingTimer: (notes?: string) => MamadaEvent | null;
  cancelFeedingTimer: () => void;
  // Ações de Fralda
  addFralda: (diaperType: DiaperSubType, notes?: string) => FraldaEvent;
  // Ações de Sono e Janela de Sono
  toggleSleep: (notes?: string) => SonoEvent | null;
  addManualSono: (durationMinutes: number, notes?: string) => SonoEvent;
  setWakeMinutesAgoOverride: (minutesAgo: number | null) => void;
  // Adicionar manualmente em qualquer horário de hoje
  addManualEventToday: (input: ManualEventInput) => RoutineEvent;
  // Gerenciamento de registros
  deleteEvent: (id: string, dateKey: string) => void;
  resetToSampleData: () => void;
  clearAllRecords: () => void;
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined);

export const RoutineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<RotineStorageData>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RotineStorageData;
        if (parsed && parsed.days && parsed.babyProfile) {
          const normalized = normalizeStoredData(parsed);
          saveToLocalStorageImmediate(normalized);
          return normalized;
        }
      }
    } catch (err) {
      console.error('Erro ao ler dados do localStorage:', err);
    }
    const seed = createInitialSeedData(new Date());
    saveToLocalStorageImmediate(seed);
    return seed;
  });

  const [now, setNow] = useState<Date>(() => new Date());
  const [manualWakeOverrideMs, setManualWakeOverrideMs] = useState<number | null>(null);
  const [siriConfirmationBanner, setSiriConfirmationBanner] =
    useState<SiriConfirmationBanner | null>(null);

  useEffect(() => {
    saveToLocalStorageImmediate(data);
    void syncStateToSupabase(data);
  }, [data]);

  // Busca estado salvo no Supabase ao iniciar caso exista na nuvem
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from('routine_state')
          .select('payload, updated_at')
          .eq('id', 'default_baby')
          .maybeSingle();

        if (!error && row?.payload && isMounted) {
          const remoteState = normalizeStoredData(row.payload as RotineStorageData);
          setData((localPrev) => {
            const remoteTime = new Date(remoteState.updatedAt || 0).getTime();
            const localTime = new Date(localPrev.updatedAt || 0).getTime();
            if (remoteTime > localTime) {
              saveToLocalStorageImmediate(remoteState);
              return remoteState;
            }
            return localPrev;
          });
        }
      } catch {
        // Permanece usando localStorage caso offline ou tabela ainda não criada
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncClockOnWake = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
      }
    };
    window.addEventListener('focus', syncClockOnWake);
    document.addEventListener('visibilitychange', syncClockOnWake);
    return () => {
      window.removeEventListener('focus', syncClockOnWake);
      document.removeEventListener('visibilitychange', syncClockOnWake);
    };
  }, []);

  useEffect(() => {
    const isTimerRunning = data.activeSleep.isSleeping || data.activeFeeding.isFeeding;
    const intervalMs = isTimerRunning ? 1000 : 15000;
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [data.activeSleep.isSleeping, data.activeFeeding.isFeeding]);

  const todayKey = useMemo(() => getLocalDateKey(now), [now]);

  const todayEvents = useMemo(() => {
    const list = data.days[todayKey] || [];
    return [...list].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [data.days, todayKey]);

  const allEventsSorted = useMemo(() => {
    const all: RoutineEvent[] = [];
    Object.values(data.days).forEach((dayEvents) => {
      all.push(...dayEvents);
    });
    return all.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [data.days]);

  const todaySummary: TodaySummary = useMemo(() => {
    const lastAnyFeeding = allEventsSorted.find(
      (ev): ev is MamadaEvent => ev.type === 'mamada'
    );

    const lastBreastFeeding = allEventsSorted.find(
      (ev): ev is MamadaEvent =>
        ev.type === 'mamada' &&
        (ev.feedingType === 'peito' || !ev.feedingType) &&
        Boolean(ev.breast)
    );

    let timeSinceLastFeedingText = 'Sem registro';
    let minutesSinceLastFeeding: number | null = null;
    let lastBreastUsed: BreastSide | null = null;
    let suggestedNextBreast: BreastSide = 'Esquerdo';

    if (lastAnyFeeding) {
      const rel = formatRelativeTimeSince(lastAnyFeeding.timestamp, now);
      timeSinceLastFeedingText = rel.text;
      minutesSinceLastFeeding = rel.minutes;
    }

    if (lastBreastFeeding && lastBreastFeeding.breast) {
      lastBreastUsed = lastBreastFeeding.breast;
      suggestedNextBreast =
        lastBreastFeeding.breast === 'Esquerdo' ? 'Direito' : 'Esquerdo';
    }

    const todayDiapers = todayEvents.filter(
      (ev): ev is FraldaEvent => ev.type === 'fralda'
    );
    const peeCountToday = todayDiapers.filter((d) => d.hasPee).length;
    const poopCountToday = todayDiapers.filter((d) => d.hasPoop).length;

    const startOfTodayMs = getStartOfToday(now).getTime();
    const todaySleeps = todayEvents.filter(
      (ev): ev is SonoEvent => ev.type === 'sono'
    );

    let totalSleepMinutesToday = todaySleeps.reduce(
      (acc, s) => acc + (s.durationMinutes || 0),
      0
    );

    const activeSleepStartMs =
      data.activeSleep.startTime ??
      (data.activeSleep.startedAt ? new Date(data.activeSleep.startedAt).getTime() : null);

    if (data.activeSleep.isSleeping && activeSleepStartMs) {
      const effectiveStartMs = Math.max(startOfTodayMs, activeSleepStartMs);
      const activeMins = Math.max(
        0,
        Math.floor((now.getTime() - effectiveStartMs) / 60000)
      );
      totalSleepMinutesToday += activeMins;
    }

    const todayFeedings = todayEvents.filter(
      (e): e is MamadaEvent => e.type === 'mamada'
    );
    const feedingCountToday = todayFeedings.length;
    const formulaMlToday = todayFeedings
      .filter((f) => f.feedingType === 'mamadeira')
      .reduce((acc, f) => acc + (f.volumeMl || 0), 0);

    const wakeWindow = calculateWakeWindowInfo(
      allEventsSorted,
      now,
      manualWakeOverrideMs
    );

    return {
      timeSinceLastFeedingText,
      minutesSinceLastFeeding,
      lastBreastUsed,
      suggestedNextBreast,
      peeCountToday,
      peeGoal: data.babyProfile.dailyPeeGoal || 6,
      peeMaxGoal: data.babyProfile.dailyPeeMaxGoal || 8,
      poopCountToday,
      totalSleepMinutesToday,
      totalSleepFormatted: formatDurationMinutes(totalSleepMinutesToday),
      sleepStatus: data.activeSleep.isSleeping ? 'Dormindo' : 'Acordado',
      wakeWindow,
      feedingCountToday,
      formulaMlToday,
    };
  }, [
    allEventsSorted,
    todayEvents,
    now,
    data.activeSleep,
    data.babyProfile.dailyPeeGoal,
    data.babyProfile.dailyPeeMaxGoal,
    manualWakeOverrideMs,
  ]);

  const insertEvent = useCallback((newEvent: RoutineEvent) => {
    void syncEventToSupabase(newEvent);
    setData((prev) => {
      const existingDayList = prev.days[newEvent.dateKey] || [];
      const updatedDayList = [newEvent, ...existingDayList].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const nextState: RotineStorageData = {
        ...prev,
        updatedAt: new Date().toISOString(),
        days: {
          ...prev.days,
          [newEvent.dateKey]: updatedDayList,
        },
      };
      saveToLocalStorageImmediate(nextState);
      return nextState;
    });
  }, []);

  const addMamada = useCallback(
    (breast: BreastSide, durationMinutes = 15, notes?: string): MamadaEvent => {
      const current = new Date();
      const dateKey = getLocalDateKey(current);
      const newEvent: MamadaEvent = {
        id: generateId('mamada'),
        type: 'mamada',
        feedingType: 'peito',
        dateKey,
        timestamp: current.toISOString(),
        timeFormatted: formatTimeHHMM(current),
        breast,
        durationMinutes,
        durationSeconds: durationMinutes * 60,
        ...(notes ? { notes } : {}),
      };
      insertEvent(newEvent);
      setNow(current);
      return newEvent;
    },
    [insertEvent]
  );

  const addMamadeira = useCallback(
    (volumeMl: number, notes?: string): MamadaEvent => {
      const current = new Date();
      const dateKey = getLocalDateKey(current);
      const newEvent: MamadaEvent = {
        id: generateId('mamadeira'),
        type: 'mamada',
        feedingType: 'mamadeira',
        dateKey,
        timestamp: current.toISOString(),
        timeFormatted: formatTimeHHMM(current),
        volumeMl,
        durationMinutes: 10,
        ...(notes ? { notes } : {}),
      };
      insertEvent(newEvent);
      setNow(current);
      return newEvent;
    },
    [insertEvent]
  );

  const startFeedingTimer = useCallback((lado: BreastSide) => {
    const startMs = Date.now();
    const current = new Date(startMs);
    setNow(current);
    setData((prev) => {
      const nextState: RotineStorageData = {
        ...prev,
        updatedAt: current.toISOString(),
        activeFeeding: {
          isFeeding: true,
          lado,
          breast: lado,
          startTime: startMs,
          startedAt: current.toISOString(),
          previousSideSaved: null,
        },
      };
      saveToLocalStorageImmediate(nextState);
      return nextState;
    });
  }, []);

  const switchBreastAndSaveFirst = useCallback((): MamadaEvent | null => {
    const active = data.activeFeeding;
    const startMs =
      active.startTime ?? (active.startedAt ? new Date(active.startedAt).getTime() : null);

    if (!active.isFeeding || !startMs) {
      return null;
    }

    const nowMs = Date.now();
    const end = new Date(nowMs);
    const elapsedSeconds = Math.max(1, Math.floor((nowMs - startMs) / 1000));
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const currentSide: BreastSide = active.lado || active.breast;
    const nextSide: BreastSide = currentSide === 'Esquerdo' ? 'Direito' : 'Esquerdo';
    const dateKey = getLocalDateKey(end);

    const firstBreastEvent: MamadaEvent = {
      id: generateId('mamada'),
      type: 'mamada',
      feedingType: 'peito',
      dateKey,
      timestamp: end.toISOString(),
      timeFormatted: formatTimeHHMM(end),
      breast: currentSide,
      durationMinutes,
      durationSeconds: elapsedSeconds,
      notes: `1º lado antes de trocar para o Peito ${nextSide}`,
    };

    void syncEventToSupabase(firstBreastEvent);

    setData((prev) => {
      const existingDayList = prev.days[dateKey] || [];
      const nextState: RotineStorageData = {
        ...prev,
        updatedAt: end.toISOString(),
        activeFeeding: {
          isFeeding: true,
          lado: nextSide,
          breast: nextSide,
          startTime: nowMs,
          startedAt: end.toISOString(),
          previousSideSaved: {
            lado: currentSide,
            durationSeconds: elapsedSeconds,
            durationMinutes,
          },
        },
        days: {
          ...prev.days,
          [dateKey]: [firstBreastEvent, ...existingDayList],
        },
      };
      saveToLocalStorageImmediate(nextState);
      return nextState;
    });

    setNow(end);
    return firstBreastEvent;
  }, [data.activeFeeding]);

  const cancelFeedingTimer = useCallback(() => {
    setData((prev) => {
      const nextState: RotineStorageData = {
        ...prev,
        activeFeeding: {
          ...prev.activeFeeding,
          isFeeding: false,
          startTime: null,
          startedAt: null,
          previousSideSaved: null,
        },
      };
      saveToLocalStorageImmediate(nextState);
      return nextState;
    });
  }, []);

  const stopFeedingTimer = useCallback(
    (notes?: string): MamadaEvent | null => {
      const active = data.activeFeeding;
      const startMs =
        active.startTime ??
        (active.startedAt ? new Date(active.startedAt).getTime() : null);

      if (!active.isFeeding || !startMs) {
        return null;
      }

      const endMs = Date.now();
      const end = new Date(endMs);
      const elapsedSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));
      const diffMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const currentSide: BreastSide = active.lado || active.breast;
      const nextSide: BreastSide = currentSide === 'Esquerdo' ? 'Direito' : 'Esquerdo';
      const dateKey = getLocalDateKey(end);

      const newEvent: MamadaEvent = {
        id: generateId('mamada'),
        type: 'mamada',
        feedingType: 'peito',
        dateKey,
        timestamp: end.toISOString(),
        timeFormatted: formatTimeHHMM(end),
        breast: currentSide,
        durationMinutes: diffMinutes,
        durationSeconds: elapsedSeconds,
        ...(notes ? { notes } : {}),
      };

      void syncEventToSupabase(newEvent);

      setData((prev) => {
        const existingDayList = prev.days[dateKey] || [];
        const nextState: RotineStorageData = {
          ...prev,
          updatedAt: end.toISOString(),
          activeFeeding: {
            isFeeding: false,
            lado: nextSide,
            breast: nextSide,
            startTime: null,
            startedAt: null,
            previousSideSaved: null,
          },
          days: {
            ...prev.days,
            [dateKey]: [newEvent, ...existingDayList],
          },
        };
        saveToLocalStorageImmediate(nextState);
        return nextState;
      });

      setNow(end);
      return newEvent;
    },
    [data.activeFeeding]
  );

  const addFralda = useCallback(
    (diaperType: DiaperSubType, notes?: string): FraldaEvent => {
      const current = new Date();
      const dateKey = getLocalDateKey(current);
      const newEvent: FraldaEvent = {
        id: generateId('fralda'),
        type: 'fralda',
        dateKey,
        timestamp: current.toISOString(),
        timeFormatted: formatTimeHHMM(current),
        diaperType,
        hasPee: diaperType === 'xixi' || diaperType === 'ambos',
        hasPoop: diaperType === 'coco' || diaperType === 'ambos',
        ...(notes ? { notes } : {}),
      };
      insertEvent(newEvent);
      setNow(current);
      return newEvent;
    },
    [insertEvent]
  );

  const toggleSleep = useCallback(
    (notes?: string): SonoEvent | null => {
      const nowMs = Date.now();
      const current = new Date(nowMs);
      setNow(current);

      if (!data.activeSleep.isSleeping) {
        setData((prev) => {
          const nextState: RotineStorageData = {
            ...prev,
            updatedAt: current.toISOString(),
            activeSleep: {
              isSleeping: true,
              startTime: nowMs,
              startedAt: current.toISOString(),
            },
          };
          saveToLocalStorageImmediate(nextState);
          return nextState;
        });
        return null;
      } else {
        const startMs =
          data.activeSleep.startTime ??
          (data.activeSleep.startedAt
            ? new Date(data.activeSleep.startedAt).getTime()
            : nowMs);
        const start = new Date(startMs);
        const elapsedSeconds = Math.max(1, Math.floor((nowMs - startMs) / 1000));
        const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
        const dateKey = getLocalDateKey(current);

        const newSleepEvent: SonoEvent = {
          id: generateId('sono'),
          type: 'sono',
          dateKey,
          timestamp: current.toISOString(),
          timeFormatted: formatTimeHHMM(start),
          startTime: start.toISOString(),
          endTime: current.toISOString(),
          durationMinutes,
          durationSeconds: elapsedSeconds,
          ...(notes ? { notes } : {}),
        };

        void syncEventToSupabase(newSleepEvent);
        setManualWakeOverrideMs(nowMs);

        setData((prev) => {
          const existingDayList = prev.days[dateKey] || [];
          const nextState: RotineStorageData = {
            ...prev,
            updatedAt: current.toISOString(),
            activeSleep: {
              isSleeping: false,
              startTime: null,
              startedAt: null,
            },
            days: {
              ...prev.days,
              [dateKey]: [newSleepEvent, ...existingDayList],
            },
          };
          saveToLocalStorageImmediate(nextState);
          return nextState;
        });
        return newSleepEvent;
      }
    },
    [data.activeSleep]
  );

  const addManualSono = useCallback(
    (durationMinutes: number, notes?: string): SonoEvent => {
      const end = new Date();
      const start = new Date(end.getTime() - durationMinutes * 60000);
      const dateKey = getLocalDateKey(end);

      const newSleepEvent: SonoEvent = {
        id: generateId('sono'),
        type: 'sono',
        dateKey,
        timestamp: end.toISOString(),
        timeFormatted: formatTimeHHMM(start),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes,
        durationSeconds: durationMinutes * 60,
        ...(notes ? { notes } : {}),
      };

      setManualWakeOverrideMs(end.getTime());
      insertEvent(newSleepEvent);
      setNow(end);
      return newSleepEvent;
    },
    [insertEvent]
  );

  const addManualEventToday = useCallback(
    (input: ManualEventInput): RoutineEvent => {
      const current = new Date();
      const dateKey = getLocalDateKey(current);
      const [hh, mm] = (input.timeHHMM || formatTimeHHMM(current))
        .split(':')
        .map((n) => parseInt(n, 10) || 0);

      const eventDate = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate(),
        hh,
        mm,
        0,
        0
      );
      const timeFormatted = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

      if (input.type === 'mamada') {
        const isBottle = input.feedingType === 'mamadeira';
        const dur = Math.max(1, input.durationMinutes || 15);
        const newMamada: MamadaEvent = {
          id: generateId('mamada_manual'),
          type: 'mamada',
          feedingType: isBottle ? 'mamadeira' : 'peito',
          dateKey,
          timestamp: eventDate.toISOString(),
          timeFormatted,
          ...(isBottle
            ? { volumeMl: input.volumeMl || 60 }
            : { breast: input.breast || 'Esquerdo' }),
          durationMinutes: dur,
          durationSeconds: dur * 60,
          ...(input.notes ? { notes: input.notes } : {}),
        };
        insertEvent(newMamada);
        setNow(new Date());
        return newMamada;
      }

      if (input.type === 'fralda') {
        const dType: DiaperSubType = input.diaperType || 'xixi';
        const newFralda: FraldaEvent = {
          id: generateId('fralda_manual'),
          type: 'fralda',
          dateKey,
          timestamp: eventDate.toISOString(),
          timeFormatted,
          diaperType: dType,
          hasPee: dType === 'xixi' || dType === 'ambos',
          hasPoop: dType === 'coco' || dType === 'ambos',
          ...(input.notes ? { notes: input.notes } : {}),
        };
        insertEvent(newFralda);
        setNow(new Date());
        return newFralda;
      }

      let endDate: Date;
      let durationMinutes = Math.max(1, input.durationMinutes || 60);

      if (input.endTimeHHMM) {
        const [endH, endM] = input.endTimeHHMM
          .split(':')
          .map((n) => parseInt(n, 10) || 0);
        endDate = new Date(
          current.getFullYear(),
          current.getMonth(),
          current.getDate(),
          endH,
          endM,
          0,
          0
        );
        if (endDate.getTime() <= eventDate.getTime()) {
          endDate = new Date(eventDate.getTime() + durationMinutes * 60000);
        } else {
          durationMinutes = Math.max(
            1,
            Math.round((endDate.getTime() - eventDate.getTime()) / 60000)
          );
        }
      } else {
        endDate = new Date(eventDate.getTime() + durationMinutes * 60000);
      }

      const newSono: SonoEvent = {
        id: generateId('sono_manual'),
        type: 'sono',
        dateKey,
        timestamp: endDate.toISOString(),
        timeFormatted,
        startTime: eventDate.toISOString(),
        endTime: endDate.toISOString(),
        durationMinutes,
        durationSeconds: durationMinutes * 60,
        ...(input.notes ? { notes: input.notes } : {}),
      };
      insertEvent(newSono);
      setNow(new Date());
      return newSono;
    },
    [insertEvent]
  );

  // Executa qualquer comando vindo de ?siri=... e exibe o Banner Grande de Confirmação no topo
  const executeSiriCommand = useCallback(
    (rawCommand: string) => {
      const cmd = rawCommand.trim().toLowerCase();
      const nowTime = new Date();
      const timeFormatted = formatTimeHHMM(nowTime);

      if (cmd === 'mamar_esquerdo') {
        if (!data.activeFeeding.isFeeding) {
          startFeedingTimer('Esquerdo');
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: Mamada iniciada no Peito Esquerdo',
            detail: `Cronômetro ativado às ${timeFormatted}.`,
            tone: 'amber',
            timeFormatted,
          });
        } else {
          setSiriConfirmationBanner({
            command: cmd,
            title: `Siri: Cronômetro já está rodando (Peito ${data.activeFeeding.lado})`,
            detail: 'A mamada atual continuou em andamento sem reiniciar.',
            tone: 'amber',
            timeFormatted,
          });
        }
      } else if (cmd === 'mamar_direito') {
        if (!data.activeFeeding.isFeeding) {
          startFeedingTimer('Direito');
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: Mamada iniciada no Peito Direito',
            detail: `Cronômetro ativado às ${timeFormatted}.`,
            tone: 'amber',
            timeFormatted,
          });
        } else {
          setSiriConfirmationBanner({
            command: cmd,
            title: `Siri: Cronômetro já está rodando (Peito ${data.activeFeeding.lado})`,
            detail: 'A mamada atual continuou em andamento sem reiniciar.',
            tone: 'amber',
            timeFormatted,
          });
        }
      } else if (cmd === 'parar_mamada') {
        if (data.activeFeeding.isFeeding) {
          const saved = stopFeedingTimer('Finalizada via comando da Siri');
          const durText = saved
            ? formatSecondsHuman(saved.durationSeconds, saved.durationMinutes)
            : '';
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: Mamada finalizada e salva!',
            detail: saved
              ? `Peito ${saved.breast} (${durText}) registrado no histórico às ${timeFormatted}.`
              : `Mamada encerrada às ${timeFormatted}.`,
            tone: 'amber',
            timeFormatted,
          });
        } else {
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: Nenhuma mamada ativa no momento',
            detail: 'Use "Mamar Peito Esquerdo" ou "Direito" para iniciar.',
            tone: 'amber',
            timeFormatted,
          });
        }
      } else if (cmd === 'xixi') {
        addFralda('xixi', 'Registrado via Siri');
        setSiriConfirmationBanner({
          command: cmd,
          title: 'Siri: Fralda de Xixi registrada!',
          detail: `Só Xixi salvo às ${timeFormatted} (+1 na meta de hidratação).`,
          tone: 'emerald',
          timeFormatted,
        });
      } else if (cmd === 'coco') {
        addFralda('coco', 'Registrado via Siri');
        setSiriConfirmationBanner({
          command: cmd,
          title: 'Siri: Fralda de Cocô registrada!',
          detail: `Só Cocô salvo no histórico às ${timeFormatted}.`,
          tone: 'emerald',
          timeFormatted,
        });
      } else if (cmd === 'xixi_coco') {
        addFralda('ambos', 'Registrado via Siri');
        setSiriConfirmationBanner({
          command: cmd,
          title: 'Siri: Fralda de Xixi + Cocô registrada!',
          detail: `Xixi + Cocô salvo às ${timeFormatted} (+1 na meta de hidratação).`,
          tone: 'emerald',
          timeFormatted,
        });
      } else if (cmd === 'dormiu') {
        if (!data.activeSleep.isSleeping) {
          toggleSleep();
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: Cronômetro de Sono iniciado!',
            detail: `O bebê dormiu às ${timeFormatted}.`,
            tone: 'sky',
            timeFormatted,
          });
        } else {
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: O cronômetro de sono já estava ativo',
            detail: 'O bebê já está marcado como Dormindo.',
            tone: 'sky',
            timeFormatted,
          });
        }
      } else if (cmd === 'acordou') {
        if (data.activeSleep.isSleeping) {
          const savedSleep = toggleSleep('Finalizado via comando da Siri');
          const durText = savedSleep
            ? formatSecondsHuman(savedSleep.durationSeconds, savedSleep.durationMinutes)
            : '';
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: O Bebê Acordou • Sono salvo!',
            detail: savedSleep
              ? `Soneca de ${durText} registrada no histórico às ${timeFormatted}.`
              : `Ciclo de sono encerrado às ${timeFormatted}.`,
            tone: 'sky',
            timeFormatted,
          });
        } else {
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: O bebê já estava marcado como Acordado',
            detail: 'Nenhum cronômetro de sono estava rodando.',
            tone: 'sky',
            timeFormatted,
          });
        }
      }

      // Limpa a URL imediatamente para não repetir a ação se a página for recarregada
      try {
        window.history.replaceState({}, '', '/');
      } catch (err) {
        console.error('Erro ao limpar URL:', err);
      }
    },
    [
      data.activeFeeding.isFeeding,
      data.activeFeeding.lado,
      data.activeSleep.isSleeping,
      startFeedingTimer,
      stopFeedingTimer,
      addFralda,
      toggleSleep,
    ]
  );

  // Escuta parâmetros ?siri=... na URL ao carregar o aplicativo
  const hasProcessedInitialUrlRef = useRef(false);
  useEffect(() => {
    if (hasProcessedInitialUrlRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const siriParam = params.get('siri');
    if (siriParam) {
      hasProcessedInitialUrlRef.current = true;
      executeSiriCommand(siriParam);
    }
  }, [executeSiriCommand]);

  const dismissSiriBanner = useCallback(() => {
    setSiriConfirmationBanner(null);
  }, []);

  const setWakeMinutesAgoOverride = useCallback((minutesAgo: number | null) => {
    const current = new Date();
    setNow(current);
    if (minutesAgo === null) {
      setManualWakeOverrideMs(null);
    } else {
      setManualWakeOverrideMs(current.getTime() - minutesAgo * 60000);
    }
  }, []);

  const deleteEvent = useCallback((id: string, dateKey: string) => {
    void (async () => {
      try {
        await supabase.from('routine_events').delete().eq('id', id);
      } catch {
        // Ignora caso offline ou tabela ainda não criada
      }
    })();
    setData((prev) => {
      const dayList = prev.days[dateKey] || [];
      const filtered = dayList.filter((item) => item.id !== id);
      const nextState: RotineStorageData = {
        ...prev,
        updatedAt: new Date().toISOString(),
        days: {
          ...prev.days,
          [dateKey]: filtered,
        },
      };
      saveToLocalStorageImmediate(nextState);
      return nextState;
    });
  }, []);

  const resetToSampleData = useCallback(() => {
    const current = new Date();
    const freshSeed = createInitialSeedData(current);
    saveToLocalStorageImmediate(freshSeed);
    setManualWakeOverrideMs(null);
    setData(freshSeed);
    setNow(current);
  }, []);

  const clearAllRecords = useCallback(() => {
    const current = new Date();
    setManualWakeOverrideMs(null);
    setData((prev) => {
      const nextState: RotineStorageData = {
        ...prev,
        updatedAt: current.toISOString(),
        activeSleep: { isSleeping: false, startTime: null, startedAt: null },
        activeFeeding: {
          isFeeding: false,
          lado: 'Esquerdo',
          breast: 'Esquerdo',
          startTime: null,
          startedAt: null,
          previousSideSaved: null,
        },
        days: {},
      };
      saveToLocalStorageImmediate(nextState);
      return nextState;
    });
    setNow(current);
  }, []);

  const value = useMemo(
    () => ({
      data,
      now,
      todayKey,
      todayEvents,
      allEventsSorted,
      todaySummary,
      siriConfirmationBanner,
      dismissSiriBanner,
      executeSiriCommand,
      addMamada,
      addMamadeira,
      startFeedingTimer,
      switchBreastAndSaveFirst,
      stopFeedingTimer,
      cancelFeedingTimer,
      addFralda,
      toggleSleep,
      addManualSono,
      setWakeMinutesAgoOverride,
      addManualEventToday,
      deleteEvent,
      resetToSampleData,
      clearAllRecords,
    }),
    [
      data,
      now,
      todayKey,
      todayEvents,
      allEventsSorted,
      todaySummary,
      siriConfirmationBanner,
      dismissSiriBanner,
      executeSiriCommand,
      addMamada,
      addMamadeira,
      startFeedingTimer,
      switchBreastAndSaveFirst,
      stopFeedingTimer,
      cancelFeedingTimer,
      addFralda,
      toggleSleep,
      addManualSono,
      setWakeMinutesAgoOverride,
      addManualEventToday,
      deleteEvent,
      resetToSampleData,
      clearAllRecords,
    ]
  );

  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>;
};

export function useRoutine(): RoutineContextType {
  const ctx = useContext(RoutineContext);
  if (!ctx) {
    throw new Error('useRoutine deve ser utilizado dentro de um RoutineProvider');
  }
  return ctx;
}
