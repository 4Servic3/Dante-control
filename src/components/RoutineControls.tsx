import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Droplets,
  Flame,
  HeartHandshake,
  Milk,
  Moon,
  Play,
  Sparkles,
  Square,
  Sun,
  X,
} from 'lucide-react';
import { useRoutine } from '../context/RoutineContext';
import { BreastSide, DiaperSubType } from '../types/routine';
import { formatLiveTimer, formatSecondsHuman } from '../utils/dateHelpers';

export const RoutineControls: React.FC = () => {
  const {
    data,
    now,
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
  } = useRoutine();

  const [showBottlePicker, setShowBottlePicker] = useState(false);
  const [customMl, setCustomMl] = useState<number>(60);
  const [diaperQuickFeedback, setDiaperQuickFeedback] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    message: string;
    tone: 'peach' | 'blue' | 'indigo' | 'mint';
  } | null>(null);

  const triggerFeedback = (
    message: string,
    tone: 'peach' | 'blue' | 'indigo' | 'mint'
  ) => {
    setFeedbackBanner({ message, tone });
    window.clearTimeout((window as unknown as { __rotineToast?: number }).__rotineToast);
    (window as unknown as { __rotineToast?: number }).__rotineToast = window.setTimeout(() => {
      setFeedbackBanner(null);
    }, 3400);
  };

  // 1. Iniciar Mamada
  const handleStartBreastFeeding = (lado: BreastSide) => {
    startFeedingTimer(lado);
    triggerFeedback(`Mamada iniciada no Peito ${lado}`, 'peach');
  };

  // 2. Trocar de Peito: salva o tempo do 1º peito no histórico e já inicia o outro
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
        `Peito ${firstSaved.breast} salvo (${durationText}) • Agora no Peito ${nextSide}`,
        'peach'
      );
    }
  };

  // 3. Finalizar Mamada
  const handleFinishBreastFeeding = () => {
    const saved = stopFeedingTimer();
    if (saved) {
      const durationText = formatSecondsHuman(
        saved.durationSeconds,
        saved.durationMinutes
      );
      triggerFeedback(
        `Mamada registrada • Peito ${saved.breast} (${durationText})`,
        'peach'
      );
    }
  };

  // 4. Registrar Mamadeira / Fórmula em ml
  const handleQuickFormula = (ml: number) => {
    addMamadeira(ml);
    setShowBottlePicker(false);
    triggerFeedback(`Mamadeira registrada (${ml}ml)`, 'peach');
  };

  // 5. Termômetro de Fraldas (1 Toque)
  const handleDiaperTap = (type: DiaperSubType) => {
    const saved = addFralda(type);
    const labelMap: Record<DiaperSubType, string> = {
      xixi: `Fralda registrada! (Só Xixi às ${saved.timeFormatted})`,
      coco: `Fralda registrada! (Só Cocô às ${saved.timeFormatted})`,
      ambos: `Fralda registrada! (Xixi + Cocô às ${saved.timeFormatted})`,
    };
    setDiaperQuickFeedback('Fralda registrada!');
    window.clearTimeout(
      (window as unknown as { __diaperToast?: number }).__diaperToast
    );
    (window as unknown as { __diaperToast?: number }).__diaperToast = window.setTimeout(
      () => {
        setDiaperQuickFeedback(null);
      },
      2800
    );
    triggerFeedback(labelMap[type], 'blue');
  };

  // 6. Alternar "O Bebê Dormiu" <-> "O Bebê Acordou"
  const handleToggleSleep = () => {
    const wasSleeping = data.activeSleep.isSleeping;
    const savedSleep = toggleSleep();
    if (!wasSleeping) {
      triggerFeedback('Cronômetro de sono iniciado • Bons sonhos!', 'indigo');
    } else if (savedSleep) {
      const durationText = formatSecondsHuman(
        savedSleep.durationSeconds,
        savedSleep.durationMinutes
      );
      triggerFeedback(`O bebê acordou • Sono de ${durationText} salvo`, 'indigo');
    }
  };

  const handleQuickNap = (mins: number) => {
    addManualSono(mins);
    triggerFeedback(`Soneca de ${mins} min adicionada ao resumo de hoje`, 'indigo');
  };

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

  const wakeProgressPercent = Math.min(
    100,
    Math.round(((wakeWindow.awakeMinutes ?? 0) / 75) * 100)
  );

  return (
    <div className="flex-1 flex flex-col px-4 pt-2 pb-6 space-y-3.5">
      {/* Feedback visual suave estilo iOS Toast */}
      {feedbackBanner && (
        <div
          className={`px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-sm transition-all ${
            feedbackBanner.tone === 'peach'
              ? 'bg-[#FFF0ED] text-[#D94E34]'
              : feedbackBanner.tone === 'blue'
              ? 'bg-[#EBF5FF] text-[#007AFF]'
              : feedbackBanner.tone === 'mint'
              ? 'bg-[#E8F8EE] text-[#34C759]'
              : 'bg-[#F2F0FF] text-[#5856D6]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackBanner.message}</span>
        </div>
      )}

      {/* 1. CARD DE AMAMENTAÇÃO (Rosa-Coral / Pêssego Suave) */}
      {data.activeFeeding.isFeeding ? (
        /* Card em Destaque quando o Cronômetro de Mamada está Rodando */
        <section
          aria-label="Cronômetro de Mamada Ativo"
          className="bg-white rounded-3xl p-5 shadow-sm border border-black/[0.04] space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B4A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6B4A]" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B4A]">
                Mamando Agora
              </span>
            </div>

            <button
              type="button"
              onClick={cancelFeedingTimer}
              className="text-xs font-medium text-[#8E8E93] hover:text-[#1C1C1E] flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F2F7] active:scale-95 transition-transform"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>

          {data.activeFeeding.previousSideSaved && (
            <div className="px-3.5 py-2 rounded-xl bg-[#E8F8EE] text-[#34C759] flex items-center justify-between text-xs font-semibold">
              <span>
                ✓ 1º lado salvo: Peito {data.activeFeeding.previousSideSaved.lado}
              </span>
              <span>
                {formatSecondsHuman(
                  data.activeFeeding.previousSideSaved.durationSeconds,
                  data.activeFeeding.previousSideSaved.durationMinutes
                )}
              </span>
            </div>
          )}

          {/* Mostrador Central Suave em Tom Pêssego */}
          <div className="rounded-2xl bg-[#FFF0ED] p-5 text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#FF6B4A] text-xs font-bold shadow-sm">
              <HeartHandshake className="w-3.5 h-3.5" />
              Peito {currentFeedingSide}
            </div>

            <div className="text-5xl font-bold tracking-tight text-[#1C1C1E] py-1 tabular-nums">
              {liveFeeding.formatted}
            </div>

            <p className="text-xs text-[#D94E34]/80 font-medium">
              Continua contando mesmo com a tela bloqueada
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleSwitchBreast}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <ArrowRightLeft className="w-4 h-4 text-[#FF6B4A]" />
              Trocar para o Peito {oppositeFeedingSide}
            </button>

            <button
              type="button"
              onClick={handleFinishBreastFeeding}
              className="w-full py-4 px-4 rounded-2xl bg-[#FF6B4A] text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-[#FF6B4A]/20 active:scale-[0.97] transition-transform"
            >
              <Square className="w-4 h-4 fill-current" />
              Finalizar Mamada
            </button>
          </div>
        </section>
      ) : (
        /* Card Padrão de Amamentação */
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-black/[0.04] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#FFF0ED] flex items-center justify-center text-[#FF6B4A]">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1C1C1E] leading-tight">
                  Amamentação
                </h2>
                <p className="text-xs text-[#8E8E93]">
                  Toque para iniciar o cronômetro
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBottlePicker((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 active:scale-[0.97] transition-transform ${
                showBottlePicker
                  ? 'bg-[#FFF0ED] text-[#FF6B4A]'
                  : 'bg-[#F2F2F7] text-[#1C1C1E]'
              }`}
            >
              <Milk className="w-3.5 h-3.5 text-[#FF6B4A]" />
              Mamadeira
            </button>
          </div>

          {/* Banner Suave Cor de Pêssego Claro indicando o Próximo Lado */}
          <div className="bg-[#FFF0ED] text-[#D94E34] rounded-xl p-3 font-medium text-xs flex items-center justify-between">
            {lastBreast ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>
                  Último lado: <strong>{lastBreast}</strong>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FF6B4A] shrink-0" />
                <span className="font-bold text-[#FF6B4A]">
                  Comece pelo Peito {suggestedBreast}
                </span>
              </div>
            ) : (
              <span>Escolha o peito para iniciar a primeira mamada</span>
            )}
          </div>

          {/* Seletor Rápido de Mamadeira / Fórmula (ml) */}
          {showBottlePicker && (
            <div className="p-3.5 rounded-2xl bg-[#F2F2F7] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                  <Milk className="w-3.5 h-3.5 text-[#FF6B4A]" />
                  Volume de Mamadeira / Fórmula
                </span>
                <button
                  type="button"
                  onClick={() => setShowBottlePicker(false)}
                  className="text-[#8E8E93] hover:text-[#1C1C1E] p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 120].map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => handleQuickFormula(ml)}
                    className="py-2.5 rounded-xl bg-white text-[#1C1C1E] shadow-sm text-xs font-bold active:scale-[0.97] transition-transform"
                  >
                    {ml}ml
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomMl((v) => Math.max(10, v - 10))}
                    className="w-8 h-8 rounded-xl bg-white text-[#1C1C1E] shadow-sm font-bold text-xs active:scale-95"
                  >
                    -10
                  </button>
                  <span className="text-xs font-bold text-[#1C1C1E] px-2 tabular-nums">
                    {customMl}ml
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomMl((v) => Math.min(250, v + 10))}
                    className="w-8 h-8 rounded-xl bg-white text-[#1C1C1E] shadow-sm font-bold text-xs active:scale-95"
                  >
                    +10
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickFormula(customMl)}
                  className="px-3.5 py-2 rounded-xl bg-[#FF6B4A] text-white font-semibold text-xs shadow-sm active:scale-[0.97] transition-transform"
                >
                  Registrar {customMl}ml
                </button>
              </div>
            </div>
          )}

          {/* Dois Botões Grandes de Início Rápido: Recomendado em #FF6B4A e Outro em #F2F2F7 */}
          <div className="grid grid-cols-2 gap-3">
            {(['Esquerdo', 'Direito'] as BreastSide[]).map((side) => {
              const isSuggested = suggestedBreast === side;
              return (
                <button
                  key={side}
                  type="button"
                  onClick={() => handleStartBreastFeeding(side)}
                  className={`py-4 px-4 rounded-2xl text-left flex flex-col justify-between min-h-[92px] active:scale-[0.97] transition-transform ${
                    isSuggested
                      ? 'bg-[#FF6B4A] text-white shadow-md shadow-[#FF6B4A]/20'
                      : 'bg-[#F2F2F7] text-[#1C1C1E]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSuggested
                          ? 'bg-white/25 text-white'
                          : 'bg-white text-[#1C1C1E] shadow-sm'
                      }`}
                    >
                      {side === 'Esquerdo' ? 'E' : 'D'}
                    </span>
                    {isSuggested && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-bold leading-snug">
                      Peito {side}
                    </div>
                    <div
                      className={`text-[11px] font-medium flex items-center gap-1 mt-0.5 ${
                        isSuggested ? 'text-white/90' : 'text-[#8E8E93]'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Mamar agora
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. CARD DE FRALDAS (Azul-Celeste Suave) */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-black/[0.04] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EBF5FF] flex items-center justify-center text-[#007AFF]">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1C1E] leading-tight">
                Fraldas & Hidratação
              </h2>
              <p className="text-xs text-[#8E8E93]">
                Meta saudável: 6 a 8 xixis/dia ({todaySummary.peeCountToday}/{todaySummary.peeGoal} hoje)
              </p>
            </div>
          </div>

          {diaperQuickFeedback && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E8F8EE] text-[#34C759] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {diaperQuickFeedback}
            </span>
          )}
        </div>

        {/* 3 Botões Rápidos de 1 Toque em Tons Pastel Suaves */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleDiaperTap('xixi')}
            className="py-3.5 px-2 rounded-2xl bg-[#EBF5FF] text-[#007AFF] flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform"
          >
            <span className="text-lg">💧</span>
            <span className="text-xs font-bold">Só Xixi</span>
            <span className="text-[10px] text-[#007AFF]/75 font-medium">+1 xixi</span>
          </button>

          <button
            type="button"
            onClick={() => handleDiaperTap('coco')}
            className="py-3.5 px-2 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform"
          >
            <span className="text-lg">💩</span>
            <span className="text-xs font-bold">Só Cocô</span>
            <span className="text-[10px] text-[#8E8E93] font-medium">Evacuação</span>
          </button>

          <button
            type="button"
            onClick={() => handleDiaperTap('ambos')}
            className="py-3.5 px-2 rounded-2xl bg-[#EBF5FF] text-[#007AFF] flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform"
          >
            <span className="text-lg">💧💩</span>
            <span className="text-xs font-bold">Xixi + Cocô</span>
            <span className="text-[10px] text-[#007AFF]/75 font-medium">+1 xixi</span>
          </button>
        </div>
      </section>

      {/* 3. CARD DE SONO E JANELA DE SONO (Lavanda / Índigo Suave) */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-black/[0.04] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#F2F0FF] flex items-center justify-center text-[#5856D6]">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1C1E] leading-tight">
                Sono & Janela Ideal
              </h2>
              <p className="text-xs text-[#8E8E93]">
                Total dormido hoje: <strong className="text-[#1C1C1E]">{todaySummary.totalSleepFormatted}</strong>
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
                  title={`Adicionar soneca de ${m} min`}
                  className="px-2.5 py-1 rounded-full bg-[#F2F2F7] text-[11px] font-semibold text-[#5856D6] active:scale-95 transition-transform"
                >
                  +{m}m
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Indicador Visual de Janela de Sono Ideal (45 a 60 min) quando Acordado */}
        {!data.activeSleep.isSleeping ? (
          <div
            className={`rounded-2xl p-3.5 transition-all ${
              wakeWindow.zone === 'tranquila'
                ? 'bg-[#E8F8EE]'
                : wakeWindow.zone === 'preparar'
                ? 'bg-[#FFF8E6]'
                : 'bg-[#FFF0ED]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-[#1C1C1E]/70 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#5856D6]" />
                Janela de Sono (45 a 60 min)
              </span>
              <span className="text-xs font-bold text-[#1C1C1E] bg-white/80 px-2.5 py-0.5 rounded-full">
                Acordado: {wakeWindow.awakeFormatted}
              </span>
            </div>

            <div className="flex items-start gap-2 my-1">
              {wakeWindow.zone === 'tranquila' && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] mt-1 shrink-0" />
              )}
              {wakeWindow.zone === 'preparar' && (
                <AlertTriangle className="w-4 h-4 text-[#D97706] mt-0.5 shrink-0" />
              )}
              {wakeWindow.zone === 'passou' && (
                <Flame className="w-4 h-4 text-[#FF6B4A] mt-0.5 shrink-0" />
              )}

              <div>
                <div
                  className={`text-xs font-bold leading-snug ${
                    wakeWindow.zone === 'tranquila'
                      ? 'text-[#248A3D]'
                      : wakeWindow.zone === 'preparar'
                      ? 'text-[#B45309]'
                      : 'text-[#D94E34]'
                  }`}
                >
                  {wakeWindow.statusLabel}
                </div>
                <p className="text-[11px] text-[#1C1C1E]/70 mt-0.5">
                  {wakeWindow.statusSubtext}
                </p>
              </div>
            </div>

            {/* Barra de Progresso Suave da Janela de Sono */}
            <div className="mt-2.5 space-y-1">
              <div className="h-2 w-full rounded-full bg-white/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    wakeWindow.zone === 'tranquila'
                      ? 'bg-[#34C759]'
                      : wakeWindow.zone === 'preparar'
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#FF6B4A]'
                  }`}
                  style={{ width: `${Math.max(8, wakeProgressPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8E8E93] font-medium px-0.5">
                <span>0–44m Tranquila</span>
                <span>45–60m Preparar</span>
                <span>60m+ Cansaço</span>
              </div>
            </div>

            {/* Ajuste rápido de tempo acordado */}
            <div className="mt-2.5 pt-2 border-t border-black/[0.05] flex items-center justify-between gap-1">
              <span className="text-[10px] font-medium text-[#8E8E93]">
                Simular vigília:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: '20m', mins: 20 },
                  { label: '50m', mins: 50 },
                  { label: '70m', mins: 70 },
                ].map((preset) => (
                  <button
                    key={preset.mins}
                    type="button"
                    onClick={() => setWakeMinutesAgoOverride(preset.mins)}
                    className="px-2.5 py-0.5 rounded-full bg-white/90 text-[10px] font-semibold text-[#1C1C1E] shadow-sm active:scale-95"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Card de Sono em Andamento */
          <div className="rounded-2xl bg-[#F2F0FF] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5856D6] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5856D6]" />
              </span>
              <div>
                <div className="text-xs font-bold text-[#1C1C1E]">
                  Bebê dormindo tranquilamente
                </div>
                <div className="text-[11px] text-[#5856D6] font-medium">
                  Toque abaixo quando ele acordar
                </div>
              </div>
            </div>
            <span className="text-xl font-bold text-[#5856D6] tabular-nums">
              {liveSleep.formatted}
            </span>
          </div>
        )}

        {/* Botão Principal Grande: "O Bebê Dormiu" <-> "O Bebê Acordou" */}
        <button
          type="button"
          onClick={handleToggleSleep}
          className="w-full py-4 px-4 rounded-2xl bg-[#5856D6] text-white font-bold text-sm flex items-center justify-between shadow-md shadow-[#5856D6]/20 active:scale-[0.97] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              {data.activeSleep.isSleeping ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </div>
            <div className="text-left">
              <div className="text-base font-bold leading-tight">
                {data.activeSleep.isSleeping ? 'O Bebê Acordou' : 'O Bebê Dormiu'}
              </div>
              <div className="text-xs font-normal text-white/85 mt-0.5">
                {data.activeSleep.isSleeping
                  ? `Dormindo há ${liveSleep.formatted} • Toque para salvar`
                  : 'Iniciar cronômetro de sono'}
              </div>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-full bg-white/20 text-xs font-bold text-white tabular-nums">
            {data.activeSleep.isSleeping ? liveSleep.formatted : 'Iniciar'}
          </span>
        </button>
      </section>
    </div>
  );
};
