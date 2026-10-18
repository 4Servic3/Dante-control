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

  const stats7Days = useMemo(() => {
    const last7Keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      last7Keys.push(getLocalDateKey(d));
    }

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
    <div className="flex-1 px-4 pt-2 pb-6 space-y-3.5 overflow-y-auto">
      {/* Cabeçalho Clínico Estilo Apple Health */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-black/[0.04] flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-[#E8F8EE] flex items-center justify-center text-[#34C759] shrink-0">
          <Stethoscope className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#1C1C1E] leading-tight">
            Resumo de Saúde • Últimos 7 Dias
          </h2>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Bebê <strong className="text-[#1C1C1E]">{data.babyProfile.name}</strong> • Baseado em{' '}
            {stats7Days.activeDaysCount} dia(s) registrado(s)
          </p>
        </div>
      </div>

      {/* 1. MÉDIA DE MAMADAS POR DIA & TEMPO MÉDIO POR MAMADA */}
      <section className="rounded-3xl bg-white p-5 space-y-3.5 shadow-sm border border-black/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#FF6B4A] text-xs font-bold uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4" />
            Amamentação (Média 7d)
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFF0ED] text-[#FF6B4A] font-semibold">
            Livre demanda
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#FFF0ED] p-3.5">
            <span className="text-[11px] text-[#D94E34] font-medium">
              Média de mamadas / dia
            </span>
            <div className="text-2xl font-bold text-[#1C1C1E] mt-0.5 tabular-nums">
              {stats7Days.avgFeedingsPerDay}
              <span className="text-xs font-semibold text-[#8E8E93] ml-1">
                / dia
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FFF0ED] p-3.5">
            <span className="text-[11px] text-[#D94E34] font-medium">
              Tempo médio / mamada
            </span>
            <div className="text-2xl font-bold text-[#1C1C1E] mt-0.5 tabular-nums">
              {stats7Days.avgMinutesPerFeeding}
              <span className="text-xs font-semibold text-[#8E8E93] ml-1">
                min
              </span>
            </div>
          </div>
        </div>

        {/* 2. PROPORÇÃO DE USO PEITO ESQUERDO VS. PEITO DIREITO (%) */}
        <div className="rounded-2xl bg-[#F2F2F7] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1C1C1E] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[#FF6B4A]" />
              Proporção Peito Esquerdo vs. Direito
            </span>
            <span className="text-[11px] text-[#8E8E93] font-medium">
              {stats7Days.leftBreastCount}E • {stats7Days.rightBreastCount}D
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-white overflow-hidden flex p-0.5 gap-0.5">
            <div
              className="h-full rounded-l-full bg-[#FF6B4A] transition-all duration-500"
              style={{ width: `${stats7Days.leftPercent}%` }}
            />
            <div
              className="h-full rounded-r-full bg-[#FF9F89] transition-all duration-500"
              style={{ width: `${stats7Days.rightPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#FF6B4A]">
              Peito Esquerdo: {stats7Days.leftPercent}%
            </span>
            <span className="text-[#D94E34]">
              Peito Direito: {stats7Days.rightPercent}%
            </span>
          </div>
        </div>
      </section>

      {/* 3. MÉDIA DE FRALDAS DE XIXI E COCÔ POR DIA */}
      <section className="rounded-3xl bg-white p-5 space-y-3.5 shadow-sm border border-black/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#007AFF] text-xs font-bold uppercase tracking-wider">
            <Droplets className="w-4 h-4" />
            Hidratação & Fraldas (Média 7d)
          </div>

          {stats7Days.isHydrationHealthy ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8F8EE] text-[#34C759]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saudável (6+ xixis/dia)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF0ED] text-[#FF6B4A]">
              <AlertCircle className="w-3.5 h-3.5" />
              Abaixo de 6 xixis/dia
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#EBF5FF] p-3.5">
            <span className="text-[11px] text-[#007AFF] font-medium">
              Média de xixis / dia
            </span>
            <div className="text-2xl font-bold text-[#1C1C1E] mt-0.5 tabular-nums">
              {stats7Days.avgPeePerDay}
              <span className="text-xs font-semibold text-[#8E8E93] ml-1">
                / dia
              </span>
            </div>
            <p className="text-[10px] text-[#007AFF] font-medium mt-1">
              {stats7Days.isHydrationHealthy
                ? '✓ Meta de 6 a 8 xixis atingida'
                : 'Meta esperada: 6+ xixis/dia'}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F2F2F7] p-3.5">
            <span className="text-[11px] text-[#8E8E93] font-medium">
              Média de cocôs / dia
            </span>
            <div className="text-2xl font-bold text-[#1C1C1E] mt-0.5 tabular-nums">
              {stats7Days.avgPoopPerDay}
              <span className="text-xs font-semibold text-[#8E8E93] ml-1">
                / dia
              </span>
            </div>
            <p className="text-[10px] text-[#8E8E93] font-medium mt-1">
              Trânsito intestinal regular
            </p>
          </div>
        </div>
      </section>

      {/* 4. MÉDIA DE HORAS TOTAIS DE SONO POR 24H */}
      <section className="rounded-3xl bg-white p-5 shadow-sm border border-black/[0.04]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#5856D6] text-xs font-bold uppercase tracking-wider">
              <Moon className="w-4 h-4" />
              Sono por 24h (Média 7d)
            </div>
            <p className="text-xs text-[#8E8E93]">
              Soma diária de sonecas e sono noturno
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-[#1C1C1E] tabular-nums">
              {stats7Days.avgSleepFormatted}
            </div>
            <div className="text-[11px] text-[#5856D6] font-semibold">
              ~{stats7Days.avgSleepHoursDecimal}h / 24h
            </div>
          </div>
        </div>
      </section>

      {/* Detalhamento Diário (Últimos 7 dias) */}
      <section className="rounded-3xl bg-white p-5 shadow-sm border border-black/[0.04] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-[#007AFF]" />
            Histórico Diário (Últimos 7 dias)
          </span>
        </div>

        <div className="space-y-1.5">
          {stats7Days.dailyBreakdown.map((day) => (
            <div
              key={day.dateKey}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#F2F2F7] text-xs"
            >
              <span className="font-semibold text-[#1C1C1E] w-28 truncate">
                {formatDateKeyHuman(day.dateKey)}
              </span>

              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="text-[#FF6B4A]" title="Mamadas no dia">
                  🍼 {day.feedingsCount}x
                </span>
                <span className="text-[#007AFF]" title="Xixis e Cocôs no dia">
                  💧{day.peeCount} • 💩{day.poopCount}
                </span>
                <span className="text-[#5856D6] tabular-nums" title="Sono total no dia">
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
