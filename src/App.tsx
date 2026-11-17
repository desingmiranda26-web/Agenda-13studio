import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { AgendaDashboard } from './components/AgendaDashboard';
import { GallerySection } from './components/GallerySection';
import { NextAppointmentBanner } from './components/NextAppointmentBanner';
import { PaymentGatewayModal } from './components/PaymentGatewayModal';
import { FourPointStar } from './components/StarMotif';
import {
  CATEGORY_LABELS,
  CATEGORY_SUBTITLES,
  DEPOSIT_OPTIONS,
  getInitialSeedAppointments,
  STUDIO_POLICIES,
  STUDIO_SERVICES,
  TIME_SLOTS,
} from './data/studioData';
import type {
  Appointment,
  DepositOptionType,
  PaymentCheckoutContext,
  PaymentCollectionMode,
  PaymentMethod,
  ServiceCategory,
} from './types/studio';
import {
  calculateDepositDetails,
  formatCountdownLabel,
  formatCurrency,
  formatReadableDate,
  getMinutesUntilAppointment,
  getOffsetDateISO,
  getUpcomingDays,
  playSubtleChime,
} from './utils/studioHelpers';

const STORAGE_KEY = 'studio13_lashista_appointments_v2';

const CATEGORIES_ORDER: ServiceCategory[] = ['cejas', 'pestanas', 'depilacion'];

