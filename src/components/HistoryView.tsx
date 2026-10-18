import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Droplets,
  HeartHandshake,
  Moon,
  Plus,
  RotateCcw,
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
import { formatDurationMinutes, formatTimeHHMM } from '../utils/dateHelpers';

export const HistoryView: React.FC = () => {
  const {
    todayEvents,
    addManualEventToday,
    deleteEvent,
    resetToSampleData,
  } = useRoutine();

  const [filter, setFilter] = useState<'todos' | EventType>('todos');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFeedback, setManualFeedback] = useState<string | null>(null);

  // Estado do formulário "+ Adicionar Manualmente"
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

  /**
   * Formata o título principal exatamente no padrão solicitado:
   * - "14:30 - Mamada (Peito Esquerdo) - 18 min"
   * - "15:10 - Fralda: Xixi + Cocô"
   * - "15:30 às 16:45 - Sono (1h 15m)"
   */
  const renderTimelineItem = (ev: RoutineEvent) => {
    if (ev.type === 'mamada') {
      const isBottle = ev.feedingType === 'mamadeira';
      const titleText = isBottle
        ? `${ev.timeFormatted} - Mamada (Mamadeira / Fórmula) - ${ev.volumeMl}ml`
        : `${ev.timeFormatted} - Mamada (Peito ${ev.breast}) - ${ev.durationMinutes} min`;

      return (
        <div
          key={ev.id}
          className="relative flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/25 shadow-sm hover:border-amber-400/40 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-100 leading-snug">
                {titleText}
              </p>
              {ev.notes && (
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {ev.notes}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => deleteEvent(ev.id, ev.dateKey)}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0 active:scale-95"
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
          className="relative flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/25 shadow-sm hover:border-emerald-400/40 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-100 leading-snug">
                {titleText}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {ev.hasPee ? '💧 Hidratação contabilizada' : '💩 Evacuação registrada'}
                {ev.notes ? ` • ${ev.notes}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => deleteEvent(ev.id, ev.dateKey)}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0 active:scale-95"
            title="Excluir registro"
            aria-label="Excluir registro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      );
    }

    // Evento de Sono: "15:30 às 16:45 - Sono (1h 15m)"
    const startHHMM = ev.startTime
      ? formatTimeHHMM(new Date(ev.startTime))
      : ev.timeFormatted;
    const endHHMM = ev.endTime
      ? formatTimeHHMM(new Date(ev.endTime))
      : formatTimeHHMM(
          new Date(
            new Date(ev.timestamp).getTime()
          )
        );
    const formattedSleepDuration = formatDurationMinutes(ev.durationMinutes);
    const titleText = `${startHHMM} às ${endHHMM} - Sono (${formattedSleepDuration})`;

    return (
      <div
        key={ev.id}
        className="relative flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-sky-500/25 shadow-sm hover:border-sky-400/40 transition-all"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-sky-100 leading-snug">
              {titleText}
            </p>
            {ev.notes && (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {ev.notes}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => deleteEvent(ev.id, ev.dateKey)}
          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0 active:scale-95"
          title="Excluir registro"
          aria-label="Excluir registro"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 px-4 py-3.5 space-y-3.5 overflow-y-auto">
      {/* Cabeçalho + Botão "+ Adicionar Manualmente" */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-300" />
            Linha do Tempo de Hoje
          </h2>
          <p className="text-xs text-slate-400">
            Ordem cronológica inversa ({todayEvents.length} registros hoje)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenManualForm}
          className="px-3 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-500/15 active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Adicionar Manualmente
        </button>
      </div>

      {/* Feedback de adição manual */}
      {manualFeedback && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{manualFeedback}</span>
        </div>
      )}

      {/* Modal / Card Expansível "+ Adicionar Manualmente" */}
      {showManualModal && (
        <form
          onSubmit={handleSaveManualEvent}
          className="rounded-3xl bg-slate-900 border-2 border-amber-400/40 p-4 space-y-3.5 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              + Adicionar Registro Manual (Hoje)
            </span>
            <button
              type="button"
              onClick={() => setShowManualModal(false)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Seletor de Tipo de Registro */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'mamada', label: 'Mamada', tone: 'amber' },
                { id: 'fralda', label: 'Fralda', tone: 'emerald' },
                { id: 'sono', label: 'Sono', tone: 'sky' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setManualType(item.id)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  manualType === item.id
                    ? item.tone === 'amber'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : item.tone === 'emerald'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Campos de Horário */}
          {manualType !== 'sono' ? (
            <div className="flex items-center justify-between gap-3 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-300">
                Horário do registro:
              </label>
              <input
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                required
                className="bg-slate-800 text-slate-100 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Dormiu às:
                </label>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  required
                  className="w-full bg-slate-800 text-slate-100 text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Acordou às:
                </label>
                <input
                  type="time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  required
                  className="w-full bg-slate-800 text-slate-100 text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl border border-slate-700"
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
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    manualFeedingKind === 'peito' && manualBreast === 'Esquerdo'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
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
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    manualFeedingKind === 'peito' && manualBreast === 'Direito'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Peito Direito
                </button>
                <button
                  type="button"
                  onClick={() => setManualFeedingKind('mamadeira')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    manualFeedingKind === 'mamadeira'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Mamadeira (ml)
                </button>
              </div>

              {manualFeedingKind === 'peito' ? (
                <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-300">Duração (minutos):</span>
                  <div className="flex items-center gap-1.5">
                    {[10, 15, 20, 25, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setManualDuration(m)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          manualDuration === m
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-300">Volume (ml):</span>
                  <div className="flex items-center gap-1.5">
                    {[30, 60, 90, 120].map((ml) => (
                      <button
                        key={ml}
                        type="button"
                        onClick={() => setManualVolumeMl(ml)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          manualVolumeMl === ml
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
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
                  className={`py-2.5 rounded-xl text-xs font-bold border ${
                    manualDiaperType === d.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {/* Observação opcional */}
          <input
            type="text"
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder="Observação opcional (ex: mamou tranquilo)"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
          />

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-[0.98]"
          >
            Salvar no Histórico de Hoje
          </button>
        </form>
      )}

      {/* Filtros Rápidos por Categoria */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
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
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id
                ? 'bg-slate-800 text-slate-100 shadow border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Linha do Tempo dos Registros de Hoje (Ordem Cronológica Inversa) */}
      <div className="space-y-2.5">
        {filteredTodayEvents.length > 0 ? (
          filteredTodayEvents.map((ev) => renderTimelineItem(ev))
        ) : (
          <div className="text-center py-10 rounded-3xl bg-slate-900/50 border border-slate-800/80 p-5 space-y-2">
            <p className="text-sm font-bold text-slate-300">
              Nenhum registro de hoje para este filtro.
            </p>
            <p className="text-xs text-slate-500">
              Toque em "+ Adicionar Manualmente" acima caso tenha esquecido de anotar algo mais cedo.
            </p>
          </div>
        )}
      </div>

      {/* Rodapé discreto para restaurar dados de exemplo se desejar */}
      <div className="pt-2 pb-4 flex justify-center">
        <button
          type="button"
          onClick={resetToSampleData}
          className="py-2 px-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1.5 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-300/80" />
          Restaurar rotina de exemplo (7 dias)
        </button>
      </div>
    </div>
  );
};
