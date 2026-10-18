import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Droplets,
  Flame,
  HeartHandshake,
  Mic,
  Milk,
  Moon,
  Play,
  Sparkles,
  Square,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { useRoutine } from '../context/RoutineContext';
import { BreastSide, DiaperSubType, RoutineEvent } from '../types/routine';
import { formatLiveTimer, formatSecondsHuman } from '../utils/dateHelpers';

export const RoutineControls: React.FC = () => {
  const {
    data,
    now,
    todayEvents,
    todaySummary,
    addMamadeira,
    startFeedingTimer,
    switchBreastAndSaveFirst,
    stopFeedingTimer,
    cancelFeedingTimer,
    addFralda,
    toggleSleep,
    addManualSono,
    setWakeMinutesAgoOverride,
    executeSiriCommand,
    deleteEvent,
  } = useRoutine();

  const [showBottlePicker, setShowBottlePicker] = useState(false);
  const [showInlineSiri, setShowInlineSiri] = useState(false);
  const [copiedSiriKey, setCopiedSiriKey] = useState<string | null>(null);
  const [customMl, setCustomMl] = useState<number>(60);
  const [diaperQuickFeedback, setDiaperQuickFeedback] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    message: string;
    tone: 'amber' | 'emerald' | 'sky';
  } | null>(null);

  const triggerFeedback = (message: string, tone: 'amber' | 'emerald' | 'sky') => {
    setFeedbackBanner({ message, tone });
    window.clearTimeout((window as unknown as { __rotineToast?: number }).__rotineToast);
    (window as unknown as { __rotineToast?: number }).__rotineToast = window.setTimeout(() => {
      setFeedbackBanner(null);
    }, 3800);
  };

  // 1. Iniciar Mamada com Timestamp (Date.now()) salvo imediatamente no localStorage
  const handleStartBreastFeeding = (lado: BreastSide) => {
    startFeedingTimer(lado);
    triggerFeedback(`Cronômetro iniciado • Peito ${lado}`, 'amber');
  };

  // 2. Trocar de Peito: salva o tempo do 1º peito no histórico e já inicia o cronômetro do outro lado
  const handleSwitchBreast = () => {
    const firstSaved = switchBreastAndSaveFirst();
    if (firstSaved) {
      const nextSide: BreastSide =
        firstSaved.breast === 'Esquerdo' ? 'Direito' : 'Esquerdo';
      const durationText = formatSecondsHuman(
        firstSaved.durationSeconds,
        firstSaved.durationMinutes
      );
      triggerFeedback(
        `Peito ${firstSaved.breast} salvo (${durationText}) → Iniciando Peito ${nextSide}`,
        'amber'
      );
    }
  };

  // 3. Finalizar Mamada: salva no histórico e atualiza o Painel de Tranquilidade no topo
  const handleFinishBreastFeeding = () => {
    const saved = stopFeedingTimer();
    if (saved) {
      const durationText = formatSecondsHuman(
        saved.durationSeconds,
        saved.durationMinutes
      );
      triggerFeedback(
        `Mamada finalizada! Peito ${saved.breast} (${durationText}) salvo no histórico.`,
        'amber'
      );
    }
  };

  // 4. Registrar Mamadeira / Fórmula em ml
  const handleQuickFormula = (ml: number) => {
    addMamadeira(ml);
    setShowBottlePicker(false);
    triggerFeedback(`Mamadeira / Fórmula registrada: ${ml}ml`, 'amber');
  };

  // 5. Termômetro de Fraldas (1 Toque)
  const handleDiaperTap = (type: DiaperSubType) => {
    const saved = addFralda(type);
    const labelMap: Record<DiaperSubType, string> = {
      xixi: `Fralda registrada! (Só Xixi às ${saved.timeFormatted})`,
      coco: `Fralda registrada! (Só Cocô às ${saved.timeFormatted})`,
      ambos: `Fralda registrada! (Xixi + Cocô às ${saved.timeFormatted})`,
    };
    setDiaperQuickFeedback(labelMap[type]);
    window.clearTimeout(
      (window as unknown as { __diaperToast?: number }).__diaperToast
    );
    (window as unknown as { __diaperToast?: number }).__diaperToast = window.setTimeout(
      () => {
        setDiaperQuickFeedback(null);
      },
      3000
    );
    triggerFeedback(labelMap[type], 'emerald');
  };

  // 6. Alternar "O Bebê Dormiu" <-> "O Bebê Acordou" (com timestamp no localStorage)
  const handleToggleSleep = () => {
    const wasSleeping = data.activeSleep.isSleeping;
    const savedSleep = toggleSleep();
    if (!wasSleeping) {
      triggerFeedback(
        'O Bebê Dormiu • Cronômetro de sono iniciado e salvo no aparelho',
        'sky'
      );
    } else if (savedSleep) {
      const durationText = formatSecondsHuman(
        savedSleep.durationSeconds,
        savedSleep.durationMinutes
      );
      triggerFeedback(
        `O Bebê Acordou • Soneca de ${durationText} salva no histórico!`,
        'sky'
      );
    }
  };

  const handleQuickNap = (mins: number) => {
    addManualSono(mins);
    triggerFeedback(`Soneca de ${mins} min registrada no dia de hoje`, 'sky');
  };

  // Cálculo em tempo real comparando Date.now() com startTime salvo no localStorage
  const activeFeedingStart =
    data.activeFeeding.startTime ?? data.activeFeeding.startedAt;
  const liveFeeding = formatLiveTimer(activeFeedingStart, now);

  const activeSleepStart =
    data.activeSleep.startTime ?? data.activeSleep.startedAt;
  const liveSleep = formatLiveTimer(activeSleepStart, now);

  const currentFeedingSide: BreastSide =
    data.activeFeeding.lado || data.activeFeeding.breast || 'Esquerdo';
  const oppositeFeedingSide: BreastSide =
    currentFeedingSide === 'Esquerdo' ? 'Direito' : 'Esquerdo';

  const lastBreast = todaySummary.lastBreastUsed;
  const suggestedBreast = todaySummary.suggestedNextBreast;
  const { wakeWindow } = todaySummary;
  const recentThree = todayEvents.slice(0, 3);

  // Progresso visual da Janela de Sono (escala de 0 a 75 min)
  const wakeProgressPercent = Math.min(
    100,
    Math.round(((wakeWindow.awakeMinutes ?? 0) / 75) * 100)
  );

  const renderEventBadge = (ev: RoutineEvent) => {
    if (ev.type === 'mamada') {
      if (ev.feedingType === 'mamadeira') {
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-300 shrink-0" />
            <span className="text-xs font-medium text-amber-200 truncate">
              Mamadeira / Fórmula • {ev.volumeMl}ml
            </span>
          </div>
        );
      }
      const durLabel = formatSecondsHuman(ev.durationSeconds, ev.durationMinutes);
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="text-xs font-medium text-amber-200 truncate">
            Mamada • Peito {ev.breast} ({durLabel})
          </span>
        </div>
      );
    }
    if (ev.type === 'fralda') {
      const label =
        ev.diaperType === 'xixi'
          ? 'Fralda • Só Xixi'
          : ev.diaperType === 'ambos'
          ? 'Fralda • Xixi + Cocô'
          : 'Fralda • Só Cocô';
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-xs font-medium text-emerald-200 truncate">{label}</span>
        </div>
      );
    }
    const sleepDurLabel = formatSecondsHuman(ev.durationSeconds, ev.durationMinutes);
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
        <span className="text-xs font-medium text-sky-200 truncate">
          Sono • {sleepDurLabel}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-4 pt-3 pb-4 gap-3">
      {/* Topo da Área Central: Toast de Confirmação + Últimos Registros */}
      <div className="space-y-2.5">
        {feedbackBanner && (
          <div
            className={`px-3.5 py-2.5 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold shadow-lg transition-all ${
              feedbackBanner.tone === 'amber'
                ? 'bg-amber-950/90 border-amber-400/50 text-amber-200'
                : feedbackBanner.tone === 'emerald'
                ? 'bg-emerald-950/90 border-emerald-400/50 text-emerald-200'
                : 'bg-sky-950/90 border-sky-400/50 text-sky-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackBanner.message}</span>
          </div>
        )}

        {/* Últimos 3 registros de hoje para conferência rápida */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              Últimos registros de hoje ({todayEvents.length})
            </span>
            <span className="text-[10px] text-slate-500">Salvo no localStorage</span>
          </div>

          {recentThree.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">
              Nenhum registro hoje ainda. Use os botões abaixo com um polegar.
            </p>
          ) : (
            <div className="space-y-1">
              {recentThree.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between py-1 px-2 rounded-xl bg-slate-950/50 border border-slate-800/50"
                >
                  {renderEventBadge(ev)}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      {ev.timeFormatted}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteEvent(ev.id, ev.dateKey)}
                      title="Apagar registro"
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-lg active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CARD EM DESTAQUE NO CENTRO DA TELA QUANDO O CRONÔMETRO DE MAMADA ESTIVER RODANDO */}
      {data.activeFeeding.isFeeding && (
        <section
          aria-label="Cronômetro de Mamada Ativo"
          className="my-auto rounded-3xl bg-gradient-to-b from-amber-950/60 via-slate-900/95 to-slate-900 border-2 border-amber-400/60 p-4 shadow-[0_0_35px_rgba(245,158,11,0.18)] space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Mamada em Andamento
              </span>
            </div>

            <button
              type="button"
              onClick={cancelFeedingTimer}
              className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700/70"
            >
              <X className="w-3 h-3" />
              Cancelar
            </button>
          </div>

          {data.activeFeeding.previousSideSaved && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
              <span>
                ✓ 1º lado salvo:{' '}
                <strong>Peito {data.activeFeeding.previousSideSaved.lado}</strong>
              </span>
              <span className="font-mono font-semibold">
                {formatSecondsHuman(
                  data.activeFeeding.previousSideSaved.durationSeconds,
                  data.activeFeeding.previousSideSaved.durationMinutes
                )}
              </span>
            </div>
          )}

          <div className="rounded-2xl bg-slate-950/80 border border-amber-500/30 p-4 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold">
              <HeartHandshake className="w-3.5 h-3.5 text-amber-300" />
              Lado Atual: Peito {currentFeedingSide}
            </div>

            <div className="text-5xl font-mono font-extrabold tracking-tight text-amber-100 py-1">
              {liveFeeding.formatted}
            </div>

            <p className="text-[11px] text-slate-400">
              Sincronizado via timestamp • Seguro mesmo com a tela bloqueada
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleSwitchBreast}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-800/95 hover:bg-slate-800 border border-amber-400/40 text-amber-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md"
            >
              <ArrowRightLeft className="w-4 h-4 text-amber-300" />
              Trocar de Peito (Salvar {currentFeedingSide} e iniciar {oppositeFeedingSide})
            </button>

            <button
              type="button"
              onClick={handleFinishBreastFeeding}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              Finalizar Mamada
            </button>
          </div>
        </section>
      )}

      {/* ZONA DO POLEGAR: 1. Amamentação -> 2. Termômetro de Fraldas -> 3. Controle de Sono & Janela de Sono */}
      <div className="mt-auto space-y-3">
        {/* 1. MÓDULO DE AMAMENTAÇÃO */}
        {!data.activeFeeding.isFeeding && (
          <section className="rounded-3xl bg-gradient-to-b from-slate-900/95 to-slate-900/85 border border-amber-500/25 p-3.5 shadow-lg space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-amber-100 leading-none">
                    Amamentação
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBottlePicker((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                    showBottlePicker
                      ? 'bg-amber-500/25 border-amber-400/60 text-amber-100'
                      : 'bg-slate-800/90 border-slate-700/80 text-amber-200/90 hover:border-amber-500/40'
                  }`}
                >
                  <Milk className="w-3.5 h-3.5 text-amber-300" />
                  Mamadeira / Fórmula
                </button>
              </div>

              <div className="w-full px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-400/35 flex items-center justify-between">
                {lastBreast ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-100 flex-wrap">
                    <span className="text-amber-300/90 font-medium">
                      Último lado: <strong className="text-amber-200">{lastBreast}</strong>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-400/30">
                      Comece pelo {suggestedBreast}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-amber-200/90 font-medium">
                    Nenhuma mamada anterior • Escolha o lado para começar
                  </span>
                )}
              </div>
            </div>

            {showBottlePicker && (
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                    <Milk className="w-3.5 h-3.5 text-amber-300" />
                    Registrar Mamadeira / Fórmula (ml)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBottlePicker(false)}
                    className="text-slate-400 hover:text-slate-200 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 120].map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => handleQuickFormula(ml)}
                      className="py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-bold text-amber-100 active:scale-95 transition-transform"
                    >
                      {ml}ml
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomMl((v) => Math.max(10, v - 10))}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs"
                    >
                      -10
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-200 px-2">
                      {customMl}ml
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomMl((v) => Math.min(250, v + 10))}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs"
                    >
                      +10
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickFormula(customMl)}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs active:scale-95"
                  >
                    Salvar {customMl}ml
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {(['Esquerdo', 'Direito'] as BreastSide[]).map((side) => {
                const isSuggested = suggestedBreast === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => handleStartBreastFeeding(side)}
                    className={`relative py-3.5 px-3.5 rounded-2xl border text-left transition-all active:scale-[0.97] flex flex-col justify-between min-h-[84px] ${
                      isSuggested
                        ? 'bg-amber-500/20 border-amber-400/70 shadow-[0_0_22px_rgba(245,158,11,0.16)]'
                        : 'bg-slate-800/80 border-slate-700/80 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-300/35 flex items-center justify-center text-xs font-extrabold text-amber-200">
                        {side === 'Esquerdo' ? 'E' : 'D'}
                      </span>
                      {isSuggested && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-200 border border-amber-300/40">
                          Recomendado
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <div className="text-[13px] font-extrabold text-slate-100 leading-snug">
                        Mamar: Peito {side}
                      </div>
                      <div className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1 mt-0.5">
                        <Play className="w-3 h-3 fill-current" />
                        Iniciar cronômetro
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. TERMÔMETRO DE FRALDAS (Registro em 1 Toque) */}
        <section className="rounded-3xl bg-gradient-to-b from-slate-900/95 to-slate-900/80 border border-emerald-500/25 p-3.5 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-100 leading-none">
                  Termômetro de Fraldas
                </h2>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  Meta de hidratação RN: <strong>6 a 8 xixis/dia</strong> ({todaySummary.peeCountToday}/{todaySummary.peeGoal} hoje)
                </p>
              </div>
            </div>

            {diaperQuickFeedback && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3 h-3" />
                Fralda registrada!
              </span>
            )}
          </div>

          {/* 3 Botões Rápidos de 1 Toque: "Só Xixi", "Só Cocô" e "Xixi + Cocô" */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDiaperTap('xixi')}
              className="py-3.5 px-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/25 border border-emerald-400/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.12)]"
            >
              <span className="text-base">💧</span>
              <span className="text-xs font-extrabold text-emerald-100">Só Xixi</span>
              <span className="text-[10px] text-emerald-300/85">+1 hidratação</span>
            </button>

            <button
              type="button"
              onClick={() => handleDiaperTap('coco')}
              className="py-3.5 px-2 rounded-2xl bg-slate-800/85 hover:bg-slate-800 border border-slate-700/80 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
            >
              <span className="text-base">💩</span>
              <span className="text-xs font-extrabold text-slate-100">Só Cocô</span>
              <span className="text-[10px] text-slate-400">Registra evacuação</span>
            </button>

            <button
              type="button"
              onClick={() => handleDiaperTap('ambos')}
              className="py-3.5 px-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
            >
              <span className="text-base">💧💩</span>
              <span className="text-xs font-extrabold text-emerald-100">Xixi + Cocô</span>
              <span className="text-[10px] text-emerald-300/85">+1 hidratação</span>
            </button>
          </div>
        </section>

        {/* 3. CONTROLE DE SONO E "JANELA DE SONO" (Regulador de Rotina) */}
        <section className="rounded-3xl bg-gradient-to-b from-slate-900/95 to-slate-900/80 border border-sky-500/25 p-3.5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-sky-100 leading-none">
                  Sono & Janela de Sono
                </h2>
                <p className="text-[11px] text-sky-300/80 mt-0.5">
                  Total dormido hoje: <strong>{todaySummary.totalSleepFormatted}</strong>
                </p>
              </div>
            </div>

            {!data.activeSleep.isSleeping && (
              <div className="flex items-center gap-1">
                {[30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleQuickNap(m)}
                    title={`Registrar soneca de ${m} min`}
                    className="px-2 py-1 rounded-lg bg-slate-800/90 border border-sky-500/25 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20 active:scale-95"
                  >
                    +{m}m
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INDICADOR VISUAL DE "JANELA DE SONO IDEAL (45 a 60 min)" QUANDO ACORDADO */}
          {!data.activeSleep.isSleeping ? (
            <div
              className={`rounded-2xl p-3 border transition-all ${
                wakeWindow.zone === 'tranquila'
                  ? 'bg-emerald-950/35 border-emerald-500/35'
                  : wakeWindow.zone === 'preparar'
                  ? 'bg-amber-950/40 border-amber-400/45'
                  : 'bg-rose-950/40 border-rose-400/45'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-300" />
                  Janela de Sono Ideal (45 a 60 min)
                </span>
                <span className="text-xs font-mono font-bold text-slate-100 bg-slate-950/70 px-2 py-0.5 rounded-lg border border-slate-800">
                  Acordado: {wakeWindow.awakeFormatted}
                </span>
              </div>

              {/* Status Principal Colorido Conforme Regra (<45m Verde, 45-60m Âmbar, >60m Alerta Suave) */}
              <div className="flex items-start gap-2 my-1">
                {wakeWindow.zone === 'tranquila' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                )}
                {wakeWindow.zone === 'preparar' && (
                  <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                )}
                {wakeWindow.zone === 'passou' && (
                  <Flame className="w-4 h-4 text-rose-300 mt-0.5 shrink-0 animate-pulse" />
                )}

                <div>
                  <div
                    className={`text-xs font-extrabold leading-snug ${
                      wakeWindow.zone === 'tranquila'
                        ? 'text-emerald-300'
                        : wakeWindow.zone === 'preparar'
                        ? 'text-amber-200'
                        : 'text-rose-200'
                    }`}
                  >
                    {wakeWindow.statusLabel}
                  </div>
                  <p className="text-[11px] text-slate-300/85 mt-0.5">
                    {wakeWindow.statusSubtext}
                  </p>
                </div>
              </div>

              {/* Barra Termômetro da Janela de Sono (0m -> 45m -> 60m+) */}
              <div className="mt-2.5 space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-950/90 overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      wakeWindow.zone === 'tranquila'
                        ? 'bg-emerald-400'
                        : wakeWindow.zone === 'preparar'
                        ? 'bg-amber-400'
                        : 'bg-gradient-to-r from-amber-400 to-rose-400'
                    }`}
                    style={{ width: `${ Math.max(8, wakeProgressPercent) }%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
                  <span className="text-emerald-300/90">0–44m Tranquila</span>
                  <span className="text-amber-300/90">45–60m Preparar</span>
                  <span className="text-rose-300/90">60m+ Vulcão</span>
                </div>
              </div>

              {/* Ajuste rápido caso a mãe queira informar há quanto tempo o bebê acordou */}
              <div className="mt-2 pt-2 border-t border-slate-800/70 flex items-center justify-between gap-1">
                <span className="text-[10px] text-slate-400">Ajustar vigília:</span>
                <div className="flex items-center gap-1">
                  {[
                    { label: '20m (Verde)', mins: 20 },
                    { label: '50m (Âmbar)', mins: 50 },
                    { label: '70m (Alerta)', mins: 70 },
                  ].map((preset) => (
                    <button
                      key={preset.mins}
                      type="button"
                      onClick={() => setWakeMinutesAgoOverride(preset.mins)}
                      className="px-2 py-0.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-[10px] font-medium text-slate-300 active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Card de Sono em Andamento quando está dormindo */
            <div className="rounded-2xl bg-sky-950/35 border border-sky-400/40 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
                </span>
                <div>
                  <div className="text-xs font-bold text-sky-100">
                    Bebê dormindo tranquilamente
                  </div>
                  <div className="text-[11px] text-sky-300/80">
                    Cronômetro salvo via timestamp no localStorage
                  </div>
                </div>
              </div>
              <span className="text-lg font-mono font-extrabold text-sky-200">
                {liveSleep.formatted}
              </span>
            </div>
          )}

          {/* Botão Grande Principal: "O Bebê Dormiu" <-> "O Bebê Acordou" */}
          <button
            type="button"
            onClick={handleToggleSleep}
            className={`w-full py-4 px-4 rounded-2xl font-bold text-sm flex items-center justify-between transition-all active:scale-[0.98] border ${
              data.activeSleep.isSleeping
                ? 'bg-gradient-to-r from-sky-500/30 to-emerald-500/25 border-sky-300/70 text-sky-50 shadow-[0_0_25px_rgba(56,189,248,0.22)]'
                : 'bg-sky-500/20 hover:bg-sky-500/25 border-sky-400/50 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.12)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  data.activeSleep.isSleeping
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-sky-400 text-slate-950'
                }`}
              >
                {data.activeSleep.isSleeping ? (
                  <Sun className="w-5 h-5 fill-current" />
                ) : (
                  <Moon className="w-5 h-5 fill-current" />
                )}
              </div>
              <div className="text-left">
                <div className="text-base font-extrabold leading-tight">
                  {data.activeSleep.isSleeping ? 'O Bebê Acordou' : 'O Bebê Dormiu'}
                </div>
                <div className="text-[11px] font-normal text-sky-200/85 mt-0.5">
                  {data.activeSleep.isSleeping
                    ? `Dormindo há ${liveSleep.formatted} • Toque para finalizar e salvar`
                    : 'Toque para iniciar o cronômetro de sono'}
                </div>
              </div>
            </div>

            <span className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-sky-400/35 text-xs font-mono font-bold text-sky-200">
              {data.activeSleep.isSleeping ? liveSleep.formatted : 'Dormir'}
            </span>
          </button>
        </section>

        {/* 4. SEÇÃO "CONFIGURAR SIRI" (Links exatos para Atalhos do iPhone) */}
        <section className="rounded-3xl bg-slate-900/75 border border-slate-800 p-3.5 shadow-md space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-200 leading-none">
                  Configurar Siri no iPhone
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Links prontos para colar no app Atalhos (Shortcuts)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInlineSiri((v) => !v)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-semibold text-amber-200 active:scale-95"
            >
              {showInlineSiri ? 'Ocultar Links' : 'Ver Links da Siri'}
            </button>
          </div>

          {showInlineSiri && (
            <div className="space-y-1.5 pt-1">
              {[
                { key: 'mamar_esquerdo', label: 'Mamar Peito Esquerdo' },
                { key: 'mamar_direito', label: 'Mamar Peito Direito' },
                { key: 'parar_mamada', label: 'Finalizar Mamada' },
                { key: 'xixi', label: 'Fralda: Só Xixi' },
                { key: 'coco', label: 'Fralda: Só Cocô' },
                { key: 'xixi_coco', label: 'Fralda: Xixi + Cocô' },
                { key: 'dormiu', label: 'O Bebê Dormiu' },
                { key: 'acordou', label: 'O Bebê Acordou' },
              ].map((item) => {
                const origin =
                  typeof window !== 'undefined'
                    ? window.location.origin
                    : 'http://localhost:5173';
                const fullUrl = `${origin}/?siri=${item.key}`;
                const isCopied = copiedSiriKey === item.key;

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 text-[11px]">
                        {item.label}
                      </div>
                      <code className="text-[10px] font-mono text-amber-300/90 block truncate">
                        {fullUrl}
                      </code>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => executeSiriCommand(item.key)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300"
                        title="Simular comando agora"
                      >
                        Testar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(fullUrl);
                          setCopiedSiriKey(item.key);
                          window.setTimeout(() => setCopiedSiriKey(null), 2000);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                          isCopied
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500/20 text-amber-200 border border-amber-400/35'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
