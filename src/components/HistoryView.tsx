import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  HeartHandshake,
  Moon,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useRoutine } from '../context/RoutineContext';
import {
  BreastSide,
  DiaperSubType,
  EventType,
  FeedingSubType,
  RoutineEvent,
} from '../types/routine';
import {
  formatDurationMinutes,
  formatSecondsHuman,
  formatTimeHHMM,
} from '../utils/dateHelpers';

export const HistoryView: React.FC = () => {
  const {
    todayEvents,
    allEventsSorted,
    addManualEventToday,
    deleteEvent,
    clearAllRecords,
  } = useRoutine();

  const [filter, setFilter] = useState<'todos' | EventType>('todos');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFeedback, setManualFeedback] = useState<string | null>(null);
  const [confirmResetModal, setConfirmResetModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const [manualType, setManualType] = useState<EventType>('mamada');
  const [manualTime, setManualTime] = useState<string>(() => {
    const oneHourAgo = new Date(Date.now() - 45 * 60000);
    return formatTimeHHMM(oneHourAgo);
  });
  const [manualEndTime, setManualEndTime] = useState<string>(() => {
    return formatTimeHHMM(new Date());
  });
  const [manualFeedingKind, setManualFeedingKind] = useState<FeedingSubType>('peito');
  const [manualBreast, setManualBreast] = useState<BreastSide>('Esquerdo');
  const [manualDuration, setManualDuration] = useState<number>(18);
  const [manualVolumeMl, setManualVolumeMl] = useState<number>(60);
  const [manualDiaperType, setManualDiaperType] = useState<DiaperSubType>('xixi');
  const [manualNotes, setManualNotes] = useState<string>('');

  const filteredTodayEvents = todayEvents.filter((ev) =>
    filter === 'todos' ? true : ev.type === filter
  );

  const handleOpenManualForm = () => {
    const now = new Date();
    const fortyFiveAgo = new Date(now.getTime() - 45 * 60000);
    setManualTime(formatTimeHHMM(fortyFiveAgo));
    setManualEndTime(formatTimeHHMM(now));
    setShowManualModal(true);
  };

  const handleSaveManualEvent = (e: React.FormEvent) => {
    e.preventDefault();
    addManualEventToday({
      type: manualType,
      timeHHMM: manualTime,
      feedingType: manualFeedingKind,
      breast: manualBreast,
      durationMinutes: manualDuration,
      volumeMl: manualVolumeMl,
      diaperType: manualDiaperType,
      endTimeHHMM: manualType === 'sono' ? manualEndTime : undefined,
      notes: manualNotes.trim() || undefined,
    });

    setShowManualModal(false);
    setManualNotes('');
    setManualFeedback('Registro adicionado manualmente à linha do tempo de hoje!');
    window.setTimeout(() => setManualFeedback(null), 3500);
  };

  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      await clearAllRecords();
      setConfirmResetModal(false);
      setManualFeedback('Todos os dados do aplicativo foram zerados com sucesso.');
      window.setTimeout(() => setManualFeedback(null), 3500);
    } finally {
      setIsClearingAll(false);
    }
  };

  const renderTimelineItem = (ev: RoutineEvent) => {
    if (ev.type === 'mamada') {
      const isBottle = ev.feedingType === 'mamadeira';
      const durText = formatSecondsHuman(ev.durationSeconds, ev.durationMinutes);
      const titleText = isBottle
        ? `${ev.timeFormatted} - Mamada (Mamadeira / Fórmula) - ${ev.volumeMl}ml`
        : `${ev.timeFormatted} - Mamada (Peito ${ev.breast}) - ${durText}`;

      return (
        <div
          key={ev.id}
          className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white shadow-sm border border-black/[0.04]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0ED] flex items-center justify-center text-[#FF6B4A] shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1C1C1E] leading-snug">
                {titleText}
              </p>
              {ev.notes && (
                <p className="text-[11px] text-[#8E8E93] mt-0.5 truncate">
                  {ev.notes}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => deleteEvent(ev.id, ev.dateKey)}
            className="p-2 text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FFF0ED] rounded-full transition-colors shrink-0 active:scale-95"
            title="Excluir registro"
            aria-label="Excluir registro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (ev.type === 'fralda') {
      const diaperLabel =
        ev.diaperType === 'xixi'
          ? 'Só Xixi'
          : ev.diaperType === 'coco'
          ? 'Só Cocô'
          : 'Xixi + Cocô';
      const titleText = `${ev.timeFormatted} - Fralda: ${diaperLabel}`;

      return (
        <div
          key={ev.id}
          className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white shadow-sm border border-black/[0.04]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF5FF] flex items-center justify-center text-[#007AFF] shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1C1C1E] leading-snug">
                {titleText}
              </p>
              <p className="text-[11px] text-[#8E8E93] mt-0.5 truncate">
                {ev.hasPee ? '💧 Hidratação contabilizada' : '💩 Evacuação registrada'}
                {ev.notes ? ` • ${ev.notes}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => deleteEvent(ev.id, ev.dateKey)}
            className="p-2 text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FFF0ED] rounded-full transition-colors shrink-0 active:scale-95"
            title="Excluir registro"
            aria-label="Excluir registro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      );
    }

    const startHHMM = ev.startTime
      ? formatTimeHHMM(new Date(ev.startTime))
      : ev.timeFormatted;
    const endHHMM = ev.endTime
      ? formatTimeHHMM(new Date(ev.endTime))
      : formatTimeHHMM(new Date(ev.timestamp));
    const formattedSleepDuration =
      ev.durationSeconds && ev.durationSeconds < 60
        ? formatSecondsHuman(ev.durationSeconds, ev.durationMinutes)
        : formatDurationMinutes(ev.durationMinutes);
    const titleText = `${startHHMM} às ${endHHMM} - Sono (${formattedSleepDuration})`;

    return (
      <div
        key={ev.id}
        className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white shadow-sm border border-black/[0.04]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#F2F0FF] flex items-center justify-center text-[#5856D6] shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#1C1C1E] leading-snug">
              {titleText}
            </p>
            {ev.notes && (
              <p className="text-[11px] text-[#8E8E93] mt-0.5 truncate">
                {ev.notes}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => deleteEvent(ev.id, ev.dateKey)}
          className="p-2 text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FFF0ED] rounded-full transition-colors shrink-0 active:scale-95"
          title="Excluir registro"
          aria-label="Excluir registro"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 px-4 pt-2 pb-6 space-y-3.5 overflow-y-auto">
      {/* Cabeçalho + Botão "+ Adicionar Manualmente" */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#1C1C1E] leading-tight">
            Linha do Tempo de Hoje
          </h2>
          <p className="text-xs text-[#8E8E93]">
            {todayEvents.length} registros realizados hoje
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenManualForm}
          className="px-3.5 py-2 rounded-full bg-[#007AFF] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-[0.97] transition-transform shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Adicionar Manualmente
        </button>
      </div>

      {/* Feedback de adição manual */}
      {manualFeedback && (
        <div className="px-4 py-3 rounded-2xl bg-[#E8F8EE] text-[#34C759] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{manualFeedback}</span>
        </div>
      )}

      {/* Formulário "+ Adicionar Manualmente" */}
      {showManualModal && (
        <form
          onSubmit={handleSaveManualEvent}
          className="rounded-3xl bg-white p-5 space-y-4 shadow-md border border-black/[0.04]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#007AFF]">
              Novo Registro Manual (Hoje)
            </span>
            <button
              type="button"
              onClick={() => setShowManualModal(false)}
              className="p-1.5 bg-[#F2F2F7] text-[#8E8E93] hover:text-[#1C1C1E] rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Seletor de Tipo de Registro */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'mamada', label: 'Mamada', activeClass: 'bg-[#FFF0ED] text-[#FF6B4A]' },
                { id: 'fralda', label: 'Fralda', activeClass: 'bg-[#EBF5FF] text-[#007AFF]' },
                { id: 'sono', label: 'Sono', activeClass: 'bg-[#F2F0FF] text-[#5856D6]' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setManualType(item.id)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  manualType === item.id
                    ? item.activeClass
                    : 'bg-[#F2F2F7] text-[#8E8E93]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Campos de Horário */}
          {manualType !== 'sono' ? (
            <div className="flex items-center justify-between gap-3 bg-[#F2F2F7] p-3 rounded-2xl">
              <label className="text-xs font-semibold text-[#1C1C1E]">
                Horário do registro:
              </label>
              <input
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                required
                className="bg-white text-[#1C1C1E] text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm focus:outline-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 bg-[#F2F2F7] p-3 rounded-2xl">
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                  Dormiu às:
                </label>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  required
                  className="w-full bg-white text-[#1C1C1E] text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                  Acordou às:
                </label>
                <input
                  type="time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  required
                  className="w-full bg-white text-[#1C1C1E] text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Opções específicas de Mamada */}
          {manualType === 'mamada' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualFeedingKind('peito');
                    setManualBreast('Esquerdo');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    manualFeedingKind === 'peito' && manualBreast === 'Esquerdo'
                      ? 'bg-[#FF6B4A] text-white'
                      : 'bg-[#F2F2F7] text-[#1C1C1E]'
                  }`}
                >
                  Peito Esquerdo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualFeedingKind('peito');
                    setManualBreast('Direito');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    manualFeedingKind === 'peito' && manualBreast === 'Direito'
                      ? 'bg-[#FF6B4A] text-white'
                      : 'bg-[#F2F2F7] text-[#1C1C1E]'
                  }`}
                >
                  Peito Direito
                </button>
                <button
                  type="button"
                  onClick={() => setManualFeedingKind('mamadeira')}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    manualFeedingKind === 'mamadeira'
                      ? 'bg-[#FF6B4A] text-white'
                      : 'bg-[#F2F2F7] text-[#1C1C1E]'
                  }`}
                >
                  Mamadeira (ml)
                </button>
              </div>

              {manualFeedingKind === 'peito' ? (
                <div className="flex items-center justify-between bg-[#F2F2F7] p-3 rounded-2xl">
                  <span className="text-xs font-medium text-[#1C1C1E]">
                    Duração (minutos):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[10, 15, 20, 25, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setManualDuration(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          manualDuration === m
                            ? 'bg-[#FF6B4A] text-white'
                            : 'bg-white text-[#1C1C1E] shadow-sm'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-[#F2F2F7] p-3 rounded-2xl">
                  <span className="text-xs font-medium text-[#1C1C1E]">
                    Volume (ml):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[30, 60, 90, 120].map((ml) => (
                      <button
                        key={ml}
                        type="button"
                        onClick={() => setManualVolumeMl(ml)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          manualVolumeMl === ml
                            ? 'bg-[#FF6B4A] text-white'
                            : 'bg-white text-[#1C1C1E] shadow-sm'
                        }`}
                      >
                        {ml}ml
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Opções específicas de Fralda */}
          {manualType === 'fralda' && (
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'xixi', label: '💧 Só Xixi' },
                  { id: 'coco', label: '💩 Só Cocô' },
                  { id: 'ambos', label: '💧💩 Xixi + Cocô' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setManualDiaperType(d.id)}
                  className={`py-2.5 rounded-xl text-xs font-bold ${
                    manualDiaperType === d.id
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#F2F2F7] text-[#1C1C1E]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder="Observação opcional (ex: mamou tranquilo)"
            className="w-full bg-[#F2F2F7] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1C1E] placeholder:text-[#8E8E93] focus:outline-none"
          />

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#007AFF] text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-[0.97] transition-transform"
          >
            Salvar no Histórico de Hoje
          </button>
        </form>
      )}

      {/* Segmented Control de Filtros Estilo iOS */}
      <div className="grid grid-cols-4 gap-1 bg-[#E5E5EA] p-1 rounded-xl">
        {(
          [
            { id: 'todos', label: 'Todos' },
            { id: 'mamada', label: 'Mamadas' },
            { id: 'fralda', label: 'Fraldas' },
            { id: 'sono', label: 'Sono' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === tab.id
                ? 'bg-white text-[#1C1C1E] shadow-sm'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Linha do Tempo dos Registros de Hoje */}
      <div className="space-y-2.5">
        {filteredTodayEvents.length > 0 ? (
          filteredTodayEvents.map((ev) => renderTimelineItem(ev))
        ) : (
          <div className="text-center py-10 rounded-3xl bg-white p-5 shadow-sm border border-black/[0.04] space-y-1.5">
            <p className="text-sm font-bold text-[#1C1C1E]">
              Nenhum registro de hoje para este filtro
            </p>
            <p className="text-xs text-[#8E8E93]">
              Toque em "+ Adicionar Manualmente" acima caso tenha esquecido de anotar algo mais cedo.
            </p>
          </div>
        )}
      </div>

      {/* Rodapé discreto: Zerar todos os dados do app (com confirmação de segurança) */}
      <div className="pt-3 pb-2 flex flex-col items-center gap-2">
        {!confirmResetModal ? (
          <button
            type="button"
            onClick={() => setConfirmResetModal(true)}
            className="py-2 px-4 rounded-full bg-white shadow-sm border border-black/[0.04] text-xs font-medium text-[#8E8E93] hover:text-[#FF3B30] flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
            Zerar todos os dados do app
          </button>
        ) : (
          <div className="w-full rounded-3xl bg-white p-4 shadow-md border border-[#FF3B30]/20 space-y-3 text-center">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0ED] text-[#FF3B30] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#1C1C1E]">
                Zerar todos os dados do app?
              </p>
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Isso apagará permanentemente os {allEventsSorted.length} registros salvos e reiniciará os cronômetros ativos no Supabase.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmResetModal(false)}
                disabled={isClearingAll}
                className="py-2.5 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-xs font-bold active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmClearAll()}
                disabled={isClearingAll}
                className="py-2.5 rounded-2xl bg-[#FF3B30] text-white text-xs font-bold shadow-sm active:scale-95 transition-transform disabled:opacity-60"
              >
                {isClearingAll ? 'Zerando...' : 'Sim, Zerar Tudo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
