/**
 * Retorna a chave da data local no formato YYYY-MM-DD
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata um objeto Date como HH:mm
 */
export function formatTimeHHMM(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Retorna o início do dia atual (00:00:00.000 local)
 */
export function getStartOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Formata o tempo decorrido desde um timestamp (ex: "Há 1h 20m", "Há 35m", "Agora mesmo")
 */
export function formatRelativeTimeSince(isoTimestamp: string, now: Date = new Date()): {
  text: string;
  minutes: number;
} {
  const past = new Date(isoTimestamp);
  const diffMs = Math.max(0, now.getTime() - past.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);

  if (totalMinutes < 1) {
    return { text: 'Agora mesmo', minutes: 0 };
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return { text: `Há ${minutes}m`, minutes: totalMinutes };
  }

  if (minutes === 0) {
    return { text: `Há ${hours}h`, minutes: totalMinutes };
  }

  return { text: `Há ${hours}h ${minutes}m`, minutes: totalMinutes };
}

/**
 * Formata minutos totais em horas e minutos (ex: "5h 40m" ou "45m")
 */
export function formatDurationMinutes(totalMinutes: number): string {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h 00m`;
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Formata segundos em texto curto amigável (ex: "12m 30s" ou "45s")
 */
export function formatSecondsHuman(totalSeconds?: number, fallbackMinutes?: number): string {
  if (typeof totalSeconds === 'number' && totalSeconds > 0) {
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  }
  return `${fallbackMinutes ?? 1} min`;
}

/**
 * Calcula e formata o tempo decorrido comparando o horário atual (Date.now())
 * diretamente com o startTime salvo no localStorage.
 * Garante precisão absoluta mesmo se a tela do iPhone bloquear ou o app for fechado.
 */
export function formatLiveTimer(
  startInput: number | string | null | undefined,
  now: Date = new Date()
): {
  formatted: string;
  elapsedMinutes: number;
  elapsedSeconds: number;
} {
  if (!startInput) {
    return { formatted: '00:00', elapsedMinutes: 0, elapsedSeconds: 0 };
  }

  const startMs =
    typeof startInput === 'number' ? startInput : new Date(startInput).getTime();

  if (Number.isNaN(startMs)) {
    return { formatted: '00:00', elapsedMinutes: 0, elapsedSeconds: 0 };
  }

  const diffSec = Math.max(0, Math.floor((now.getTime() - startMs) / 1000));
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return {
      formatted: `${hh}:${mm}:${ss}`,
      elapsedMinutes: Math.max(1, Math.round(diffSec / 60)),
      elapsedSeconds: diffSec,
    };
  }

  return {
    formatted: `${mm}:${ss}`,
    elapsedMinutes: Math.max(1, Math.round(diffSec / 60)),
    elapsedSeconds: diffSec,
  };
}

/**
 * Formata uma chave YYYY-MM-DD para exibição humana (ex: "Hoje, 18 de out")
 */
export function formatDateKeyHuman(dateKey: string): string {
  const todayKey = getLocalDateKey();
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);

  const formatted = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  if (dateKey === todayKey) {
    return `Hoje, ${formatted}`;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === getLocalDateKey(yesterday)) {
    return `Ontem, ${formatted}`;
  }

  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
  return `${weekday}, ${formatted}`;
}
