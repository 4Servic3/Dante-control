import React, { useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  HeartHandshake,
  Mic,
  Moon,
  X,
} from 'lucide-react';
import { useRoutine } from '../context/RoutineContext';
import { SiriShortcutsPanel } from './SiriShortcutsPanel';

export const TranquilityHeader: React.FC = () => {
  const {
    todaySummary,
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
  const goalReached = peeCountToday >= peeGoal;

  return (
    <>
      <header className="px-4 pt-4 pb-2 bg-[#F2F2F7]/90 backdrop-blur-xl sticky top-0 z-20">
        {/* Banner de Confirmação da Siri (Padrão Apple Notification Card Claro) */}
        {siriConfirmationBanner && (
          <div
            role="status"
            aria-live="polite"
            className="mb-3.5 p-4 rounded-2xl bg-white shadow-md border border-black/[0.04] flex items-start justify-between gap-3 transition-all"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  siriConfirmationBanner.tone === 'amber'
                    ? 'bg-[#FFF0ED] text-[#FF6B4A]'
                    : siriConfirmationBanner.tone === 'emerald'
                    ? 'bg-[#E8F8EE] text-[#34C759]'
                    : 'bg-[#F2F0FF] text-[#5856D6]'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Atalho da Siri • {siriConfirmationBanner.timeFormatted}
                </span>
                <p className="text-sm font-bold text-[#1C1C1E] mt-0.5 leading-snug">
                  {siriConfirmationBanner.title}
                </p>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  {siriConfirmationBanner.detail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissSiriBanner}
              className="p-1.5 rounded-full bg-[#F2F2F7] text-[#8E8E93] hover:text-[#1C1C1E] shrink-0 active:scale-95"
              aria-label="Fechar confirmação da Siri"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cabeçalho Estilo Apple Health: Título à esquerda + Pílula "Atalhos da Siri" à direita */}
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <p className="text-xs font-medium text-[#8E8E93] leading-none mb-1">
              Olá, Mamãe
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E] leading-none">
              Rotina do Bebê
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsSiriModalOpen(true)}
            className="bg-white shadow-sm border border-black/[0.04] text-[#007AFF] font-medium rounded-full px-3 py-1.5 text-sm inline-flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Mic className="w-3.5 h-3.5 text-[#007AFF]" />
            Atalhos da Siri
          </button>
        </div>

        {/* Painel de Tranquilidade: 3 Cards Brancos Limpos (Apple Health Summary Cards) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. Card Amamentação (Rosa-Coral / Pêssego Suave) */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-black/[0.04] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#FFF0ED] flex items-center justify-center text-[#FF6B4A] shrink-0">
                <HeartHandshake className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#8E8E93] truncate">
                Mamada
              </span>
            </div>

            <div className="my-0.5">
              <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight leading-tight truncate">
                {timeSinceLastFeedingText}
              </p>
            </div>

            <div className="mt-2">
              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF0ED] text-[#FF6B4A] truncate max-w-full">
                {lastBreastUsed ? `Peito ${lastBreastUsed}` : 'Sem registro'}
              </span>
            </div>
          </div>

          {/* 2. Card Hidratação / Fraldas (Azul-Celeste Suave) */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-black/[0.04] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#EBF5FF] flex items-center justify-center text-[#007AFF] shrink-0">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#8E8E93] truncate">
                Hidratação
              </span>
            </div>

            <div className="my-0.5">
              <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight leading-tight">
                {peeCountToday}/{peeGoal}{' '}
                <span className="text-xs font-medium text-[#8E8E93]">xixis</span>
              </p>
            </div>

            <div className="mt-2">
              <span
                className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-full ${
                  goalReached
                    ? 'bg-[#E8F8EE] text-[#34C759]'
                    : 'bg-[#EBF5FF] text-[#007AFF]'
                }`}
              >
                {goalReached ? 'Meta atingida' : 'Meta: 6 a 8/dia'}
              </span>
            </div>
          </div>

          {/* 3. Card Sono (Lavanda / Índigo Suave) */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-black/[0.04] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#F2F0FF] flex items-center justify-center text-[#5856D6] shrink-0">
                <Moon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#8E8E93] truncate">
                Sono hoje
              </span>
            </div>

            <div className="my-0.5">
              <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight leading-tight">
                {totalSleepFormatted}
              </p>
            </div>

            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isSleeping
                    ? 'bg-[#F2F0FF] text-[#5856D6]'
                    : 'bg-[#E8F8EE] text-[#34C759]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSleeping ? 'bg-[#5856D6] animate-pulse' : 'bg-[#34C759]'
                  }`}
                />
                {sleepStatus}
              </span>
            </div>
          </div>
        </div>
      </header>

      <SiriShortcutsPanel
        isOpen={isSiriModalOpen}
        onClose={() => setIsSiriModalOpen(false)}
      />
    </>
  );
};
