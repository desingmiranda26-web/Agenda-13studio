import { useMemo, useState } from 'react';
import {
  Bell,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Instagram,
  MessageCircle,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { TIME_SLOTS } from '../data/studioData';
import type { Appointment, StudioService } from '../types/studio';
import {
  buildReminderMessage,
  downloadAppointmentICS,
  formatCountdownLabel,
  formatCurrency,
  formatReadableDate,
  getMinutesUntilAppointment,
  getOffsetDateISO,
  getPaymentStatusLabel,
  getUpcomingDays,
  parseAppointmentDateTime,
} from '../utils/studioHelpers';
import { FourPointStar } from './StarMotif';

type AgendaMode = 'timeline' | 'upcoming_24h' | 'pending_payment' | 'all';

interface AgendaDashboardProps {
  appointments: Appointment[];
  services: StudioService[];
  nowMs: number;
  onQuickBookSlot: (dateISO: string, timeSlot: string) => void;
  onSettlePayment: (appointment: Appointment) => void;
  onMarkCompleted: (id: string) => void;
  onCancelAppointment: (id: string) => void;
  onMarkReminderSent: (id: string) => void;
  onNotify: (message: string) => void;
}

function getHourBucketKey(timeStr: string): string {
  const match = timeStr.trim().match(/^(\d{1,2}):\d{2}\s(AM|PM)$/i);
  if (!match) return timeStr;
  return `${String(parseInt(match[1], 10)).padStart(2, '0')}:00 ${match[2].toUpperCase()}`;
}

export function AgendaDashboard({
  appointments,
  services,
  nowMs,
  onQuickBookSlot,
  onSettlePayment,
  onMarkCompleted,
  onCancelAppointment,
  onMarkReminderSent,
  onNotify,
}: AgendaDashboardProps) {
  const [viewMode, setViewMode] = useState<AgendaMode>('timeline');
  const [timelineDate, setTimelineDate] = useState<string>(() =>
    getOffsetDateISO(0)
  );
  const [searchQuery, setSearchQuery] = useState('');

  const upcomingDays = useMemo(() => getUpcomingDays(14), []);

  const activeAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== 'cancelled')
        .sort(
          (a, b) =>
            parseAppointmentDateTime(a.date, a.time).getTime() -
            parseAppointmentDateTime(b.date, b.time).getTime()
        ),
    [appointments]
  );

  const upcoming24hCount = useMemo(
    () =>
      activeAppointments.filter((a) => {
        if (a.status !== 'scheduled') return false;
        const mins = getMinutesUntilAppointment(a, nowMs);
        return mins >= -30 && mins <= 1440;
      }).length,
    [activeAppointments, nowMs]
  );

  const dayAppointmentsBySlot = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    activeAppointments
      .filter((a) => a.date === timelineDate)
      .forEach((apt) => {
        const bucket = getHourBucketKey(apt.time);
        const list = map.get(bucket) || [];
        list.push(apt);
        map.set(bucket, list);
      });
    return map;
  }, [activeAppointments, timelineDate]);

  const filteredListAppointments = useMemo(() => {
    return activeAppointments.filter((apt) => {
      if (viewMode === 'upcoming_24h') {
        const mins = getMinutesUntilAppointment(apt, nowMs);
        if (apt.status !== 'scheduled' || mins < -30 || mins > 1440) {
          return false;
        }
      }
      if (viewMode === 'pending_payment' && apt.paymentStatus === 'paid_full') {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const serviceNames = services
          .filter((s) => apt.serviceIds.includes(s.id))
          .map((s) => s.name.toLowerCase())
          .join(' ');
        return (
          apt.clientName.toLowerCase().includes(q) ||
          apt.clientInstagram.toLowerCase().includes(q) ||
          apt.clientPhone.toLowerCase().includes(q) ||
          serviceNames.includes(q)
        );
      }
      return true;
    });
  }, [activeAppointments, nowMs, searchQuery, services, viewMode]);

  const handleCopyReminder = async (apt: Appointment) => {
    const msg = buildReminderMessage(apt, services);
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      // ignore clipboard restriction
    }
    onMarkReminderSent(apt.id);
    onNotify(`Recordatorio copiado para ${apt.clientName}.`);
  };

  const handleWhatsAppHref = (apt: Appointment) => {
    const cleanDigits = apt.clientPhone.replace(/\D/g, '');
    const msg = encodeURIComponent(buildReminderMessage(apt, services));
    return cleanDigits
      ? `https://wa.me/${cleanDigits}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
  };

  const renderAppointmentCard = (apt: Appointment, compact = false) => {
    const aptServices = services.filter((s) => apt.serviceIds.includes(s.id));
    const remaining = Math.max(
      0,
      Math.round((apt.totalAmount - apt.amountPaid) * 100) / 100
    );
    const isCompleted = apt.status === 'completed';
    const minutesUntil = getMinutesUntilAppointment(apt, nowMs);
    const isUrgent1h =
      !isCompleted && minutesUntil >= -15 && minutesUntil <= 60;
    const isWindow24h =
      !isCompleted && minutesUntil > 60 && minutesUntil <= 1440;

    return (
      <div
        key={apt.id}
        className={`rounded-2xl bg-white border border-[#0B1536]/12 p-4 space-y-3 ${
          isCompleted ? 'opacity-75' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {!compact && (
                <>
                  <span className="text-[#0D3FE8] tabular-nums">
                    {formatReadableDate(apt.date)}
                  </span>
                  <span aria-hidden="true" className="text-[#0B1536]/30">
                    ·
                  </span>
                </>
              )}
              <span className="font-mono-num text-[#0B1536]">{apt.time}</span>

              {isUrgent1h && (
                <>
                  <span aria-hidden="true" className="text-[#0B1536]/30">
                    ·
                  </span>
                  <span className="text-[#DF1B2D] inline-flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" />
                    {formatCountdownLabel(minutesUntil)} (1h)
                  </span>
                </>
              )}

              {isWindow24h && (
                <>
                  <span aria-hidden="true" className="text-[#0B1536]/30">
                    ·
                  </span>
                  <span className="text-[#0D3FE8] inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatCountdownLabel(minutesUntil)} (24h)
                  </span>
                </>
              )}

              <span aria-hidden="true" className="text-[#0B1536]/30">
                ·
              </span>
              <span
                className={
                  apt.paymentStatus === 'paid_full'
                    ? 'text-emerald-700 inline-flex items-center gap-1'
                    : apt.paymentStatus === 'deposit_paid'
                      ? 'text-[#0D3FE8] inline-flex items-center gap-1'
                      : 'text-[#DF1B2D] inline-flex items-center gap-1'
                }
              >
                <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                {getPaymentStatusLabel(apt.paymentStatus)}
              </span>

              {isCompleted && (
                <>
                  <span aria-hidden="true" className="text-[#0B1536]/30">
                    ·
                  </span>
                  <span className="text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Atendida
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h3 className="text-base sm:text-lg font-bold text-[#0B1536]">
                {apt.clientName}
              </h3>
              <span className="text-xs font-medium text-[#0B1536]/65 inline-flex items-center gap-1">
                <Instagram className="w-3 h-3" aria-hidden="true" />
                {apt.clientInstagram || 'Sin IG'}
              </span>
              <span className="text-xs font-mono-num text-[#0B1536]/60">
                {apt.clientPhone}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-[#0D3FE8]">
              {aptServices.map((s) => s.name).join(' + ')}
            </p>

            {apt.referenceNote && (
              <p className="text-xs text-[#0B1536]/65">
                Ref: {apt.referenceNote}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="font-mono-num text-sm font-bold text-[#0B1536] tabular-nums">
              {formatCurrency(apt.amountPaid)} / {formatCurrency(apt.totalAmount)}
            </div>
            <div className="text-xs text-[#0B1536]/65 tabular-nums">
              {remaining > 0
                ? `Resta ${formatCurrency(remaining)}`
                : 'Liquidado'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#0B1536]/10">
          {remaining > 0 && !isCompleted && (
            <button
              type="button"
              onClick={() => onSettlePayment(apt)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#DF1B2D] hover:bg-[#C01424] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Cobrar {formatCurrency(remaining)}
            </button>
          )}

          <a
            href={handleWhatsAppHref(apt)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onMarkReminderSent(apt.id)}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>

          <button
            type="button"
            onClick={() => handleCopyReminder(apt)}
            className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-[#0B1536]/15 text-[#0B1536] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#F2EEE4]"
          >
            <Copy className="w-3.5 h-3.5" />
            {apt.reminderSent ? 'Copiado' : 'Copiar'}
          </button>

          <button
            type="button"
            onClick={() => downloadAppointmentICS(apt, services)}
            className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-[#0B1536]/15 text-[#0B1536] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#F2EEE4]"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            .ICS
          </button>

          {!isCompleted && (
            <button
              type="button"
              onClick={() => onMarkCompleted(apt.id)}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-emerald-700/25 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-emerald-50"
            >
              <Check className="w-3.5 h-3.5" />
              Lista
            </button>
          )}

          <button
            type="button"
            onClick={() => onCancelAppointment(apt.id)}
            aria-label={`Cancelar cita de ${apt.clientName}`}
            className="min-h-[38px] min-w-[38px] px-2 py-1.5 rounded-xl border border-[#DF1B2D]/25 text-[#DF1B2D] text-xs font-semibold inline-flex items-center justify-center cursor-pointer hover:bg-[#DF1B2D]/10 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section
      id="agenda"
      aria-labelledby="agenda-heading"
      className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-7 shadow-xl border border-[#0B1536]/10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#0B1536]/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0D3FE8] uppercase tracking-wider mb-1">
            <FourPointStar className="w-3.5 h-3.5 text-[#0D3FE8]" />
            <span>Agenda Diaria · 7:00 AM a 7:00 PM</span>
          </div>
          <h2
            id="agenda-heading"
            className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#0B1536]"
          >
            Control de Turnos
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0 bg-[#F2EEE4] px-4 py-2.5 rounded-2xl border border-[#0B1536]/10">
          <div>
            <span className="block text-[10px] font-semibold text-[#0B1536]/60">
              Próx. 24h
            </span>
            <span className="font-display text-xl sm:text-2xl font-bold text-[#DF1B2D] tabular-nums">
              {upcoming24hCount}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-[#0B1536]/60">
              Activas
            </span>
            <span className="font-display text-xl sm:text-2xl font-bold text-[#0B1536] tabular-nums">
              {activeAppointments.filter((a) => a.status === 'scheduled').length}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-[#0D3FE8]">
              Cobrado
            </span>
            <span className="font-display text-xl sm:text-2xl font-bold text-[#0D3FE8] tabular-nums">
              {formatCurrency(
                activeAppointments.reduce((acc, a) => acc + a.amountPaid, 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="Vistas de la agenda"
        className="mt-4 flex flex-wrap items-center gap-1.5 p-1 bg-[#F2EEE4] rounded-2xl border border-[#0B1536]/10"
      >
        {(
          [
            { id: 'timeline', label: 'Día (7am–7pm)' },
            { id: 'upcoming_24h', label: `Próximas 24h (${upcoming24hCount})` },
            { id: 'pending_payment', label: 'Por cobrar' },
            { id: 'all', label: 'Todas' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={viewMode === tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === tab.id
                ? 'bg-[#0B1536] text-white'
                : 'text-[#0B1536]/75 hover:text-[#0B1536]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === 'timeline' ? (
        <div className="mt-4 space-y-4">
          {/* Horizontal Date Scroller */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {upcomingDays.map((day) => {
              const isSelected = timelineDate === day.iso;
              const dayCount = activeAppointments.filter(
                (a) => a.date === day.iso
              ).length;
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setTimelineDate(day.iso)}
                  className={`min-w-[68px] min-h-[72px] px-2.5 py-2 rounded-2xl border flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0D3FE8] text-white border-[#0D3FE8]'
                      : 'bg-white text-[#0B1536] border-[#0B1536]/12 hover:border-[#0D3FE8]'
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase ${
                      isSelected ? 'text-white/85' : 'text-[#0B1536]/55'
                    }`}
                  >
                    {day.relativeTag || day.weekdayShort}
                  </span>
                  <span className="font-display text-2xl font-bold leading-tight tabular-nums">
                    {day.dayNumber}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      isSelected ? 'text-[#92D5F0]' : 'text-[#0D3FE8]'
                    }`}
                  >
                    {dayCount > 0 ? `${dayCount} cita(s)` : 'Libre'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 7:00 AM to 7:00 PM Hourly Schedule */}
          <div className="space-y-2.5">
            {TIME_SLOTS.map((slot) => {
              const slotAppointments = dayAppointmentsBySlot.get(slot) || [];

              return (
                <div
                  key={slot}
                  className="flex flex-col sm:flex-row sm:items-stretch gap-2.5"
                >
                  <div className="sm:w-24 shrink-0 flex sm:flex-col items-center sm:items-start justify-between sm:justify-center px-1 py-1">
                    <span className="font-mono-num text-xs sm:text-sm font-bold text-[#0B1536]">
                      {slot}
                    </span>
                    <span className="text-[11px] font-semibold text-[#0B1536]/55">
                      {slotAppointments.length > 0 ? 'Ocupado' : 'Disponible'}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2">
                    {slotAppointments.length > 0 ? (
                      slotAppointments.map((apt) =>
                        renderAppointmentCard(apt, true)
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => onQuickBookSlot(timelineDate, slot)}
                        className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl border border-dashed border-[#0B1536]/20 bg-white/70 hover:bg-white hover:border-[#0D3FE8] flex items-center justify-between text-left cursor-pointer transition-colors group"
                      >
                        <span className="text-xs font-medium text-[#0B1536]/60 group-hover:text-[#0B1536]">
                          Espacio libre a las {slot}
                        </span>
                        <span className="text-xs font-bold text-[#0D3FE8] inline-flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" />
                          Agendar
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#0B1536]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar clienta, @instagram, teléfono o servicio..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
            />
          </div>

          <div className="space-y-3">
            {filteredListAppointments.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#0B1536]/65">
                No hay citas en este filtro.
              </div>
            ) : (
              filteredListAppointments.map((apt) =>
                renderAppointmentCard(apt, false)
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}
