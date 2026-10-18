import React, { useMemo } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Droplets,
  HeartHandshake,
  Moon,
  Scale,
  Stethoscope,
} from 'lucide-react';
import { useRoutine } from '../context/RoutineContext';
import { FraldaEvent, MamadaEvent, SonoEvent } from '../types/routine';
import {
  formatDateKeyHuman,
  formatDurationMinutes,
  getLocalDateKey,
} from '../utils/dateHelpers';

export const PediatricianView: React.FC = () => {
  const { data, now } = useRoutine();

  // Calcula automaticamente as métricas dos últimos 7 dias a partir do localStorage
  const stats7Days = useMemo(() => {
    const last7Keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      last7Keys.push(getLocalDateKey(d));
    }

    // Filtra apenas os dias dentro da janela de 7 dias que possuem registros salvos
    const activeDayKeys = last7Keys.filter(
      (k) => Array.isArray(data.days[k]) && data.days[k].length > 0
    );
    const divisorDays = Math.max(1, activeDayKeys.length);

    let totalFeedings = 0;
    let totalBreastFeedings = 0;
    let totalFeedingDurationMins = 0;
    let leftBreastCount = 0;
    let rightBreastCount = 0;

    let totalPeeDiapers = 0;
    let totalPoopDiapers = 0;
    let totalSleepMinutes = 0;

    const dailyBreakdown = last7Keys.map((dateKey) => {
      const dayEvents = data.days[dateKey] || [];
      const feedings = dayEvents.filter((e): e is MamadaEvent => e.type === 'mamada');
      const diapers = dayEvents.filter((e): e is FraldaEvent => e.type === 'fralda');
      const sleeps = dayEvents.filter((e): e is SonoEvent => e.type === 'sono');

      const dayPees = diapers.filter((d) => d.hasPee).length;
      const dayPoops = diapers.filter((d) => d.hasPoop).length;
      const daySleepMins = sleeps.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

      totalFeedings += feedings.length;
      feedings.forEach((f) => {
        totalFeedingDurationMins += f.durationMinutes || 0;
        if (f.feedingType !== 'mamadeira' && f.breast) {
          totalBreastFeedings += 1;
          if (f.breast === 'Esquerdo') leftBreastCount += 1;
          if (f.breast === 'Direito') rightBreastCount += 1;
        }
      });

      totalPeeDiapers += dayPees;
      totalPoopDiapers += dayPoops;
      totalSleepMinutes += daySleepMins;

      return {
        dateKey,
        hasData: dayEvents.length > 0,
        feedingsCount: feedings.length,
        peeCount: dayPees,
        poopCount: dayPoops,
        sleepFormatted: formatDurationMinutes(daySleepMins),
      };
    });

    const avgFeedingsPerDay = totalFeedings / divisorDays;
    const avgMinutesPerFeeding =
      totalFeedings > 0 ? Math.round(totalFeedingDurationMins / totalFeedings) : 0;

    const leftPercent =
      totalBreastFeedings > 0
        ? Math.round((leftBreastCount / totalBreastFeedings) * 100)
        : 50;
    const rightPercent = totalBreastFeedings > 0 ? 100 - leftPercent : 50;

    const avgPeePerDay = totalPeeDiapers / divisorDays;
    const avgPoopPerDay = totalPoopDiapers / divisorDays;
    const isHydrationHealthy = avgPeePerDay >= 6;

    const avgSleepMinutesPer24h = Math.round(totalSleepMinutes / divisorDays);
    const avgSleepHoursDecimal = (avgSleepMinutesPer24h / 60).toFixed(1).replace('.', ',');

    return {
      activeDaysCount: activeDayKeys.length,
      avgFeedingsPerDay: avgFeedingsPerDay.toFixed(1).replace('.', ','),
      avgMinutesPerFeeding,
      leftBreastCount,
      rightBreastCount,
      leftPercent,
      rightPercent,
      avgPeePerDayNum: avgPeePerDay,
      avgPeePerDay: avgPeePerDay.toFixed(1).replace('.', ','),
      avgPoopPerDay: avgPoopPerDay.toFixed(1).replace('.', ','),
      isHydrationHealthy,
      avgSleepFormatted: formatDurationMinutes(avgSleepMinutesPer24h),
      avgSleepHoursDecimal,
      dailyBreakdown,
    };
  }, [data.days, now]);

  return (
    <div className="flex-1 px-4 py-3.5 space-y-3.5 overflow-y-auto">
      {/* Cabeçalho Clínico Limpo para Consulta */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800/80 border border-slate-700/80 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100 leading-tight">
                Resumo de Saúde • Últimos 7 Dias
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bebê <strong className="text-slate-200">{data.babyProfile.name}</strong> • Baseado em{' '}
                {stats7Days.activeDaysCount} dia(s) registrado(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. MÉDIA DE MAMADAS POR DIA & TEMPO MÉDIO POR MAMADA */}
      <section className="rounded-3xl bg-slate-900/90 border border-amber-500/25 p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4" />
            Amamentação & Nutrientes (Média 7d)
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/30 font-semibold">
            Livre demanda
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-950/75 border border-slate-800/90 p-3">
            <span className="text-[11px] text-slate-400 font-medium">
              Média de mamadas / dia
            </span>
            <div className="text-2xl font-extrabold text-amber-100 mt-0.5">
              {stats7Days.avgFeedingsPerDay}
              <span className="text-xs font-semibold text-amber-300/80 ml-1">
                / dia
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/75 border border-slate-800/90 p-3">
            <span className="text-[11px] text-slate-400 font-medium">
              Tempo médio / mamada
            </span>
            <div className="text-2xl font-extrabold text-amber-100 mt-0.5">
              {stats7Days.avgMinutesPerFeeding}
              <span className="text-xs font-semibold text-amber-300/80 ml-1">
                min
              </span>
            </div>
          </div>
        </div>

        {/* 2. PROPORÇÃO DE USO PEITO ESQUERDO VS. PEITO DIREITO (%) */}
        <div className="rounded-2xl bg-slate-950/80 border border-amber-500/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-300" />
              Proporção Peito Esquerdo vs. Direito
            </span>
            <span className="text-[11px] text-slate-400">
              {stats7Days.leftBreastCount}E • {stats7Days.rightBreastCount}D
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex p-0.5 gap-0.5">
            <div
              className="h-full rounded-l-full bg-amber-400 transition-all duration-500"
              style={{ width: `${stats7Days.leftPercent}%` }}
            />
            <div
              className="h-full rounded-r-full bg-orange-500/85 transition-all duration-500"
              style={{ width: `${stats7Days.rightPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-amber-200">
              Peito Esquerdo: {stats7Days.leftPercent}%
            </span>
            <span className="text-orange-300">
              Peito Direito: {stats7Days.rightPercent}%
            </span>
          </div>
        </div>
      </section>

      {/* 3. MÉDIA DE FRALDAS DE XIXI E COCÔ POR DIA + INDICADOR DE HIDRATAÇÃO SAUDÁVEL (6+ XIXIS/DIA) */}
      <section className="rounded-3xl bg-slate-900/90 border border-emerald-500/25 p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Droplets className="w-4 h-4" />
            Hidratação & Fraldas (Média 7d)
          </div>

          {stats7Days.isHydrationHealthy ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              Padrão Saudável (6+ xixis/dia)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
              <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
              Abaixo de 6 xixis/dia
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-950/75 border border-emerald-500/20 p-3">
            <span className="text-[11px] text-slate-400 font-medium">
              Média de xixis / dia
            </span>
            <div className="text-2xl font-extrabold text-emerald-100 mt-0.5">
              {stats7Days.avgPeePerDay}
              <span className="text-xs font-semibold text-emerald-300/80 ml-1">
                xixis/dia
              </span>
            </div>
            <p className="text-[10px] text-emerald-300/85 mt-1">
              {stats7Days.isHydrationHealthy
                ? '✓ Dentro da meta clínica (6 a 8/dia)'
                : 'Meta esperada: mínimo 6 xixis/dia'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950/75 border border-slate-800/90 p-3">
            <span className="text-[11px] text-slate-400 font-medium">
              Média de cocôs / dia
            </span>
            <div className="text-2xl font-extrabold text-slate-100 mt-0.5">
              {stats7Days.avgPoopPerDay}
              <span className="text-xs font-semibold text-slate-400 ml-1">
                cocôs/dia
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Trânsito intestinal regular
            </p>
          </div>
        </div>
      </section>

      {/* 4. MÉDIA DE HORAS TOTAIS DE SONO POR 24H */}
      <section className="rounded-3xl bg-slate-900/90 border border-sky-500/25 p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sky-300 text-xs font-bold uppercase tracking-wider">
              <Moon className="w-4 h-4" />
              Sono Acumulado por 24h (Média 7d)
            </div>
            <p className="text-xs text-slate-400">
              Soma diária de sonecas diurnas e sono noturno
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-extrabold text-sky-100">
              {stats7Days.avgSleepFormatted}
            </div>
            <div className="text-[11px] text-sky-300/80 font-medium">
              ~{stats7Days.avgSleepHoursDecimal}h / 24h
            </div>
          </div>
        </div>
      </section>

      {/* Tabela Compacta Dia a Dia (Últimos 7 dias) para conferência rápida do Pediatra */}
      <section className="rounded-3xl bg-slate-900/70 border border-slate-800/90 p-3.5 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            Detalhamento Diário (Últimos 7 dias)
          </span>
        </div>

        <div className="space-y-1.5">
          {stats7Days.dailyBreakdown.map((day) => (
            <div
              key={day.dateKey}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs"
            >
              <span className="font-semibold text-slate-300 w-28 truncate">
                {formatDateKeyHuman(day.dateKey)}
              </span>

              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="text-amber-200" title="Mamadas no dia">
                  🍼 {day.feedingsCount}x
                </span>
                <span className="text-emerald-200" title="Xixis e Cocôs no dia">
                  💧{day.peeCount} • 💩{day.poopCount}
                </span>
                <span className="text-sky-200 font-mono" title="Sono total no dia">
                  🌙 {day.sleepFormatted}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
