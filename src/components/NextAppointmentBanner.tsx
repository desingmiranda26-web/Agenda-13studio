import { useState } from 'react';
import {
  Bell,
  BellRing,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Instagram,
  MessageCircle,
  Volume2,
} from 'lucide-react';
import type { Appointment, StudioService } from '../types/studio';
import {
  buildReminderMessage,
  downloadAppointmentICS,
  formatCountdownLabel,
  formatCurrency,
  formatReadableDate,
  getMinutesUntilAppointment,
  getPaymentStatusLabel,
  playSubtleChime,
} from '../utils/studioHelpers';
import { FourPointStar } from './StarMotif';

interface NextAppointmentBannerProps {
  appointments: Appointment[];
  services: StudioService[];
  nowMs: number;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotifications: () => void;
  onAcknowledgeAlert: (id: string, windowType: '1h' | '24h') => void;
  onSettlePayment: (appointment: Appointment) => void;
  onMarkCompleted: (id: string) => void;
  onMarkReminderSent: (id: string) => void;
  onNotify: (msg: string) => void;
}

export function NextAppointmentBanner({
  appointments,
  services,
  nowMs,
  notificationPermission,
  onRequestNotifications,
  onAcknowledgeAlert,
  onSettlePayment,
  onMarkCompleted,
  onMarkReminderSent,
  onNotify,
}: NextAppointmentBannerProps) {
  const [logoBroken, setLogoBroken] = useState(false);

  const upcomingScheduled = appointments
    .filter((a) => a.status === 'scheduled')
    .map((apt) => ({
      apt,
      minutesUntil: getMinutesUntilAppointment(apt, nowMs),
    }))
    .filter(({ minutesUntil }) => minutesUntil >= -30)
    .sort((a, b) => a.minutesUntil - b.minutesUntil);

  const nextEntry = upcomingScheduled[0] || null;

  const activeAlerts = upcomingScheduled.filter(({ apt, minutesUntil }) => {
    const is1hWindow = minutesUntil >= -15 && minutesUntil <= 60 && !apt.notified1h;
    const is24hWindow =
      minutesUntil > 60 && minutesUntil <= 1440 && !apt.notified24h;
    return is1hWindow || is24hWindow;
  });

  const handleCopy = async (apt: Appointment) => {
    const msg = buildReminderMessage(apt, services);
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      // clipboard fallback
    }
    onMarkReminderSent(apt.id);
    onNotify(`Aviso copiado para ${apt.clientName}.`);
  };

  const handleTestAlert = async () => {
    playSubtleChime();
    if (!nextEntry) {
      onNotify('No hay citas próximas programadas para simular alerta.');
      return;
    }
    const { apt, minutesUntil } = nextEntry;
    const serviceNames = services
      .filter((s) => apt.serviceIds.includes(s.id))
      .map((s) => s.name)
      .join(' + ');

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(`13 STUDIO · Próxima cita (${formatCountdownLabel(minutesUntil)})`, {
        body: `${apt.clientName} (${apt.time}) — ${serviceNames}`,
      });
    }
    onNotify(
      `Recordatorio activo: ${apt.clientName} (${formatCountdownLabel(minutesUntil)}) — ${serviceNames}.`
    );
  };

  const getWhatsAppHref = (apt: Appointment) => {
    const digits = apt.clientPhone.replace(/\D/g, '');
    const text = encodeURIComponent(buildReminderMessage(apt, services));
    return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  return (
    <section
      id="proxima-cita"
      aria-labelledby="proxima-cita-heading"
      className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 pb-4"
    >
      {/* Top Specialist Header & Notification Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3.5">
          {!logoBroken ? (
            <img
              src="/assets/aistudio/13_-_1_bc989be7.png"
              alt="13 STUDIO"
              referrerPolicy="no-referrer"
              onError={() => setLogoBroken(true)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-white/25 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#990F17] flex items-center justify-center font-display text-2xl text-[#92D5F0] shrink-0">
              13
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#92D5F0]">
              <FourPointStar className="w-3 h-3 text-white" />
              <span>Panel privado de la lashista y cejista</span>
            </div>
            <h1
              id="proxima-cita-heading"
              className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-none mt-0.5"
            >
              13 STUDIO · MIRADA ON POINT.
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {notificationPermission !== 'granted' &&
          notificationPermission !== 'unsupported' ? (
            <button
              type="button"
              onClick={onRequestNotifications}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#FAF8F2] hover:bg-[#F2EEE4] text-[#0B1536] text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Bell className="w-4 h-4 text-[#DF1B2D]" />
              <span>Activar alertas 24h y 1h</span>
            </button>
          ) : (
            <span className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#082BB3] border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#92D5F0]" />
              <span>Alertas 24h / 1h activas</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleTestAlert}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#082BB3] hover:bg-[#0B1536] border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Volume2 className="w-4 h-4 text-[#92D5F0]" />
            <span>Probar aviso</span>
          </button>
        </div>
      </div>

      {/* Active 1h / 24h Window Alerts */}
      {activeAlerts.length > 0 && (
        <div
          role="region"
          aria-label="Alertas activas de próximas citas"
          className="mb-5 space-y-2.5"
        >
          {activeAlerts.map(({ apt, minutesUntil }) => {
            const is1h = minutesUntil <= 60;
            const serviceNames = services
              .filter((s) => apt.serviceIds.includes(s.id))
              .map((s) => s.name)
              .join(' + ');

            return (
              <div
                key={`alert-${apt.id}-${is1h ? '1h' : '24h'}`}
                className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border shadow-lg ${
                  is1h
                    ? 'bg-[#DF1B2D] text-white border-white/25'
                    : 'bg-[#082BB3] text-white border-[#92D5F0]/45'
                }`}
              >
                <div className="flex items-start gap-3">
                  <BellRing className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/90">
                      {is1h
                        ? `Alerta 1 hora antes · ${formatCountdownLabel(minutesUntil)}`
                        : `Recordatorio 24 horas antes · ${formatCountdownLabel(minutesUntil)}`}
                    </p>
                    <p className="text-sm sm:text-base font-bold">
                      {apt.clientName} ({apt.clientInstagram}) · {apt.time} —{' '}
                      {serviceNames}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={getWhatsAppHref(apt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onMarkReminderSent(apt.id)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white text-[#0B1536] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#FAF8F2]"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                    Avisar clienta
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      onAcknowledgeAlert(apt.id, is1h ? '1h' : '24h')
                    }
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0B1536]/35 hover:bg-[#0B1536]/55 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Entendido
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Next Appointment Hero Card */}
      {nextEntry ? (
        (() => {
          const { apt, minutesUntil } = nextEntry;
          const aptServices = services.filter((s) =>
            apt.serviceIds.includes(s.id)
          );
          const remaining = Math.max(
            0,
            Math.round((apt.totalAmount - apt.amountPaid) * 100) / 100
          );
          const isUrgent = minutesUntil <= 60;

          return (
            <div className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-7 shadow-xl border border-white/25">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        isUrgent ? 'text-[#DF1B2D]' : 'text-[#0D3FE8]'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>
                        PRÓXIMA CITA · {formatCountdownLabel(minutesUntil)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-[#0B1536]/30">
                      ·
                    </span>
                    <span className="font-mono-num text-[#0B1536]">
                      {formatReadableDate(apt.date)} · {apt.time}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#0B1536]">
                      {apt.clientName}
                    </h2>
                    <span className="text-xs sm:text-sm font-semibold text-[#0B1536]/70 inline-flex items-center gap-1">
                      <Instagram className="w-3.5 h-3.5" />
                      {apt.clientInstagram}
                    </span>
                    <span className="text-xs sm:text-sm font-mono-num text-[#0B1536]/65">
                      {apt.clientPhone}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-semibold text-[#0D3FE8]">
                    {aptServices.map((s) => s.name).join(' + ')}
                  </p>

                  {apt.referenceNote && (
                    <p className="text-xs sm:text-sm text-[#0B1536]/75">
                      Nota de diseño: {apt.referenceNote}
                    </p>
                  )}
                </div>

                {/* Right Financial & Quick Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#0B1536]/10">
                  <div className="text-left lg:text-right">
                    <span className="text-xs font-bold text-[#0B1536]/65 block">
                      {getPaymentStatusLabel(apt.paymentStatus)} · Total{' '}
                      {formatCurrency(apt.totalAmount)}
                    </span>
                    <span className="font-display text-2xl sm:text-3xl font-bold text-[#DF1B2D] tabular-nums">
                      {remaining > 0
                        ? `Resta ${formatCurrency(remaining)}`
                        : 'Pagado 100%'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => onSettlePayment(apt)}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#DF1B2D] hover:bg-[#C01424] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Cobrar {formatCurrency(remaining)}
                      </button>
                    )}

                    <a
                      href={getWhatsAppHref(apt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onMarkReminderSent(apt.id)}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopy(apt)}
                      className="min-h-[42px] px-3 py-2 rounded-xl border border-[#0B1536]/15 text-[#0B1536] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#F2EEE4]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadAppointmentICS(apt, services)}
                      className="min-h-[42px] px-3 py-2 rounded-xl border border-[#0B1536]/15 text-[#0B1536] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#F2EEE4]"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      .ICS
                    </button>

                    <button
                      type="button"
                      onClick={() => onMarkCompleted(apt.id)}
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0B1536] hover:bg-[#0D3FE8] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Lista
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-6 text-center shadow-lg">
          <p className="font-display text-2xl uppercase">
            Sin citas próximas registradas
          </p>
          <p className="text-sm text-[#0B1536]/70 mt-1">
            Registra un turno nuevo en el panel derecho para activar la cuenta
            regresiva y las alertas de 24h y 1h antes.
          </p>
        </div>
      )}
    </section>
  );
}
