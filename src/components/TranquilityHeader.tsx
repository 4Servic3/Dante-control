import React, { useState } from 'react';
import {
  Baby,
  CheckCircle2,
  Clock,
  Droplets,
  Mic,
  Moon,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useRoutine } from '../context/RoutineContext';
import { SiriShortcutsPanel } from './SiriShortcutsPanel';

export const TranquilityHeader: React.FC = () => {
  const {
    data,
    todaySummary,
    now,
    siriConfirmationBanner,
    dismissSiriBanner,
  } = useRoutine();

  const [isSiriModalOpen, setIsSiriModalOpen] = useState(false);

  const {
    timeSinceLastFeedingText,
    lastBreastUsed,
    peeCountToday,
    peeGoal,
    totalSleepFormatted,
    sleepStatus,
  } = todaySummary;

  const isSleeping = sleepStatus === 'Dormindo';
  const peeProgressPercent = Math.min(100, Math.round((peeCountToday / peeGoal) * 100));
  const goalReached = peeCountToday >= peeGoal;

  const formattedCurrentTime = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <header className="px-4 pt-3 pb-3 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20">
        {/* BANNER GRANDE DE CONFIRMAÇÃO DA SIRI NO TOPO DA TELA */}
        {siriConfirmationBanner && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-3 p-3.5 rounded-2xl border-2 shadow-xl flex items-start justify-between gap-3 transition-all ${
              siriConfirmationBanner.tone === 'amber'
                ? 'bg-gradient-to-r from-amber-950/95 to-slate-900 border-amber-400/70 text-amber-100 shadow-amber-500/15'
                : siriConfirmationBanner.tone === 'emerald'
                ? 'bg-gradient-to-r from-emerald-950/95 to-slate-900 border-emerald-400/70 text-emerald-100 shadow-emerald-500/15'
                : 'bg-gradient-to-r from-sky-950/95 to-slate-900 border-sky-400/70 text-sky-100 shadow-sky-500/15'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  siriConfirmationBanner.tone === 'amber'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-300/40'
                    : siriConfirmationBanner.tone === 'emerald'
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-300/40'
                    : 'bg-sky-400/20 text-sky-300 border border-sky-300/40'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10">
                    Comando Siri Executado
                  </span>
                  <span className="text-[10px] font-mono opacity-80">
                    {siriConfirmationBanner.timeFormatted}
                  </span>
                </div>
                <p className="text-sm font-extrabold mt-1 leading-snug">
                  {siriConfirmationBanner.title}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {siriConfirmationBanner.detail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissSiriBanner}
              className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 shrink-0"
              aria-label="Fechar confirmação da Siri"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Linha de Topo: Identificação do Painel + Botão Configurar Siri + Relógio */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Baby className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-slate-200">
                Painel de Tranquilidade
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                Hoje
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setIsSiriModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/95 hover:bg-slate-800 border border-amber-400/35 text-[11px] font-semibold text-amber-200 active:scale-95 transition-all"
            >
              <Mic className="w-3 h-3 text-amber-300" />
              Configurar Siri
            </button>

            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 font-medium text-[11px]">
              <Clock className="w-3 h-3 text-amber-300/80" />
              {formattedCurrentTime}
            </span>
          </div>
        </div>

        {/* Grid de 3 Cartões Compactos do Painel de Tranquilidade */}
        <div className="grid grid-cols-3 gap-2">
          {/* 1. Última Mamada (Âmbar Suave) */}
          <div className="rounded-2xl bg-slate-900/90 border border-amber-500/20 p-2.5 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-amber-300/90 mb-1">
              <span className="text-[11px] font-medium tracking-tight text-amber-200/80">
                Última mamada
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400/80" />
            </div>

            <div className="my-0.5">
              <p className="text-sm font-bold text-amber-100 leading-tight truncate">
                {timeSinceLastFeedingText}
              </p>
            </div>

            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] text-slate-400">Último:</span>
              {lastBreastUsed ? (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  Peito {lastBreastUsed}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">—</span>
              )}
            </div>
          </div>

          {/* 2. Hidratação / Xixis do Dia (Verde Menta) */}
          <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/20 p-2.5 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-emerald-300/90 mb-1">
              <span className="text-[11px] font-medium tracking-tight text-emerald-200/80">
                Hidratação
              </span>
              <Droplets className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <div className="my-0.5 flex items-baseline gap-1">
              <p className="text-sm font-bold text-emerald-100 leading-tight">
                {peeCountToday}/{peeGoal}
              </p>
              <span className="text-[11px] text-emerald-300/80 font-medium">
                xixis hoje
              </span>
            </div>

            <div className="mt-1.5">
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: peeGoal }).map((_, idx) => {
                  const filled = idx < peeCountToday;
                  return (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        filled
                          ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.45)]'
                          : 'bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[9px] text-slate-400">
                  {goalReached
                    ? 'Meta atingida (6–8)'
                    : `Meta RN: 6–8 (${peeProgressPercent}%)`}
                </span>
                {goalReached && <Sparkles className="w-2.5 h-2.5 text-emerald-300" />}
              </div>
            </div>
          </div>

          {/* 3. Sono de Hoje + Status Atual (Azul Sereno) */}
          <div className="rounded-2xl bg-slate-900/90 border border-sky-500/20 p-2.5 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-sky-300/90 mb-1">
              <span className="text-[11px] font-medium tracking-tight text-sky-200/80">
                Sono hoje
              </span>
              {isSleeping ? (
                <Moon className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-300/80" />
              )}
            </div>

            <div className="my-0.5">
              <p className="text-sm font-bold text-sky-100 leading-tight">
                {totalSleepFormatted}
              </p>
            </div>

            <div className="mt-1 flex items-center">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                  isSleeping
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700/70'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSleeping ? 'bg-sky-400 animate-ping' : 'bg-emerald-400'
                  }`}
                />
                {sleepStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-barra sutil se houver mamada em andamento */}
        {data.activeFeeding.isFeeding && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-between text-xs text-amber-200">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Mamando agora • Peito {data.activeFeeding.breast}
            </span>
            <span className="text-[11px] text-amber-300/80">Cronômetro ativo abaixo</span>
          </div>
        )}
      </header>

      <SiriShortcutsPanel
        isOpen={isSiriModalOpen}
        onClose={() => setIsSiriModalOpen(false)}
      />
    </>
  );
};
