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
  Search,
  Trash2,
} from 'lucide-react';
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
  parseAppointmentDateTime,
} from '../utils/studioHelpers';
import { FourPointStar } from './StarMotif';

type AgendaFilter =
  | 'all'
  | 'upcoming_24h'
  | 'today'
  | 'tomorrow'
  | 'pending_payment';

interface AgendaDashboardProps {
  appointments: Appointment[];
  services: StudioService[];
  nowMs: number;
  onSettlePayment: (appointment: Appointment) => void;
  onMarkCompleted: (id: string) => void;
  onCancelAppointment: (id: string) => void;
  onMarkReminderSent: (id: string) => void;
  onNotify: (message: string) => void;
}

export function AgendaDashboard({
  appointments,
  services,
  nowMs,
  onSettlePayment,
  onMarkCompleted,
  onCancelAppointment,
  onMarkReminderSent,
  onNotify,
}: AgendaDashboardProps) {
  const [filter, setFilter] = useState<AgendaFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayISO = getOffsetDateISO(0);
  const tomorrowISO = getOffsetDateISO(1);

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

  const filteredAppointments = useMemo(() => {
    return activeAppointments.filter((apt) => {
      if (filter === 'upcoming_24h') {
        const mins = getMinutesUntilAppointment(apt, nowMs);
        if (apt.status !== 'scheduled' || mins < -30 || mins > 1440) {
          return false;
        }
      }
      if (filter === 'today' && apt.date !== todayISO) return false;
      if (filter === 'tomorrow' && apt.date !== tomorrowISO) return false;
      if (filter === 'pending_payment' && apt.paymentStatus === 'paid_full')
        return false;

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
  }, [
    activeAppointments,
    filter,
    nowMs,
    searchQuery,
    services,
    todayISO,
    tomorrowISO,
  ]);

  const handleCopyReminder = async (apt: Appointment) => {
    const msg = buildReminderMessage(apt, services);
    try {
      await navigator.clipboard.writeText(msg);
      onMarkReminderSent(apt.id);
      onNotify(`Recordatorio copiado para ${apt.clientName}.`);
    } catch {
      onMarkReminderSent(apt.id);
      onNotify(`Recordatorio listo para enviar a ${apt.clientName}.`);
    }
  };

  const handleWhatsAppHref = (apt: Appointment) => {
    const cleanDigits = apt.clientPhone.replace(/\D/g, '');
    const msg = encodeURIComponent(buildReminderMessage(apt, services));
    return cleanDigits
      ? `https://wa.me/${cleanDigits}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
  };

  return (
    <section
      id="agenda"
      aria-labelledby="agenda-heading"
      className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-7 shadow-xl border border-[#0B1536]/10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#0B1536]/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0D3FE8] uppercase tracking-wider mb-1">
            <FourPointStar className="w-3.5 h-3.5 text-[#0D3FE8]" />
            <span>Agenda Exclusiva · 13 STUDIO</span>
          </div>
          <h2
            id="agenda-heading"
            className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#0B1536]"
          >
            Control de Citas
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#0B1536]/75">
            Todas las citas en orden cronológico, alertas 24h/1h y control de
            abonos.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0 bg-[#F2EEE4] px-4 py-3 rounded-2xl border border-[#0B1536]/10">
          <div>
            <span className="block text-[11px] font-semibold text-[#0B1536]/60">
              Próx. 24h
            </span>
            <span className="font-display text-2xl font-bold text-[#DF1B2D] tabular-nums">
              {upcoming24hCount}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-[#0B1536]/60">
              Activas
            </span>
            <span className="font-display text-2xl font-bold text-[#0B1536] tabular-nums">
              {activeAppointments.filter((a) => a.status === 'scheduled').length}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-[#0D3FE8]">
              Cobrado
            </span>
            <span className="font-display text-2xl font-bold text-[#0D3FE8] tabular-nums">
              {formatCurrency(
                activeAppointments.reduce((acc, a) => acc + a.amountPaid, 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mt-5 flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Filtrar agenda"
          className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F2EEE4] rounded-2xl border border-[#0B1536]/10"
        >
          {(
            [
              { id: 'all', label: 'Todas' },
              { id: 'upcoming_24h', label: `Próximas 24h (${upcoming24hCount})` },
              { id: 'today', label: 'Hoy' },
              { id: 'tomorrow', label: 'Mañana' },
              { id: 'pending_payment', label: 'Por cobrar' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#0B1536] text-white'
                  : 'text-[#0B1536]/75 hover:text-[#0B1536]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
      </div>

      {/* Appointments List */}
      <div className="mt-4 divide-y divide-[#0B1536]/10">
        {filteredAppointments.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#0B1536]/65">
            No hay citas registradas con este filtro. Registra un turno en el
            panel de nueva cita.
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const aptServices = services.filter((s) =>
              apt.serviceIds.includes(s.id)
            );
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
              <div key={apt.id} className="py-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="text-[#0D3FE8] tabular-nums">
                        {formatReadableDate(apt.date)}
                      </span>
                      <span aria-hidden="true" className="text-[#0B1536]/30">
                        ·
                      </span>
                      <span className="font-mono-num text-[#0B1536]">
                        {apt.time}
                      </span>

                      {isUrgent1h && (
                        <>
                          <span aria-hidden="true" className="text-[#0B1536]/30">
                            ·
                          </span>
                          <span className="text-[#DF1B2D] inline-flex items-center gap-1">
                            <Bell className="w-3.5 h-3.5" />
                            {formatCountdownLabel(minutesUntil)} (Alerta 1h)
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
                            {formatCountdownLabel(minutesUntil)} (Ventana 24h)
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

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <h3 className="text-lg font-bold text-[#0B1536]">
                        {apt.clientName}
                      </h3>
                      <span className="text-xs font-medium text-[#0B1536]/70 inline-flex items-center gap-1">
                        <Instagram className="w-3.5 h-3.5" aria-hidden="true" />
                        {apt.clientInstagram || 'Sin IG'}
                      </span>
                      <span className="text-xs font-mono-num text-[#0B1536]/65">
                        {apt.clientPhone}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-[#0B1536]/90">
                      {aptServices.map((s) => s.name).join(' + ')}
                    </p>

                    {apt.referenceNote && (
                      <p className="text-xs text-[#0B1536]/65">
                        Referencia: {apt.referenceNote}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="font-mono-num text-sm font-bold text-[#0B1536] tabular-nums">
                      Abonado {formatCurrency(apt.amountPaid)} /{' '}
                      {formatCurrency(apt.totalAmount)}
                    </div>
                    <div className="text-xs text-[#0B1536]/65 tabular-nums">
                      {remaining > 0
                        ? `Saldo pendiente: ${formatCurrency(remaining)}`
                        : 'Cuenta liquidada'}
                    </div>
                    {apt.transactionRef && (
                      <div className="text-[11px] font-mono-num text-[#0B1536]/50 mt-0.5">
                        Ref: {apt.transactionRef}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {remaining > 0 && !isCompleted && (
                    <button
                      type="button"
                      onClick={() => onSettlePayment(apt)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#DF1B2D] hover:bg-[#C01424] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {apt.amountPaid > 0
                        ? `Cobrar saldo (${formatCurrency(remaining)})`
                        : 'Cobrar / Registrar pago'}
                    </button>
                  )}

                  <a
                    href={handleWhatsAppHref(apt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onMarkReminderSent(apt.id)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyReminder(apt)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#0B1536]/15 text-[#0B1536] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#F2EEE4]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {apt.reminderSent ? 'Copiado' : 'Copiar aviso'}
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadAppointmentICS(apt, services)}
                    title="Exportar evento con alarmas 24h y 1h antes"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#0B1536]/15 text-[#0B1536] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#F2EEE4]"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    .ICS (24h+1h)
                  </button>

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => onMarkCompleted(apt.id)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl border border-emerald-700/25 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-emerald-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Lista
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onCancelAppointment(apt.id)}
                    aria-label={`Cancelar cita de ${apt.clientName}`}
                    className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-xl border border-[#DF1B2D]/25 text-[#DF1B2D] text-xs font-semibold inline-flex items-center justify-center cursor-pointer hover:bg-[#DF1B2D]/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