export default function App() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage read errors
    }
    return getInitialSeedAppointments();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    } catch {
      // ignore storage write errors
    }
  }, [appointments]);

  // Live clock tick every 30s for countdowns and 24h / 1h alert watcher
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  // Track which alert IDs already fired a live popup in this session
  const firedSessionAlertsRef = useRef<Set<string>>(new Set());

  // Booking form state (Lashista quick registration)
  const [activeServiceTab, setActiveServiceTab] =
    useState<ServiceCategory>('cejas');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([
    'cejas-laminado',
  ]);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getOffsetDateISO(1)
  );
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [depositOption, setDepositOption] =
    useState<DepositOptionType>('percentage_50');
  const [collectionMode, setCollectionMode] =
    useState<PaymentCollectionMode>('direct_record');
  const [directMethod, setDirectMethod] = useState<PaymentMethod>('pago_movil');
  const [directReference, setDirectReference] = useState('');
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [checkoutContext, setCheckoutContext] =
    useState<PaymentCheckoutContext | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const upcomingDays = useMemo(() => getUpcomingDays(14), []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 30-second interval for live countdown + 24h / 1h watcher
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Watch appointments entering 1h or 24h window and trigger browser notification when permitted
  useEffect(() => {
    appointments.forEach((apt) => {
      if (apt.status !== 'scheduled') return;
      const mins = getMinutesUntilAppointment(apt, nowMs);

      const is1h = mins >= -5 && mins <= 60 && !apt.notified1h;
      const is24h = mins > 60 && mins <= 1440 && !apt.notified24h;

      if (!is1h && !is24h) return;

      const sessionKey = `${apt.id}-${is1h ? '1h' : '24h'}`;
      if (firedSessionAlertsRef.current.has(sessionKey)) return;
      firedSessionAlertsRef.current.add(sessionKey);

      const serviceNames = STUDIO_SERVICES.filter((s) =>
        apt.serviceIds.includes(s.id)
      )
        .map((s) => s.name)
        .join(' + ');

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(
          is1h
            ? `13 STUDIO · ¡Cita ${formatCountdownLabel(mins)}!`
            : `13 STUDIO · Recordatorio 24h (${apt.time})`,
          {
            body: `${apt.clientName} (${apt.clientInstagram}) — ${serviceNames}`,
          }
        );
        playSubtleChime();
      }
    });
  }, [appointments, nowMs]);

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      showToast('Este navegador no soporta notificaciones nativas; usa los avisos en pantalla.');
      return;
    }
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      playSubtleChime();
      new Notification('13 STUDIO · Alertas activadas', {
        body: 'Recibirás recordatorios 24 horas y 1 hora antes de cada cita.',
      });
      showToast('Alertas del navegador activadas (24h y 1h antes).');
    } else {
      showToast('Permiso no concedido. Los avisos seguirán visibles en el banner superior.');
    }
  };

  const selectedServices = useMemo(
    () => STUDIO_SERVICES.filter((s) => selectedServiceIds.includes(s.id)),
    [selectedServiceIds]
  );

  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0),
    [selectedServices]
  );

  const depositDetails = useMemo(
    () => calculateDepositDetails(totalAmount, depositOption),
    [totalAmount, depositOption]
  );

  const occupiedSlotsForSelectedDate = useMemo(() => {
    return new Set(
      appointments
        .filter((a) => a.date === selectedDate && a.status !== 'cancelled')
        .map((a) => a.time)
    );
  }, [appointments, selectedDate]);

  useEffect(() => {
    if (selectedTime && occupiedSlotsForSelectedDate.has(selectedTime)) {
      setSelectedTime('');
    }
  }, [occupiedSlotsForSelectedDate, selectedTime]);

  const toggleService = (serviceId: string) => {
    setFormError(null);
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSelectServiceFromGallery = (serviceId: string) => {
    const target = STUDIO_SERVICES.find((s) => s.id === serviceId);
    if (target) {
      setActiveServiceTab(target.category);
    }
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev : [...prev, serviceId]
    );
    if (target) {
      showToast(`"${target.name}" añadido al registro de nueva cita.`);
    }
    const el = document.getElementById('registrar');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetBookingForm = () => {
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientInstagram('');
    setReferenceNote('');
    setDirectReference('');
    setPoliciesAccepted(false);
    setFormError(null);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedServiceIds.length === 0) {
      setFormError('Selecciona al menos un servicio para la clienta.');
      return;
    }
    if (!selectedDate) {
      setFormError('Elige una fecha para la cita.');
      return;
    }
    if (!selectedTime) {
      setFormError('Selecciona un horario disponible.');
      return;
    }
    if (occupiedSlotsForSelectedDate.has(selectedTime)) {
      setFormError('Ese horario ya tiene una cita registrada.');
      return;
    }
    if (!clientName.trim()) {
      setFormError('Ingresa el nombre completo de la clienta.');
      return;
    }
    if (!clientPhone.trim() && !clientInstagram.trim()) {
      setFormError('Ingresa WhatsApp o Instagram de la clienta.');
      return;
    }
    if (!policiesAccepted) {
      setFormError(
        'Confirma que la clienta conoce y acepta las normas de 13 STUDIO.'
      );
      return;
    }

    const formattedIg = clientInstagram.trim()
      ? clientInstagram.trim().startsWith('@')
        ? clientInstagram.trim()
        : `@${clientInstagram.trim()}`
      : 'Sin IG';

    const draft: Omit<Appointment, 'id' | 'createdAt'> = {
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || 'Sin teléfono',
      clientInstagram: formattedIg,
      referenceNote: referenceNote.trim(),
      serviceIds: [...selectedServiceIds],
      date: selectedDate,
      time: selectedTime,
      totalAmount,
      depositOption,
      amountPaid: 0,
      paymentStatus: 'pending',
      status: 'scheduled',
      policiesAccepted: true,
      reminderSent: false,
      notified24h: false,
      notified1h: false,
    };

    if (depositDetails.depositAmount <= 0) {
      const newApt: Appointment = {
        ...draft,
        id: `apt-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setAppointments((prev) => [newApt, ...prev]);
      resetBookingForm();
      showToast(
        `Cita registrada para ${newApt.clientName} (${formatReadableDate(
          newApt.date
        )} · ${newApt.time}) — Pendiente de pago.`
      );
      return;
    }

    if (collectionMode === 'direct_record') {
      const autoRef =
        directReference.trim() ||
        `REG-13S-${Math.floor(1000 + Math.random() * 9000)}`;
      const newApt: Appointment = {
        ...draft,
        id: `apt-${Date.now()}`,
        amountPaid: depositDetails.depositAmount,
        paymentStatus: depositDetails.resultingStatus,
        paymentMethod: directMethod,
        transactionRef: autoRef,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setAppointments((prev) => [newApt, ...prev]);
      resetBookingForm();
      showToast(
        `Cita agendada y abono registrado (${formatCurrency(
          newApt.amountPaid
        )} · ${autoRef}) para ${newApt.clientName}.`
      );
    } else {
      setCheckoutContext({
        mode: 'new_booking',
        appointmentDraft: draft,
        clientName: draft.clientName,
        date: draft.date,
        time: draft.time,
        serviceNames: selectedServices.map((s) => s.name),
        totalAmount,
        amountToPayNow: depositDetails.depositAmount,
        resultingPaymentStatus: depositDetails.resultingStatus,
        depositLabel: depositDetails.label,
      });
    }
  };

  const handleSettleExistingPayment = (apt: Appointment) => {
    const remaining = Math.max(
      0,
      Math.round((apt.totalAmount - apt.amountPaid) * 100) / 100
    );
    if (remaining <= 0) return;

    const serviceNames = STUDIO_SERVICES.filter((s) =>
      apt.serviceIds.includes(s.id)
    ).map((s) => s.name);

    setCheckoutContext({
      mode: 'settle_existing',
      existingAppointmentId: apt.id,
      clientName: apt.clientName,
      date: apt.date,
      time: apt.time,
      serviceNames,
      totalAmount: apt.totalAmount,
      amountToPayNow: remaining,
      resultingPaymentStatus: 'paid_full',
      depositLabel:
        apt.amountPaid > 0 ? 'Liquidación de saldo' : 'Pago completo de cita',
    });
  };

  const handlePaymentSuccess = ({
    method,
    transactionRef,
    paidAt,
  }: {
    method: PaymentMethod;
    transactionRef: string;
    paidAt: string;
  }) => {
    if (!checkoutContext) return;

    if (
      checkoutContext.mode === 'new_booking' &&
      checkoutContext.appointmentDraft
    ) {
      const created: Appointment = {
        ...checkoutContext.appointmentDraft,
        id: `apt-${Date.now()}`,
        amountPaid: checkoutContext.amountToPayNow,
        paymentStatus: checkoutContext.resultingPaymentStatus,
        paymentMethod: method,
        transactionRef,
        paidAt,
        createdAt: new Date().toISOString(),
      };
      setAppointments((prev) => [created, ...prev]);
      resetBookingForm();
      showToast(
        `Cobro aprobado (${transactionRef}). Cita agendada para ${created.clientName}.`
      );
    } else if (
      checkoutContext.mode === 'settle_existing' &&
      checkoutContext.existingAppointmentId
    ) {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === checkoutContext.existingAppointmentId
            ? {
                ...apt,
                amountPaid: apt.totalAmount,
                paymentStatus: 'paid_full',
                paymentMethod: method,
                transactionRef,
                paidAt,
              }
            : apt
        )
      );
      showToast(
        `Saldo liquidado (${transactionRef}). Estado actualizado a Pagado Total.`
      );
    }
  };

  const handleAcknowledgeAlert = (id: string, windowType: '1h' | '24h') => {
    setAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id !== id) return apt;
        return windowType === '1h'
          ? { ...apt, notified1h: true }
          : { ...apt, notified24h: true };
      })
    );
    showToast(`Alerta de ${windowType} marcada como atendida.`);
  };

  const handleMarkCompleted = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a))
    );
    showToast('Cita marcada como completada.');
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
    );
    showToast('Turno cancelado y horario liberado.');
  };

  const handleMarkReminderSent = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, reminderSent: true } : a))
    );
  };

  const tabServices = useMemo(
    () => STUDIO_SERVICES.filter((s) => s.category === activeServiceTab),
    [activeServiceTab]
  );

  return (
    <div className="min-h-screen bg-[#0D3FE8] text-white pb-20 md:pb-0">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#0D3FE8]/95 backdrop-blur-md border-b border-white/15">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#proxima-cita"
            className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-white uppercase whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <FourPointStar className="w-4 h-4 text-white shrink-0" />
            <span>13 STUDIO</span>
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-7 text-sm font-semibold text-white/85"
          >
            <a
              href="#proxima-cita"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Próxima Cita
            </a>
            <a
              href="#agenda"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Agenda
            </a>
            <a
              href="#servicios"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Servicios
            </a>
            <a
              href="#galeria"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Galería
            </a>
          </nav>

          <div className="shrink-0">
            <a
              href="#registrar"
              className="min-h-[42px] px-4 sm:px-5 py-2 rounded-xl bg-[#DF1B2D] hover:bg-[#C01424] text-white text-xs sm:text-sm font-bold tracking-wide inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors shadow-sm"
            >
              + Nueva Cita
            </a>
          </div>
        </div>
      </header>

      {/* Live Next Appointment Banner + 24h/1h Alert Strip */}
      <NextAppointmentBanner
        appointments={appointments}
        services={STUDIO_SERVICES}
        nowMs={nowMs}
        notificationPermission={notificationPermission}
        onRequestNotifications={handleRequestNotifications}
        onAcknowledgeAlert={handleAcknowledgeAlert}
        onSettlePayment={handleSettleExistingPayment}
        onMarkCompleted={handleMarkCompleted}
        onMarkReminderSent={handleMarkReminderSent}
        onNotify={showToast}
      />

      {/* Primary Private Specialist Workspace: Agenda Control + Quick Registration */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 cols: Agenda Dashboard */}
          <div className="lg:col-span-7">
            <AgendaDashboard
              appointments={appointments}
              services={STUDIO_SERVICES}
              nowMs={nowMs}
              onSettlePayment={handleSettleExistingPayment}
              onMarkCompleted={handleMarkCompleted}
              onCancelAppointment={handleCancelAppointment}
              onMarkReminderSent={handleMarkReminderSent}
              onNotify={showToast}
            />
          </div>

          {/* Right 5 cols: Lashista Quick Registration & Deposit Panel */}
          <section
            id="registrar"
            aria-labelledby="registrar-heading"
            className="lg:col-span-5 lg:sticky lg:top-20"
          >
            <form
              onSubmit={handleBookingSubmit}
              className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#0B1536]/10 space-y-5"
            >
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#0B1536]/10">
                <div>
                  <p className="text-xs font-semibold text-[#0D3FE8] uppercase tracking-wider">
                    Registro de la Lashista
                  </p>
                  <h2
                    id="registrar-heading"
                    className="font-display text-3xl sm:text-4xl font-bold uppercase text-[#0B1536]"
                  >
                    Nueva Cita
                  </h2>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] font-semibold text-[#0B1536]/60">
                    Total ({totalDuration} min)
                  </span>
                  <span className="font-display text-3xl font-bold text-[#DF1B2D] tabular-nums leading-none">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Compact Multi-Service Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#0B1536]/75">
                    1. Servicios ({selectedServices.length} elegidos)
                  </span>
                  {selectedServices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedServiceIds([])}
                      className="text-xs font-semibold text-[#DF1B2D] hover:underline cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F2EEE4] border border-[#0B1536]/10 mb-2.5">
                  {CATEGORIES_ORDER.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveServiceTab(cat)}
                      className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        activeServiceTab === cat
                          ? 'bg-[#0B1536] text-white'
                          : 'text-[#0B1536]/75 hover:text-[#0B1536]'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {tabServices.map((srv) => {
                    const isSelected = selectedServiceIds.includes(srv.id);
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => toggleService(srv.id)}
                        aria-pressed={isSelected}
                        className={`w-full min-h-[46px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#0D3FE8]/8 border-[#0D3FE8] text-[#0B1536]'
                            : 'bg-white border-[#0B1536]/12 text-[#0B1536] hover:border-[#0D3FE8]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#DF1B2D] text-white'
                                : 'border border-[#0B1536]/25 bg-white text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                          <span className="text-xs sm:text-sm font-semibold truncate">
                            {srv.name}
                          </span>
                        </div>
                        <span className="font-mono-num text-sm font-bold text-[#DF1B2D] shrink-0">
                          {formatCurrency(srv.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1536]/75 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-[#0D3FE8]" />
                  <span>2. Fecha de la cita</span>
                </label>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {upcomingDays.map((day) => {
                    const isSelected = selectedDate === day.iso;
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => {
                          setSelectedDate(day.iso);
                          setFormError(null);
                        }}
                        className={`min-w-[64px] min-h-[64px] px-2 py-1.5 rounded-2xl border flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#0D3FE8] text-white border-[#0D3FE8]'
                            : 'bg-white text-[#0B1536] border-[#0B1536]/15 hover:border-[#0D3FE8]'
                        }`}
                      >
                        <span
                          className={`text-[10px] font-semibold uppercase ${
                            isSelected ? 'text-white/85' : 'text-[#0B1536]/55'
                          }`}
                        >
                          {day.relativeTag || day.weekdayShort}
                        </span>
                        <span className="font-display text-xl font-bold leading-tight tabular-nums">
                          {day.dayNumber}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            isSelected ? 'text-white/85' : 'text-[#0B1536]/60'
                          }`}
                        >
                          {day.monthShort}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1536]/75">
                    <Clock className="w-3.5 h-3.5 text-[#0D3FE8]" />
                    <span>3. Bloque horario</span>
                  </span>
                  <span className="text-[11px] text-[#0B1536]/60">
                    {TIME_SLOTS.length - occupiedSlotsForSelectedDate.size}{' '}
                    disponibles
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isOccupied = occupiedSlotsForSelectedDate.has(slot);
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => {
                          setSelectedTime(slot);
                          setFormError(null);
                        }}
                        className={`min-h-[42px] px-2 py-2 rounded-xl border text-xs font-mono-num font-semibold transition-colors whitespace-nowrap ${
                          isOccupied
                            ? 'bg-[#E9E4D8] text-[#0B1536]/35 border-transparent line-through cursor-not-allowed'
                            : isSelected
                              ? 'bg-[#0B1536] text-white border-[#0B1536] cursor-pointer'
                              : 'bg-white text-[#0B1536] border-[#0B1536]/15 hover:border-[#0D3FE8] cursor-pointer'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client Information */}
              <div className="space-y-2.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1536]/75">
                  <UserCheck className="w-3.5 h-3.5 text-[#0D3FE8]" />
                  <span>4. Datos de la clienta</span>
                </span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre completo *"
                  aria-label="Nombre completo de la clienta"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="WhatsApp / Teléfono"
                    aria-label="WhatsApp o teléfono"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
                  />
                  <input
                    type="text"
                    value={clientInstagram}
                    onChange={(e) => setClientInstagram(e.target.value)}
                    placeholder="Instagram (@usuario)"
                    aria-label="Usuario de Instagram"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
                  />
                </div>
                <input
                  type="text"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="Referencia de diseño o detalle en camilla"
                  aria-label="Nota o referencia de diseño"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
                />
              </div>

              {/* Prepayment / Deposit Section */}
              <div className="space-y-3 pt-2 border-t border-[#0B1536]/10">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1536]/75">
                  <CreditCard className="w-3.5 h-3.5 text-[#0D3FE8]" />
                  <span>5. Pago anticipado o depósito</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {DEPOSIT_OPTIONS.map((opt) => {
                    const isActive = depositOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDepositOption(opt.id)}
                        className={`min-h-[48px] px-2.5 py-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#0D3FE8] text-white border-[#0D3FE8]'
                            : 'bg-white text-[#0B1536] border-[#0B1536]/15 hover:border-[#0D3FE8]'
                        }`}
                      >
                        <span className="block text-xs font-bold leading-tight">
                          {opt.label}
                        </span>
                        <span
                          className={`block text-[10px] mt-0.5 ${
                            isActive ? 'text-white/80' : 'text-[#0B1536]/60'
                          }`}
                        >
                          {opt.shortNote}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Lashista Payment Mode: Direct Abono Record vs Simulated Gateway */}
                {depositDetails.depositAmount > 0 && (
                  <div className="rounded-2xl bg-[#F2EEE4] p-3.5 border border-[#0B1536]/10 space-y-3">
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-[#0B1536]/10">
                      <button
                        type="button"
                        onClick={() => setCollectionMode('direct_record')}
                        className={`min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          collectionMode === 'direct_record'
                            ? 'bg-[#0B1536] text-white'
                            : 'text-[#0B1536]/75 hover:text-[#0B1536]'
                        }`}
                      >
                        Registrar abono
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollectionMode('gateway')}
                        className={`min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          collectionMode === 'gateway'
                            ? 'bg-[#0B1536] text-white'
                            : 'text-[#0B1536]/75 hover:text-[#0B1536]'
                        }`}
                      >
                        Pasarela simulada
                      </button>
                    </div>

                    {collectionMode === 'direct_record' && (
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={directMethod}
                          onChange={(e) =>
                            setDirectMethod(e.target.value as PaymentMethod)
                          }
                          aria-label="Método del abono recibido"
                          className="min-h-[40px] px-2.5 rounded-xl bg-white border border-[#0B1536]/15 text-xs font-semibold text-[#0B1536]"
                        >
                          <option value="pago_movil">Pago Móvil</option>
                          <option value="cash">Efectivo $</option>
                          <option value="zelle">Zelle</option>
                          <option value="card">Punto / Tarjeta</option>
                        </select>
                        <input
                          type="text"
                          value={directReference}
                          onChange={(e) => setDirectReference(e.target.value)}
                          placeholder="Ref. (opcional)"
                          aria-label="Referencia del abono"
                          className="min-h-[40px] px-2.5 rounded-xl bg-white border border-[#0B1536]/15 text-xs font-mono-num text-[#0B1536]"
                        />
                      </div>
                    )}

                    <div className="flex justify-between text-xs pt-1 border-t border-[#0B1536]/10">
                      <span className="font-semibold text-[#0D3FE8]">
                        Abono: {formatCurrency(depositDetails.depositAmount)}
                      </span>
                      <span className="font-mono-num text-[#0B1536]/75">
                        Resta: {formatCurrency(depositDetails.remainingAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mandatory Studio Policies */}
              <div className="rounded-2xl bg-[#F2EEE4] p-3.5 border border-[#0B1536]/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#DF1B2D]">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Políticas obligatorias del estudio</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#0B1536]/85">
                  {STUDIO_POLICIES.map((pol, idx) => (
                    <li key={pol.id} className="leading-snug">
                      <strong className="text-[#0B1536]">
                        {idx + 1}. {pol.title}:
                      </strong>{' '}
                      {pol.detail}
                    </li>
                  ))}
                </ul>
                <label className="flex items-start gap-2.5 pt-2 border-t border-[#0B1536]/10 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={policiesAccepted}
                    onChange={(e) => {
                      setPoliciesAccepted(e.target.checked);
                      if (e.target.checked) setFormError(null);
                    }}
                    className="mt-0.5 w-5 h-5 rounded accent-[#DF1B2D] shrink-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#0B1536] leading-snug">
                    Clienta informada: acepta normas de puntualidad (10 min),
                    sin acompañantes y envío de referencia.
                  </span>
                </label>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 text-xs font-semibold text-[#DF1B2D] bg-[#DF1B2D]/10 px-3.5 py-2.5 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[54px] px-5 py-3 rounded-2xl bg-[#DF1B2D] hover:bg-[#C01424] active:scale-[0.99] text-white font-display text-2xl font-bold uppercase tracking-wider shadow-lg shadow-[#DF1B2D]/30 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <CalendarCheck className="w-5 h-5" aria-hidden="true" />
                <span>
                  {depositDetails.depositAmount <= 0
                    ? 'AGENDAR CITA'
                    : collectionMode === 'direct_record'
                      ? `AGENDAR · ABONO ${formatCurrency(
                          depositDetails.depositAmount
                        )}`
                      : `AGENDAR Y COBRAR ${formatCurrency(
                          depositDetails.depositAmount
                        )}`}
                </span>
              </button>
            </form>
          </section>
        </div>
      </main>

      {/* Full Service Menu Reference Section (synced with Nueva Cita) */}
      <section
        id="servicios"
        aria-labelledby="servicios-heading"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
              <FourPointStar className="w-3.5 h-3.5 text-white" />
              <span>Tarifario oficial 13 STUDIO</span>
            </div>
            <h2
              id="servicios-heading"
              className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white"
            >
              Catálogo de Servicios
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-white/85">
            Toca cualquier servicio para añadirlo o quitarlo de la nueva cita.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CATEGORIES_ORDER.map((category) => {
            const items = STUDIO_SERVICES.filter((s) => s.category === category);
            return (
              <div
                key={category}
                className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#0B1536]/10 flex flex-col"
              >
                <div className="flex items-baseline justify-between gap-3 pb-4 border-b border-[#0B1536]/10">
                  <div>
                    <h3 className="font-display text-3xl font-bold uppercase text-[#0D3FE8]">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <p className="text-xs text-[#0B1536]/65 mt-0.5">
                      {CATEGORY_SUBTITLES[category]}
                    </p>
                  </div>
                  <FourPointStar className="w-4 h-4 text-[#DF1B2D] shrink-0" />
                </div>

                <div className="mt-3 divide-y divide-[#0B1536]/10 flex-1">
                  {items.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        aria-pressed={isSelected}
                        className={`w-full min-h-[60px] py-3 px-2.5 my-1 rounded-2xl flex items-center justify-between gap-3 text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#0D3FE8]/8 ring-2 ring-[#0D3FE8]'
                            : 'hover:bg-[#F2EEE4]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-sm sm:text-base text-[#0B1536]">
                            {service.name}
                          </p>
                          <p className="text-xs text-[#0B1536]/65">
                            {service.subtitle} · {service.durationMinutes} min
                          </p>
                        </div>
                        <span className="font-display text-2xl sm:text-3xl font-bold text-[#DF1B2D] tabular-nums shrink-0">
                          {formatCurrency(service.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gallery Section */}
      <GallerySection
        onSelectServiceFromGallery={handleSelectServiceFromGallery}
      />

      {/* Institutional Footer */}
      <footer className="border-t border-white/15 bg-[#082BB3]/60 mt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <FourPointStar className="w-5 h-5 text-white shrink-0" />
            <div>
              <p className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                13 STUDIO · Tu mirada, tus reglas.
              </p>
              <p className="text-xs text-white/75">
                Agenda privada de lashista y cejista · Recordatorios 24h y 1h
                antes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs font-semibold text-white/85">
            <a href="#proxima-cita" className="hover:text-white">
              Próxima Cita
            </a>
            <a href="#agenda" className="hover:text-white">
              Agenda
            </a>
            <a href="#registrar" className="hover:text-white">
              Nueva Cita
            </a>
            <a href="#galeria" className="hover:text-white">
              Galería
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (h-14, within 15% cap) */}
      <nav
        aria-label="Navegación rápida móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#0B1536]/95 backdrop-blur-md border-t border-white/15 grid grid-cols-4 items-center px-2"
      >
        <a
          href="#proxima-cita"
          className="h-full flex items-center justify-center text-[11px] font-semibold text-white/85 hover:text-white"
        >
          Próx. Cita
        </a>
        <a
          href="#agenda"
          className="h-full flex items-center justify-center text-[11px] font-semibold text-white/85 hover:text-white"
        >
          Agenda
        </a>
        <a
          href="#registrar"
          className="h-full flex items-center justify-center text-[11px] font-bold text-[#92D5F0]"
        >
          + Nueva
        </a>
        <a
          href="#galeria"
          className="h-full flex items-center justify-center text-[11px] font-semibold text-white/85 hover:text-white"
        >
          Galería
        </a>
      </nav>

      {/* Simulated Payment Gateway Modal */}
      {checkoutContext && (
        <PaymentGatewayModal
          context={checkoutContext}
          onClose={() => setCheckoutContext(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Toast Confirmation */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 bg-[#0B1536] text-white border border-white/20 rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-[#92D5F0] shrink-0" />
          <p className="text-xs sm:text-sm font-medium flex-1">{toastMessage}</p>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs font-bold text-white/70 hover:text-white cursor-pointer px-1"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
