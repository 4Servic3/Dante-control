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

// Chaves antigas de teste que são limpas na inicialização
const LEGACY_STORAGE_KEYS = [
  'rotine_baby_data_v1',
  'rotine_baby_data',
  'rotine_seed_data',
];

// Cache local limpo (sem nenhum dado fictício/mock) espelhado com o Supabase
const SUPABASE_CACHE_KEY = 'rotine_supabase_mirror_v3';

export type SiriCommandKey =
  | 'mamar'
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

interface BabyEventRow {
  id: string;
  type: 'mamada' | 'fralda' | 'sono';
  subtype: 'esquerdo' | 'direito' | 'mamadeira' | 'xixi' | 'coco' | 'xixi_coco' | null;
  start_time: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  amount_ml?: number | null;
  created_at?: string;
}

interface BabyActiveStateRow {
  id: number;
  feeding_active: boolean;
  feeding_side: 'esquerdo' | 'direito' | null;
  feeding_start_time: string | null;
  sleeping_active: boolean;
  sleeping_start_time: string | null;
  last_breast_side: 'esquerdo' | 'direito' | null;
  updated_at?: string;
}

/**
 * Gera um UUID v4 válido para a coluna `id (uuid)` da tabela `public.baby_events`
 */
function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function createZeroedState(now: Date = new Date()): RotineStorageData {
  return {
    version: 3,
    updatedAt: now.toISOString(),
    babyProfile: {
      name: 'Bebê',
      birthDate: getLocalDateKey(now),
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
    days: {},
  };
}

function cleanupLegacyMockStorage() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

function saveCleanCache(state: RotineStorageData, lastBreastSide: BreastSide | null) {
  try {
    localStorage.setItem(
      SUPABASE_CACHE_KEY,
      JSON.stringify({ state, lastBreastSide })
    );
  } catch {
    // ignore
  }
}

function loadCleanCache(): {
  state: RotineStorageData;
  lastBreastSide: BreastSide | null;
} {
  cleanupLegacyMockStorage();
  try {
    const raw = localStorage.getItem(SUPABASE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        state?: RotineStorageData;
        lastBreastSide?: BreastSide | null;
      };
      if (parsed && parsed.state && parsed.state.version === 3) {
        return {
          state: parsed.state,
          lastBreastSide: parsed.lastBreastSide ?? null,
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    state: createZeroedState(new Date()),
    lastBreastSide: null,
  };
}

function dbSideToBreastSide(side?: string | null): BreastSide {
  return side?.toLowerCase() === 'direito' ? 'Direito' : 'Esquerdo';
}

function breastSideToDbSide(side: BreastSide): 'esquerdo' | 'direito' {
  return side === 'Direito' ? 'direito' : 'esquerdo';
}

function mapBabyEventRowToRoutineEvent(row: BabyEventRow): RoutineEvent {
  const startDate = new Date(row.start_time || row.created_at || new Date().toISOString());
  const endDate = row.end_time ? new Date(row.end_time) : startDate;
  const referenceDate = row.type === 'sono' ? endDate : startDate;
  const dateKey = getLocalDateKey(referenceDate);
  const durSec = typeof row.duration_seconds === 'number' ? Math.max(0, row.duration_seconds) : 0;
  const durMin = durSec > 0 ? Math.max(1, Math.round(durSec / 60)) : 1;

  if (row.type === 'mamada') {
    const isBottle = row.subtype === 'mamadeira';
    const breast: BreastSide = dbSideToBreastSide(row.subtype);
    const mamada: MamadaEvent = {
      id: row.id,
      type: 'mamada',
      feedingType: isBottle ? 'mamadeira' : 'peito',
      dateKey,
      timestamp: referenceDate.toISOString(),
      timeFormatted: formatTimeHHMM(startDate),
      ...(isBottle ? { volumeMl: row.amount_ml ?? 60 } : { breast }),
      durationMinutes: durMin,
      durationSeconds: durSec > 0 ? durSec : undefined,
    };
    return mamada;
  }

  if (row.type === 'fralda') {
    const sub = row.subtype;
    const diaperType: DiaperSubType =
      sub === 'coco' ? 'coco' : sub === 'xixi_coco' ? 'ambos' : 'xixi';
    const fralda: FraldaEvent = {
      id: row.id,
      type: 'fralda',
      dateKey,
      timestamp: startDate.toISOString(),
      timeFormatted: formatTimeHHMM(startDate),
      diaperType,
      hasPee: diaperType === 'xixi' || diaperType === 'ambos',
      hasPoop: diaperType === 'coco' || diaperType === 'ambos',
    };
    return fralda;
  }

  const sono: SonoEvent = {
    id: row.id,
    type: 'sono',
    dateKey,
    timestamp: endDate.toISOString(),
    timeFormatted: formatTimeHHMM(startDate),
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
    durationMinutes: durMin,
    durationSeconds: durSec > 0 ? durSec : undefined,
  };
  return sono;
}

function groupEventsByDateKey(events: RoutineEvent[]): Record<string, RoutineEvent[]> {
  const days: Record<string, RoutineEvent[]> = {};
  for (const ev of events) {
    const list = days[ev.dateKey] || [];
    list.push(ev);
    days[ev.dateKey] = list;
  }
  Object.keys(days).forEach((k) => {
    days[k].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });
  return days;
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
      awakeFormatted: 'Sem registro',
      zone: 'tranquila',
      statusLabel: 'Janela tranquila',
      statusSubtext: 'Registre uma mamada ou soneca para acompanhar a janela de sono',
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
    statusLabel = 'Passou da janela - risco de cansaço excessivo';
    statusSubtext = 'Acima de 60 min acordado • Acolha em ambiente calmo para ninar';
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
  isLoadingSupabase: boolean;
  // Siri Deep Link Banner & Trigger
  siriConfirmationBanner: SiriConfirmationBanner | null;
  dismissSiriBanner: () => void;
  executeSiriCommand: (siriParam: string) => Promise<void>;
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
  clearAllRecords: () => Promise<void>;
  refreshFromSupabase: () => Promise<void>;
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined);

export const RoutineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialCache = useMemo(() => loadCleanCache(), []);
  const [data, setData] = useState<RotineStorageData>(initialCache.state);
  const [lastBreastSideState, setLastBreastSideState] = useState<BreastSide | null>(
    initialCache.lastBreastSide
  );
  const [isLoadingSupabase, setIsLoadingSupabase] = useState<boolean>(true);
  const [now, setNow] = useState<Date>(() => new Date());
  const [manualWakeOverrideMs, setManualWakeOverrideMs] = useState<number | null>(null);
  const [siriConfirmationBanner, setSiriConfirmationBanner] =
    useState<SiriConfirmationBanner | null>(null);

  // Mantém referência sempre atualizada para funções assíncronas e Siri
  const dataRef = useRef<RotineStorageData>(data);
  useEffect(() => {
    dataRef.current = data;
    saveCleanCache(data, lastBreastSideState);
  }, [data, lastBreastSideState]);

  const lastBreastRef = useRef<BreastSide | null>(lastBreastSideState);
  useEffect(() => {
    lastBreastRef.current = lastBreastSideState;
  }, [lastBreastSideState]);

  /**
   * Garante que a linha única `id = 1` exista em `public.baby_active_state`
   */
  const upsertActiveStateRow = useCallback(
    async (patch: Partial<BabyActiveStateRow>): Promise<BabyActiveStateRow | null> => {
      const currentData = dataRef.current;
      const fallbackRow: BabyActiveStateRow = {
        id: 1,
        feeding_active:
          patch.feeding_active !== undefined
            ? patch.feeding_active
            : currentData.activeFeeding.isFeeding,
        feeding_side:
          patch.feeding_side !== undefined
            ? patch.feeding_side
            : currentData.activeFeeding.isFeeding
            ? breastSideToDbSide(currentData.activeFeeding.lado)
            : null,
        feeding_start_time:
          patch.feeding_start_time !== undefined
            ? patch.feeding_start_time
            : currentData.activeFeeding.startedAt,
        sleeping_active:
          patch.sleeping_active !== undefined
            ? patch.sleeping_active
            : currentData.activeSleep.isSleeping,
        sleeping_start_time:
          patch.sleeping_start_time !== undefined
            ? patch.sleeping_start_time
            : currentData.activeSleep.startedAt,
        last_breast_side:
          patch.last_breast_side !== undefined
            ? patch.last_breast_side
            : lastBreastRef.current
            ? breastSideToDbSide(lastBreastRef.current)
            : null,
        updated_at: new Date().toISOString(),
      };

      try {
        const { data: upserted, error } = await supabase
          .from('baby_active_state')
          .upsert(fallbackRow, { onConflict: 'id' })
          .select('*')
          .maybeSingle();

        if (error) {
          console.warn('Aviso ao sincronizar baby_active_state no Supabase:', error.message);
          return fallbackRow;
        }
        return (upserted as BabyActiveStateRow) || fallbackRow;
      } catch (err) {
        console.warn('Erro de rede ao atualizar baby_active_state:', err);
        return fallbackRow;
      }
    },
    []
  );

  /**
   * Insere um registro real na tabela `public.baby_events`
   */
  const insertBabyEventToSupabase = useCallback(async (row: BabyEventRow) => {
    try {
      const { error } = await supabase.from('baby_events').insert(row);
      if (error) {
        console.warn('Aviso ao inserir em baby_events no Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Erro de rede ao inserir em baby_events:', err);
    }
  }, []);

  /**
   * Busca todos os registros de `baby_events` e o estado de `baby_active_state` (`id = 1`)
   */
  const refreshFromSupabase = useCallback(async () => {
    try {
      const [eventsRes, activeRes] = await Promise.all([
        supabase
          .from('baby_events')
          .select('*')
          .order('start_time', { ascending: false })
          .limit(500),
        supabase
          .from('baby_active_state')
          .select('*')
          .eq('id', 1)
          .maybeSingle(),
      ]);

      const hasValidEventsResponse = !eventsRes.error && Array.isArray(eventsRes.data);
      const hasValidActiveResponse = !activeRes.error;

      if (hasValidEventsResponse || hasValidActiveResponse) {
        const remoteRows = (eventsRes.data || []) as BabyEventRow[];
        const mappedEvents = remoteRows.map(mapBabyEventRowToRoutineEvent);
        const remoteDays = groupEventsByDateKey(mappedEvents);

        const activeRow = (activeRes.data as BabyActiveStateRow | null) || null;

        // Se a linha id=1 ainda não existir no banco, tenta inicializá-la silenciosamente
        if (!activeRow && !activeRes.error) {
          void supabase
            .from('baby_active_state')
            .upsert(
              {
                id: 1,
                feeding_active: false,
                feeding_side: null,
                feeding_start_time: null,
                sleeping_active: false,
                sleeping_start_time: null,
                last_breast_side: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
        }

        if (activeRow?.last_breast_side) {
          setLastBreastSideState(dbSideToBreastSide(activeRow.last_breast_side));
        }

        setData((prev) => {
          // Se o banco retornou eventos ou se o banco está vazio sem erro, usa os dados do banco.
          // Caso o banco esteja vazio apenas porque RLS bloqueou a escrita anterior na mesma sessão,
          // preserva os eventos locais recém-criados pela mãe para não sumirem da tela.
          const mergedDays =
            mappedEvents.length > 0
              ? remoteDays
              : Object.keys(prev.days).length > 0
              ? prev.days
              : {};

          const nextFeedingActive = activeRow
            ? Boolean(activeRow.feeding_active && activeRow.feeding_start_time)
            : prev.activeFeeding.isFeeding;

          const nextFeedingSide: BreastSide = activeRow?.feeding_side
            ? dbSideToBreastSide(activeRow.feeding_side)
            : prev.activeFeeding.lado;

          const nextFeedingStartMs =
            activeRow?.feeding_active !== false && activeRow?.feeding_start_time
              ? new Date(activeRow.feeding_start_time).getTime()
              : nextFeedingActive
              ? prev.activeFeeding.startTime
              : null;

          const nextSleepingActive = activeRow
            ? Boolean(activeRow.sleeping_active && activeRow.sleeping_start_time)
            : prev.activeSleep.isSleeping;

          const nextSleepingStartMs =
            activeRow?.sleeping_active && activeRow?.sleeping_start_time
              ? new Date(activeRow.sleeping_start_time).getTime()
              : nextSleepingActive
              ? prev.activeSleep.startTime
              : null;

          const nextState: RotineStorageData = {
            ...prev,
            version: 3,
            updatedAt: new Date().toISOString(),
            days: mergedDays,
            activeFeeding: {
              isFeeding: Boolean(nextFeedingActive && nextFeedingStartMs),
              lado: nextFeedingSide,
              breast: nextFeedingSide,
              startTime: nextFeedingActive ? nextFeedingStartMs : null,
              startedAt:
                nextFeedingActive && nextFeedingStartMs
                  ? new Date(nextFeedingStartMs).toISOString()
                  : null,
              previousSideSaved: prev.activeFeeding.previousSideSaved,
            },
            activeSleep: {
              isSleeping: Boolean(nextSleepingActive && nextSleepingStartMs),
              startTime: nextSleepingActive ? nextSleepingStartMs : null,
              startedAt:
                nextSleepingActive && nextSleepingStartMs
                  ? new Date(nextSleepingStartMs).toISOString()
                  : null,
            },
          };

          return nextState;
        });
      }
    } catch (err) {
      console.warn('Erro ao buscar dados iniciais do Supabase:', err);
    } finally {
      setIsLoadingSupabase(false);
      setNow(new Date());
    }
  }, []);

  // Carrega dados do Supabase ao iniciar e assina mudanças em tempo real (Realtime)
  useEffect(() => {
    cleanupLegacyMockStorage();
    void refreshFromSupabase();

    const channel = supabase
      .channel('rotine_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baby_events' },
        () => {
          void refreshFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baby_active_state' },
        () => {
          void refreshFromSupabase();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshFromSupabase]);

  // Recarrega do Supabase sempre que o app volta do segundo plano ou ganha foco
  useEffect(() => {
    const handleWakeOrFocus = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
        void refreshFromSupabase();
      }
    };
    window.addEventListener('focus', handleWakeOrFocus);
    document.addEventListener('visibilitychange', handleWakeOrFocus);
    return () => {
      window.removeEventListener('focus', handleWakeOrFocus);
      document.removeEventListener('visibilitychange', handleWakeOrFocus);
    };
  }, [refreshFromSupabase]);

  // Relógio em tempo real (1s quando há cronômetro ativo, 15s em repouso)
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
    let lastBreastUsed: BreastSide | null = lastBreastSideState;
    let suggestedNextBreast: BreastSide = 'Esquerdo';

    if (lastAnyFeeding) {
      const rel = formatRelativeTimeSince(lastAnyFeeding.timestamp, now);
      timeSinceLastFeedingText = rel.text;
      minutesSinceLastFeeding = rel.minutes;
    }

    if (lastBreastFeeding && lastBreastFeeding.breast) {
      lastBreastUsed = lastBreastFeeding.breast;
    }

    if (lastBreastUsed) {
      suggestedNextBreast = lastBreastUsed === 'Esquerdo' ? 'Direito' : 'Esquerdo';
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

    let totalSleepSecondsToday = todaySleeps.reduce(
      (acc, s) => acc + (s.durationSeconds ?? (s.durationMinutes || 0) * 60),
      0
    );

    const activeSleepStartMs =
      data.activeSleep.startTime ??
      (data.activeSleep.startedAt ? new Date(data.activeSleep.startedAt).getTime() : null);

    if (data.activeSleep.isSleeping && activeSleepStartMs) {
      const effectiveStartMs = Math.max(startOfTodayMs, activeSleepStartMs);
      const activeSecs = Math.max(0, Math.floor((now.getTime() - effectiveStartMs) / 1000));
      totalSleepSecondsToday += activeSecs;
    }

    const totalSleepMinutesToday = Math.floor(totalSleepSecondsToday / 60);

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
      totalSleepFormatted:
        totalSleepSecondsToday > 0 && totalSleepSecondsToday < 60
          ? `${totalSleepSecondsToday} seg`
          : formatDurationMinutes(totalSleepMinutesToday),
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
    lastBreastSideState,
  ]);

  const appendEventToLocalState = useCallback((newEvent: RoutineEvent) => {
    setData((prev) => {
      const existingDayList = prev.days[newEvent.dateKey] || [];
      const withoutDuplicate = existingDayList.filter((e) => e.id !== newEvent.id);
      const updatedDayList = [newEvent, ...withoutDuplicate].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        days: {
          ...prev.days,
          [newEvent.dateKey]: updatedDayList,
        },
      };
    });
  }, []);

  const addMamada = useCallback(
    (breast: BreastSide, durationMinutes = 15, notes?: string): MamadaEvent => {
      const end = new Date();
      const durationSeconds = Math.max(1, Math.round(durationMinutes * 60));
      const start = new Date(end.getTime() - durationSeconds * 1000);
      const dateKey = getLocalDateKey(end);
      const id = generateUuid();

      const newEvent: MamadaEvent = {
        id,
        type: 'mamada',
        feedingType: 'peito',
        dateKey,
        timestamp: end.toISOString(),
        timeFormatted: formatTimeHHMM(start),
        breast,
        durationMinutes,
        durationSeconds,
        ...(notes ? { notes } : {}),
      };

      appendEventToLocalState(newEvent);
      setLastBreastSideState(breast);
      setNow(end);

      void insertBabyEventToSupabase({
        id,
        type: 'mamada',
        subtype: breastSideToDbSide(breast),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_seconds: durationSeconds,
        amount_ml: null,
        created_at: end.toISOString(),
      });
      void upsertActiveStateRow({
        last_breast_side: breastSideToDbSide(breast),
      });

      return newEvent;
    },
    [appendEventToLocalState, insertBabyEventToSupabase, upsertActiveStateRow]
  );

  const addMamadeira = useCallback(
    (volumeMl: number, notes?: string): MamadaEvent => {
      const current = new Date();
      const dateKey = getLocalDateKey(current);
      const id = generateUuid();

      const newEvent: MamadaEvent = {
        id,
        type: 'mamada',
        feedingType: 'mamadeira',
        dateKey,
        timestamp: current.toISOString(),
        timeFormatted: formatTimeHHMM(current),
        volumeMl,
        durationMinutes: 10,
        durationSeconds: 600,
        ...(notes ? { notes } : {}),
      };

      appendEventToLocalState(newEvent);
      setNow(current);

      void insertBabyEventToSupabase({
        id,
        type: 'mamada',
        subtype: 'mamadeira',
        start_time: current.toISOString(),
        end_time: current.toISOString(),
        duration_seconds: 600,
        amount_ml: volumeMl,
        created_at: current.toISOString(),
      });

      return newEvent;
    },
    [appendEventToLocalState, insertBabyEventToSupabase]
  );

  const startFeedingTimer = useCallback(
    (lado: BreastSide) => {
      const startMs = Date.now();
      const current = new Date(startMs);
      const iso = current.toISOString();

      setNow(current);
      setData((prev) => ({
        ...prev,
        updatedAt: iso,
        activeFeeding: {
          isFeeding: true,
          lado,
          breast: lado,
          startTime: startMs,
          startedAt: iso,
          previousSideSaved: null,
        },
      }));

      void upsertActiveStateRow({
        feeding_active: true,
        feeding_side: breastSideToDbSide(lado),
        feeding_start_time: iso,
      });
    },
    [upsertActiveStateRow]
  );

  const switchBreastAndSaveFirst = useCallback((): MamadaEvent | null => {
    const active = dataRef.current.activeFeeding;
    const startMs =
      active.startTime ?? (active.startedAt ? new Date(active.startedAt).getTime() : null);

    if (!active.isFeeding || !startMs) {
      return null;
    }

    const nowMs = Date.now();
    const start = new Date(startMs);
    const end = new Date(nowMs);
    const elapsedSeconds = Math.max(1, Math.floor((nowMs - startMs) / 1000));
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const currentSide: BreastSide = active.lado || active.breast;
    const nextSide: BreastSide = currentSide === 'Esquerdo' ? 'Direito' : 'Esquerdo';
    const dateKey = getLocalDateKey(end);
    const id = generateUuid();

    const firstBreastEvent: MamadaEvent = {
      id,
      type: 'mamada',
      feedingType: 'peito',
      dateKey,
      timestamp: end.toISOString(),
      timeFormatted: formatTimeHHMM(start),
      breast: currentSide,
      durationMinutes,
      durationSeconds: elapsedSeconds,
      notes: `1º lado antes de trocar para o Peito ${nextSide}`,
    };

    setLastBreastSideState(currentSide);

    setData((prev) => {
      const existingDayList = prev.days[dateKey] || [];
      return {
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
    });

    setNow(end);

    void insertBabyEventToSupabase({
      id,
      type: 'mamada',
      subtype: breastSideToDbSide(currentSide),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_seconds: elapsedSeconds,
      amount_ml: null,
      created_at: end.toISOString(),
    });

    void upsertActiveStateRow({
      feeding_active: true,
      feeding_side: breastSideToDbSide(nextSide),
      feeding_start_time: end.toISOString(),
      last_breast_side: breastSideToDbSide(currentSide),
    });

    return firstBreastEvent;
  }, [insertBabyEventToSupabase, upsertActiveStateRow]);

  const cancelFeedingTimer = useCallback(() => {
    setData((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      activeFeeding: {
        ...prev.activeFeeding,
        isFeeding: false,
        startTime: null,
        startedAt: null,
        previousSideSaved: null,
      },
    }));

    void upsertActiveStateRow({
      feeding_active: false,
      feeding_side: null,
      feeding_start_time: null,
    });
  }, [upsertActiveStateRow]);

  const stopFeedingTimer = useCallback(
    (notes?: string): MamadaEvent | null => {
      const active = dataRef.current.activeFeeding;
      const startMs =
        active.startTime ??
        (active.startedAt ? new Date(active.startedAt).getTime() : null);

      if (!active.isFeeding || !startMs) {
        return null;
      }

      const endMs = Date.now();
      const start = new Date(startMs);
      const end = new Date(endMs);
      const elapsedSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));
      const diffMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const currentSide: BreastSide = active.lado || active.breast;
      const nextSide: BreastSide = currentSide === 'Esquerdo' ? 'Direito' : 'Esquerdo';
      const dateKey = getLocalDateKey(end);
      const id = generateUuid();

      const newEvent: MamadaEvent = {
        id,
        type: 'mamada',
        feedingType: 'peito',
        dateKey,
        timestamp: end.toISOString(),
        timeFormatted: formatTimeHHMM(start),
        breast: currentSide,
        durationMinutes: diffMinutes,
        durationSeconds: elapsedSeconds,
        ...(notes ? { notes } : {}),
      };

      setLastBreastSideState(currentSide);

      setData((prev) => {
        const existingDayList = prev.days[dateKey] || [];
        return {
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
      });

      setNow(end);

      void insertBabyEventToSupabase({
        id,
        type: 'mamada',
        subtype: breastSideToDbSide(currentSide),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_seconds: elapsedSeconds,
        amount_ml: null,
        created_at: end.toISOString(),
      });

      void upsertActiveStateRow({
        feeding_active: false,
        feeding_side: null,
        feeding_start_time: null,
        last_breast_side: breastSideToDbSide(currentSide),
      });

      return newEvent;
    },
    [insertBabyEventToSupabase, upsertActiveStateRow]
  );

  const addFralda = useCallback(
    (diaperType: DiaperSubType, notes?: string): FraldaEvent => {
      const current = new Date();
      const dateKey = getLocalDateKey(current);
      const id = generateUuid();

      const newEvent: FraldaEvent = {
        id,
        type: 'fralda',
        dateKey,
        timestamp: current.toISOString(),
        timeFormatted: formatTimeHHMM(current),
        diaperType,
        hasPee: diaperType === 'xixi' || diaperType === 'ambos',
        hasPoop: diaperType === 'coco' || diaperType === 'ambos',
        ...(notes ? { notes } : {}),
      };

      appendEventToLocalState(newEvent);
      setNow(current);

      const dbSubtype: 'xixi' | 'coco' | 'xixi_coco' =
        diaperType === 'ambos' ? 'xixi_coco' : diaperType;

      void insertBabyEventToSupabase({
        id,
        type: 'fralda',
        subtype: dbSubtype,
        start_time: current.toISOString(),
        end_time: null,
        duration_seconds: null,
        amount_ml: null,
        created_at: current.toISOString(),
      });

      return newEvent;
    },
    [appendEventToLocalState, insertBabyEventToSupabase]
  );

  const toggleSleep = useCallback(
    (notes?: string): SonoEvent | null => {
      const nowMs = Date.now();
      const current = new Date(nowMs);
      const iso = current.toISOString();
      setNow(current);

      const activeSleep = dataRef.current.activeSleep;

      if (!activeSleep.isSleeping) {
        setData((prev) => ({
          ...prev,
          updatedAt: iso,
          activeSleep: {
            isSleeping: true,
            startTime: nowMs,
            startedAt: iso,
          },
        }));

        void upsertActiveStateRow({
          sleeping_active: true,
          sleeping_start_time: iso,
        });

        return null;
      } else {
        const startMs =
          activeSleep.startTime ??
          (activeSleep.startedAt ? new Date(activeSleep.startedAt).getTime() : nowMs);
        const start = new Date(startMs);
        const elapsedSeconds = Math.max(1, Math.floor((nowMs - startMs) / 1000));
        const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
        const dateKey = getLocalDateKey(current);
        const id = generateUuid();

        const newSleepEvent: SonoEvent = {
          id,
          type: 'sono',
          dateKey,
          timestamp: iso,
          timeFormatted: formatTimeHHMM(start),
          startTime: start.toISOString(),
          endTime: iso,
          durationMinutes,
          durationSeconds: elapsedSeconds,
          ...(notes ? { notes } : {}),
        };

        setManualWakeOverrideMs(nowMs);

        setData((prev) => {
          const existingDayList = prev.days[dateKey] || [];
          return {
            ...prev,
            updatedAt: iso,
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
        });

        void insertBabyEventToSupabase({
          id,
          type: 'sono',
          subtype: null,
          start_time: start.toISOString(),
          end_time: iso,
          duration_seconds: elapsedSeconds,
          amount_ml: null,
          created_at: iso,
        });

        void upsertActiveStateRow({
          sleeping_active: false,
          sleeping_start_time: null,
        });

        return newSleepEvent;
      }
    },
    [insertBabyEventToSupabase, upsertActiveStateRow]
  );

  const addManualSono = useCallback(
    (durationMinutes: number, notes?: string): SonoEvent => {
      const end = new Date();
      const durationSeconds = Math.max(1, Math.round(durationMinutes * 60));
      const start = new Date(end.getTime() - durationSeconds * 1000);
      const dateKey = getLocalDateKey(end);
      const id = generateUuid();

      const newSleepEvent: SonoEvent = {
        id,
        type: 'sono',
        dateKey,
        timestamp: end.toISOString(),
        timeFormatted: formatTimeHHMM(start),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes,
        durationSeconds,
        ...(notes ? { notes } : {}),
      };

      setManualWakeOverrideMs(end.getTime());
      appendEventToLocalState(newSleepEvent);
      setNow(end);

      void insertBabyEventToSupabase({
        id,
        type: 'sono',
        subtype: null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_seconds: durationSeconds,
        amount_ml: null,
        created_at: end.toISOString(),
      });

      return newSleepEvent;
    },
    [appendEventToLocalState, insertBabyEventToSupabase]
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
      const id = generateUuid();

      if (input.type === 'mamada') {
        const isBottle = input.feedingType === 'mamadeira';
        const durMin = Math.max(1, input.durationMinutes || 15);
        const durSec = durMin * 60;
        const endDate = new Date(eventDate.getTime() + durSec * 1000);
        const breast = input.breast || 'Esquerdo';

        const newMamada: MamadaEvent = {
          id,
          type: 'mamada',
          feedingType: isBottle ? 'mamadeira' : 'peito',
          dateKey,
          timestamp: eventDate.toISOString(),
          timeFormatted,
          ...(isBottle ? { volumeMl: input.volumeMl || 60 } : { breast }),
          durationMinutes: durMin,
          durationSeconds: durSec,
          ...(input.notes ? { notes: input.notes } : {}),
        };

        appendEventToLocalState(newMamada);
        if (!isBottle) {
          setLastBreastSideState(breast);
        }
        setNow(new Date());

        void insertBabyEventToSupabase({
          id,
          type: 'mamada',
          subtype: isBottle ? 'mamadeira' : breastSideToDbSide(breast),
          start_time: eventDate.toISOString(),
          end_time: endDate.toISOString(),
          duration_seconds: durSec,
          amount_ml: isBottle ? input.volumeMl || 60 : null,
          created_at: new Date().toISOString(),
        });

        if (!isBottle) {
          void upsertActiveStateRow({
            last_breast_side: breastSideToDbSide(breast),
          });
        }

        return newMamada;
      }

      if (input.type === 'fralda') {
        const dType: DiaperSubType = input.diaperType || 'xixi';
        const newFralda: FraldaEvent = {
          id,
          type: 'fralda',
          dateKey,
          timestamp: eventDate.toISOString(),
          timeFormatted,
          diaperType: dType,
          hasPee: dType === 'xixi' || dType === 'ambos',
          hasPoop: dType === 'coco' || dType === 'ambos',
          ...(input.notes ? { notes: input.notes } : {}),
        };

        appendEventToLocalState(newFralda);
        setNow(new Date());

        void insertBabyEventToSupabase({
          id,
          type: 'fralda',
          subtype: dType === 'ambos' ? 'xixi_coco' : dType,
          start_time: eventDate.toISOString(),
          end_time: null,
          duration_seconds: null,
          amount_ml: null,
          created_at: new Date().toISOString(),
        });

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

      const durationSeconds = durationMinutes * 60;

      const newSono: SonoEvent = {
        id,
        type: 'sono',
        dateKey,
        timestamp: endDate.toISOString(),
        timeFormatted,
        startTime: eventDate.toISOString(),
        endTime: endDate.toISOString(),
        durationMinutes,
        durationSeconds,
        ...(input.notes ? { notes: input.notes } : {}),
      };

      appendEventToLocalState(newSono);
      setNow(new Date());

      void insertBabyEventToSupabase({
        id,
        type: 'sono',
        subtype: null,
        start_time: eventDate.toISOString(),
        end_time: endDate.toISOString(),
        duration_seconds: durationSeconds,
        amount_ml: null,
        created_at: new Date().toISOString(),
      });

      return newSono;
    },
    [appendEventToLocalState, insertBabyEventToSupabase, upsertActiveStateRow]
  );

  /**
   * EXECUÇÃO ASSÍNCRONA À PROVA DE FALHAS DOS ATALHOS DA SIRI (`?siri=...`)
   * Consulta `baby_active_state` (id = 1) no Supabase primeiro, executa o INSERT/UPSERT
   * com `await`, e somente depois limpa a URL e atualiza a tela.
   */
  const executeSiriCommand = useCallback(
    async (rawCommand: string): Promise<void> => {
      const cmd = rawCommand.trim().toLowerCase();
      const nowTime = new Date();
      const nowIso = nowTime.toISOString();
      const timeFormatted = formatTimeHHMM(nowTime);

      // 1. Consulta o estado ativo real no Supabase (id = 1) para sincronizar entre Siri (Safari) e PWA
      let remoteActive: BabyActiveStateRow | null = null;
      try {
        const { data: activeRow } = await supabase
          .from('baby_active_state')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        if (activeRow) {
          remoteActive = activeRow as BabyActiveStateRow;
        }
      } catch {
        // Fallback para estado local se offline
      }

      const isCurrentlyFeeding =
        remoteActive !== null
          ? Boolean(remoteActive.feeding_active && remoteActive.feeding_start_time)
          : dataRef.current.activeFeeding.isFeeding;

      const activeFeedingSide: BreastSide =
        remoteActive?.feeding_side
          ? dbSideToBreastSide(remoteActive.feeding_side)
          : dataRef.current.activeFeeding.lado;

      const activeFeedingStartMs: number | null =
        remoteActive?.feeding_start_time
          ? new Date(remoteActive.feeding_start_time).getTime()
          : dataRef.current.activeFeeding.startTime;

      const isCurrentlySleeping =
        remoteActive !== null
          ? Boolean(remoteActive.sleeping_active && remoteActive.sleeping_start_time)
          : dataRef.current.activeSleep.isSleeping;

      const activeSleepingStartMs: number | null =
        remoteActive?.sleeping_start_time
          ? new Date(remoteActive.sleeping_start_time).getTime()
          : dataRef.current.activeSleep.startTime;

      // Comando genérico ?siri=mamar (escolhe automaticamente o peito oposto ao último utilizado)
      if (cmd === 'mamar' || cmd === 'mamar_esquerdo' || cmd === 'mamar_direito') {
        let targetSide: BreastSide = 'Esquerdo';

        if (cmd === 'mamar_esquerdo') {
          targetSide = 'Esquerdo';
        } else if (cmd === 'mamar_direito') {
          targetSide = 'Direito';
        } else {
          // ?siri=mamar -> verifica last_breast_side no Supabase ou última mamada
          let lastSide: BreastSide | null = remoteActive?.last_breast_side
            ? dbSideToBreastSide(remoteActive.last_breast_side)
            : lastBreastRef.current;

          if (!lastSide) {
            try {
              const { data: lastFeedRows } = await supabase
                .from('baby_events')
                .select('subtype')
                .eq('type', 'mamada')
                .in('subtype', ['esquerdo', 'direito'])
                .order('start_time', { ascending: false })
                .limit(1);
              if (lastFeedRows && lastFeedRows.length > 0 && lastFeedRows[0].subtype) {
                lastSide = dbSideToBreastSide(lastFeedRows[0].subtype);
              }
            } catch {
              // ignore
            }
          }

          targetSide = lastSide === 'Esquerdo' ? 'Direito' : 'Esquerdo';
        }

        if (!isCurrentlyFeeding) {
          const startMs = nowTime.getTime();
          setData((prev) => ({
            ...prev,
            updatedAt: nowIso,
            activeFeeding: {
              isFeeding: true,
              lado: targetSide,
              breast: targetSide,
              startTime: startMs,
              startedAt: nowIso,
              previousSideSaved: null,
            },
          }));

          await upsertActiveStateRow({
            feeding_active: true,
            feeding_side: breastSideToDbSide(targetSide),
            feeding_start_time: nowIso,
          });

          setSiriConfirmationBanner({
            command: cmd,
            title: `Siri: Mamada iniciada no Peito ${targetSide}`,
            detail:
              cmd === 'mamar'
                ? `Peito ${targetSide} selecionado automaticamente (oposto ao último) às ${timeFormatted}.`
                : `Cronômetro ativado às ${timeFormatted}.`,
            tone: 'amber',
            timeFormatted,
          });
        } else {
          setSiriConfirmationBanner({
            command: cmd,
            title: `Siri: Cronômetro já está rodando (Peito ${activeFeedingSide})`,
            detail: 'A mamada atual continuou em andamento sem reiniciar.',
            tone: 'amber',
            timeFormatted,
          });
        }
      } else if (cmd === 'parar_mamada') {
        if (isCurrentlyFeeding && activeFeedingStartMs) {
          const endMs = nowTime.getTime();
          const startObj = new Date(activeFeedingStartMs);
          const elapsedSeconds = Math.max(1, Math.floor((endMs - activeFeedingStartMs) / 1000));
          const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
          const dateKey = getLocalDateKey(nowTime);
          const nextSide: BreastSide =
            activeFeedingSide === 'Esquerdo' ? 'Direito' : 'Esquerdo';
          const id = generateUuid();

          const newEvent: MamadaEvent = {
            id,
            type: 'mamada',
            feedingType: 'peito',
            dateKey,
            timestamp: nowIso,
            timeFormatted: formatTimeHHMM(startObj),
            breast: activeFeedingSide,
            durationMinutes,
            durationSeconds: elapsedSeconds,
            notes: 'Finalizada via comando da Siri',
          };

          setLastBreastSideState(activeFeedingSide);
          setData((prev) => {
            const existingDayList = prev.days[dateKey] || [];
            return {
              ...prev,
              updatedAt: nowIso,
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
          });

          await insertBabyEventToSupabase({
            id,
            type: 'mamada',
            subtype: breastSideToDbSide(activeFeedingSide),
            start_time: startObj.toISOString(),
            end_time: nowIso,
            duration_seconds: elapsedSeconds,
            amount_ml: null,
            created_at: nowIso,
          });

          await upsertActiveStateRow({
            feeding_active: false,
            feeding_side: null,
            feeding_start_time: null,
            last_breast_side: breastSideToDbSide(activeFeedingSide),
          });

          const durText = formatSecondsHuman(elapsedSeconds, durationMinutes);
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: Mamada finalizada e salva!',
            detail: `Peito ${activeFeedingSide} (${durText}) registrado no histórico às ${timeFormatted}.`,
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
      } else if (cmd === 'xixi' || cmd === 'coco' || cmd === 'xixi_coco') {
        const diaperType: DiaperSubType =
          cmd === 'coco' ? 'coco' : cmd === 'xixi_coco' ? 'ambos' : 'xixi';
        const dateKey = getLocalDateKey(nowTime);
        const id = generateUuid();

        const newEvent: FraldaEvent = {
          id,
          type: 'fralda',
          dateKey,
          timestamp: nowIso,
          timeFormatted,
          diaperType,
          hasPee: diaperType === 'xixi' || diaperType === 'ambos',
          hasPoop: diaperType === 'coco' || diaperType === 'ambos',
          notes: 'Registrado via Siri',
        };

        appendEventToLocalState(newEvent);

        await insertBabyEventToSupabase({
          id,
          type: 'fralda',
          subtype: cmd as 'xixi' | 'coco' | 'xixi_coco',
          start_time: nowIso,
          end_time: null,
          duration_seconds: null,
          amount_ml: null,
          created_at: nowIso,
        });

        const titleMap = {
          xixi: 'Siri: Fralda de Xixi registrada!',
          coco: 'Siri: Fralda de Cocô registrada!',
          xixi_coco: 'Siri: Fralda de Xixi + Cocô registrada!',
        } as const;

        const detailMap = {
          xixi: `Só Xixi salvo às ${timeFormatted} (+1 na meta de hidratação).`,
          coco: `Só Cocô salvo no histórico às ${timeFormatted}.`,
          xixi_coco: `Xixi + Cocô salvo às ${timeFormatted} (+1 na meta de hidratação).`,
        } as const;

        setSiriConfirmationBanner({
          command: cmd,
          title: titleMap[cmd as 'xixi' | 'coco' | 'xixi_coco'],
          detail: detailMap[cmd as 'xixi' | 'coco' | 'xixi_coco'],
          tone: 'emerald',
          timeFormatted,
        });
      } else if (cmd === 'dormiu') {
        if (!isCurrentlySleeping) {
          const startMs = nowTime.getTime();
          setData((prev) => ({
            ...prev,
            updatedAt: nowIso,
            activeSleep: {
              isSleeping: true,
              startTime: startMs,
              startedAt: nowIso,
            },
          }));

          await upsertActiveStateRow({
            sleeping_active: true,
            sleeping_start_time: nowIso,
          });

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
        if (isCurrentlySleeping && activeSleepingStartMs) {
          const endMs = nowTime.getTime();
          const startObj = new Date(activeSleepingStartMs);
          const elapsedSeconds = Math.max(1, Math.floor((endMs - activeSleepingStartMs) / 1000));
          const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
          const dateKey = getLocalDateKey(nowTime);
          const id = generateUuid();

          const newSleepEvent: SonoEvent = {
            id,
            type: 'sono',
            dateKey,
            timestamp: nowIso,
            timeFormatted: formatTimeHHMM(startObj),
            startTime: startObj.toISOString(),
            endTime: nowIso,
            durationMinutes,
            durationSeconds: elapsedSeconds,
            notes: 'Finalizado via comando da Siri',
          };

          setManualWakeOverrideMs(endMs);
          setData((prev) => {
            const existingDayList = prev.days[dateKey] || [];
            return {
              ...prev,
              updatedAt: nowIso,
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
          });

          await insertBabyEventToSupabase({
            id,
            type: 'sono',
            subtype: null,
            start_time: startObj.toISOString(),
            end_time: nowIso,
            duration_seconds: elapsedSeconds,
            amount_ml: null,
            created_at: nowIso,
          });

          await upsertActiveStateRow({
            sleeping_active: false,
            sleeping_start_time: null,
          });

          const durText = formatSecondsHuman(elapsedSeconds, durationMinutes);
          setSiriConfirmationBanner({
            command: cmd,
            title: 'Siri: O Bebê Acordou • Sono salvo!',
            detail: `Soneca de ${durText} registrada no histórico às ${timeFormatted}.`,
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

      // 2. Limpa a URL SOMENTE APÓS concluir o await do Supabase
      try {
        window.history.replaceState({}, '', '/');
      } catch (err) {
        console.error('Erro ao limpar URL:', err);
      }

      // 3. Atualiza a tela sincronizando com o Supabase
      await refreshFromSupabase();
    },
    [
      appendEventToLocalState,
      insertBabyEventToSupabase,
      refreshFromSupabase,
      upsertActiveStateRow,
    ]
  );

  // Trava de execução única (useRef) para ler ?siri=... ao abrir o app sem duplicar no StrictMode
  const hasProcessedInitialUrlRef = useRef(false);
  useEffect(() => {
    if (hasProcessedInitialUrlRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const siriParam = params.get('siri');
    if (siriParam) {
      hasProcessedInitialUrlRef.current = true;
      void executeSiriCommand(siriParam);
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
    setData((prev) => {
      const dayList = prev.days[dateKey] || [];
      const filtered = dayList.filter((item) => item.id !== id);
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        days: {
          ...prev.days,
          [dateKey]: filtered,
        },
      };
    });

    void (async () => {
      try {
        await supabase.from('baby_events').delete().eq('id', id);
      } catch {
        // ignore
      }
    })();
  }, []);

  /**
   * Zera 100% dos dados do aplicativo (no Supabase e localmente)
   */
  const clearAllRecords = useCallback(async () => {
    const current = new Date();
    const zeroed = createZeroedState(current);
    cleanupLegacyMockStorage();
    try {
      localStorage.removeItem(SUPABASE_CACHE_KEY);
    } catch {
      // ignore
    }

    setManualWakeOverrideMs(null);
    setLastBreastSideState(null);
    setData(zeroed);
    setNow(current);

    try {
      await Promise.all([
        supabase
          .from('baby_events')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('baby_active_state').upsert(
          {
            id: 1,
            feeding_active: false,
            feeding_side: null,
            feeding_start_time: null,
            sleeping_active: false,
            sleeping_start_time: null,
            last_breast_side: null,
            updated_at: current.toISOString(),
          },
          { onConflict: 'id' }
        ),
      ]);
    } catch (err) {
      console.warn('Erro ao zerar dados no Supabase:', err);
    }
  }, []);

  const resetToSampleData = useCallback(() => {
    void clearAllRecords();
  }, [clearAllRecords]);

  const value = useMemo(
    () => ({
      data,
      now,
      todayKey,
      todayEvents,
      allEventsSorted,
      todaySummary,
      isLoadingSupabase,
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
      refreshFromSupabase,
    }),
    [
      data,
      now,
      todayKey,
      todayEvents,
      allEventsSorted,
      todaySummary,
      isLoadingSupabase,
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
      refreshFromSupabase,
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
