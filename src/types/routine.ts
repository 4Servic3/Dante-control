export type EventType = 'mamada' | 'fralda' | 'sono';

export type BreastSide = 'Esquerdo' | 'Direito';

export type FeedingSubType = 'peito' | 'mamadeira';

export type DiaperSubType = 'xixi' | 'coco' | 'ambos';

export type ActiveTab = 'Rotina' | 'Histórico' | 'Pediatra';

export type WakeWindowZone = 'tranquila' | 'preparar' | 'passou';

export interface BaseRoutineEvent {
  id: string;
  type: EventType;
  /** Data local no formato YYYY-MM-DD para agrupamento diário */
  dateKey: string;
  /** Horário principal do registro (ISO 8601) */
  timestamp: string;
  /** Horário legível (HH:mm) para fácil inspeção no localStorage */
  timeFormatted: string;
  notes?: string;
}

export interface MamadaEvent extends BaseRoutineEvent {
  type: 'mamada';
  /** Define se foi amamentação no peito ou mamadeira/fórmula (padrão: 'peito') */
  feedingType?: FeedingSubType;
  /** Lado do peito usado ('Esquerdo' | 'Direito') quando feedingType === 'peito' */
  breast?: BreastSide;
  /** Quantidade em ml quando feedingType === 'mamadeira' (ex: 30, 60, 90) */
  volumeMl?: number;
  /** Duração em minutos */
  durationMinutes: number;
  /** Duração exata em segundos (quando medida pelo cronômetro) */
  durationSeconds?: number;
}

export interface FraldaEvent extends BaseRoutineEvent {
  type: 'fralda';
  diaperType: DiaperSubType;
  /** Indica se contabiliza para a meta diária de hidratação (xixi) */
  hasPee: boolean;
  hasPoop: boolean;
}

export interface SonoEvent extends BaseRoutineEvent {
  type: 'sono';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  durationSeconds?: number;
}

export type RoutineEvent = MamadaEvent | FraldaEvent | SonoEvent;

export interface ActiveSleepSession {
  isSleeping: boolean;
  /** Timestamp numérico (Date.now()) salvo imediatamente no localStorage */
  startTime: number | null;
  /** ISO string para leitura humana no localStorage */
  startedAt: string | null;
}

export interface ActiveFeedingSession {
  isFeeding: boolean;
  /** Lado atual sendo amamentado ('Esquerdo' | 'Direito') */
  lado: BreastSide;
  /** Alias para compatibilidade */
  breast: BreastSide;
  /** Timestamp numérico (Date.now()) salvo imediatamente no localStorage */
  startTime: number | null;
  /** ISO string para leitura humana no localStorage */
  startedAt: string | null;
  /** Caso a mãe tenha usado o botão "Trocar de Peito", guarda info do 1º lado já salvo */
  previousSideSaved?: {
    lado: BreastSide;
    durationSeconds: number;
    durationMinutes: number;
  } | null;
}

export interface BabyProfile {
  name: string;
  birthDate: string;
  /** Meta mínima de xixis por dia (6 a 8 para recém-nascido) */
  dailyPeeGoal: number;
  dailyPeeMaxGoal?: number;
}

/**
 * Estrutura limpa salva no localStorage na chave 'rotine_baby_data_v1'
 */
export interface RotineStorageData {
  version: number;
  updatedAt: string;
  babyProfile: BabyProfile;
  activeSleep: ActiveSleepSession;
  activeFeeding: ActiveFeedingSession;
  /** Registros agrupados por data (YYYY-MM-DD) suportando múltiplos eventos por dia */
  days: Record<string, RoutineEvent[]>;
}

export interface WakeWindowInfo {
  /** Minutos que o bebê está acordado desde o último sono finalizado (ou mamada) */
  awakeMinutes: number | null;
  /** Texto amigável ex: "25 min acordado" ou "1h 10m acordado" */
  awakeFormatted: string;
  /** Zona da Janela de Sono Ideal (45 a 60 min) */
  zone: WakeWindowZone;
  /** Rótulo da zona conforme regra clínica */
  statusLabel: string;
  /** Descrição acolhedora de apoio para a mãe */
  statusSubtext: string;
  /** Horário de referência em que acordou (HH:mm) */
  sinceTimeFormatted: string | null;
}

export interface TodaySummary {
  /** Texto amigável ex: "Há 1h 20m" ou "Agora mesmo" */
  timeSinceLastFeedingText: string;
  /** Minutos desde a última mamada */
  minutesSinceLastFeeding: number | null;
  /** Último peito utilizado ('Esquerdo' | 'Direito' | null) */
  lastBreastUsed: BreastSide | null;
  /** Próximo peito sugerido (alternância automática) */
  suggestedNextBreast: BreastSide;
  /** Contador de fraldas com xixi hoje (a partir da 00:00) */
  peeCountToday: number;
  /** Meta diária mínima de xixis (padrão: 6, ideal 6 a 8) */
  peeGoal: number;
  /** Meta ideal superior (8 xixis/dia) */
  peeMaxGoal: number;
  /** Total de cocôs hoje */
  poopCountToday: number;
  /** Total de minutos dormidos hoje (a partir da 00:00, incluindo soneca ativa) */
  totalSleepMinutesToday: number;
  /** Texto formatado ex: "6h 45m" */
  totalSleepFormatted: string;
  /** Status atual do bebê */
  sleepStatus: 'Dormindo' | 'Acordado';
  /** Informações calculadas da Janela de Sono quando acordado */
  wakeWindow: WakeWindowInfo;
  /** Quantidade total de mamadas hoje */
  feedingCountToday: number;
  /** Total de ml de mamadeira/fórmula hoje */
  formulaMlToday: number;
}
