import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Check,
  CheckCircle2,
  CreditCard,
  Images,
  Layers,
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

const STORAGE_KEY = 'studio13_lashista_appointments_v3';

type AppTab = 'agenda' | 'nueva_cita' | 'servicios' | 'galeria';

const CATEGORIES_ORDER: ServiceCategory[] = ['cejas', 'pestanas', 'depilacion'];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('agenda');

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

  // Live clock tick every 30s for countdowns & 24h / 1h watcher
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  const firedSessionAlertsRef = useRef<Set<string>>(new Set());

  // Booking state
  const [activeServiceTab, setActiveServiceTab] =
    useState<ServiceCategory>('cejas');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([
    'cejas-laminado',
  ]);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getOffsetDateISO(0)
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

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Watch 24h & 1h windows and fire Notification API when permitted
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
      showToast(
        'Este navegador no soporta alertas nativas; usa el banner en pantalla.'
      );
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
      showToast('Permiso denegado. Los avisos seguirán visibles en el banner.');
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

  const switchTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleService = (serviceId: string) => {
    setFormError(null);
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleQuickBookSlot = (dateISO: string, timeSlot: string) => {
    setSelectedDate(dateISO);
    setSelectedTime(timeSlot);
    setFormError(null);
    switchTab('nueva_cita');
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
      showToast(`"${target.name}" añadido a la nueva cita.`);
    }
    switchTab('nueva_cita');
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
      setFormError('Elige una fecha disponible.');
      return;
    }
    if (!selectedTime) {
      setFormError('Selecciona un bloque horario de 7:00 AM a 7:00 PM.');
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
        'Confirma que la clienta fue informada y acepta las normas de 13 STUDIO.'
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
        `Cita agendada para ${newApt.clientName} (${formatReadableDate(
          newApt.date
        )} · ${newApt.time}).`
      );
      switchTab('agenda');
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
        )} · ${autoRef}).`
      );
      switchTab('agenda');
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
        `Cobro aprobado (${transactionRef}). Turno confirmado para ${created.clientName}.`
      );
      setActiveTab('agenda');
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
    showToast(`Alerta de ${windowType} marcada como vista.`);
  };

  const handleMarkCompleted = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a))
    );
    showToast('Cita marcada como atendida.');
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
    <div className="min-h-screen bg-[#0D3FE8] text-white flex flex-col pb-20 md:pb-0">
      {/* Top App Bar (3-zone contract) */}
      <header className="sticky top-0 z-40 bg-[#0D3FE8]/95 backdrop-blur-md border-b border-white/15">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => switchTab('agenda')}
            className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-white uppercase whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <FourPointStar className="w-4 h-4 text-white shrink-0" />
            <span>13 STUDIO</span>
          </button>

          <nav
            aria-label="Vistas de la aplicación"
            className="hidden md:flex items-center gap-7 text-sm font-semibold"
          >
            {(
              [
                { id: 'agenda', label: 'Agenda' },
                { id: 'nueva_cita', label: 'Nueva Cita' },
                { id: 'servicios', label: 'Servicios' },
                { id: 'galeria', label: 'Galería' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-white underline underline-offset-8 decoration-2 decoration-[#92D5F0]'
                      : 'text-white/75 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => switchTab('nueva_cita')}
              className="min-h-[42px] px-4 sm:px-5 py-2 rounded-xl bg-[#DF1B2D] hover:bg-[#C01424] text-white text-xs sm:text-sm font-bold tracking-wide inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-sm"
            >
              + Nueva Cita
            </button>
          </div>
        </div>
      </header>

      {/* Active View Body */}
      <div className="flex-1">
        {activeTab === 'agenda' && (
          <>
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

            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-10">
              <AgendaDashboard
                appointments={appointments}
                services={STUDIO_SERVICES}
                nowMs={nowMs}
                onQuickBookSlot={handleQuickBookSlot}
                onSettlePayment={handleSettleExistingPayment}
                onMarkCompleted={handleMarkCompleted}
                onCancelAppointment={handleCancelAppointment}
                onMarkReminderSent={handleMarkReminderSent}
                onNotify={showToast}
              />
            </div>
          </>
        )}

        {activeTab === 'nueva_cita' && (
          <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#92D5F0]">
                  <FourPointStar className="w-3 h-3 text-white" />
                  <span>Registro Exclusivo · 7:00 AM a 7:00 PM</span>
                </div>
                <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white mt-0.5">
                  Agendar Nueva Cita
                </h1>
              </div>

              <div className="text-right bg-[#082BB3] border border-white/15 px-4 py-2.5 rounded-2xl">
                <span className="block text-[11px] text-white/75">
                  Total ({totalDuration} min)
                </span>
                <span className="font-display text-2xl sm:text-3xl font-bold text-[#92D5F0] tabular-nums">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleBookingSubmit}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left 7 cols: Services + Date + Hourly Slots */}
              <div className="lg:col-span-7 space-y-6">
                {/* Step 1: Services */}
                <div className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#0B1536]/10 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#0B1536]">
                      1. Selecciona servicios ({selectedServices.length})
                    </h2>
                    {selectedServices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedServiceIds([])}
                        className="text-xs font-bold text-[#DF1B2D] hover:underline cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F2EEE4] border border-[#0B1536]/10">
                    {CATEGORIES_ORDER.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveServiceTab(cat)}
                        className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
                          activeServiceTab === cat
                            ? 'bg-[#0B1536] text-white'
                            : 'text-[#0B1536]/75 hover:text-[#0B1536]'
                        }`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {tabServices.map((srv) => {
                      const isSelected = selectedServiceIds.includes(srv.id);
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => toggleService(srv.id)}
                          aria-pressed={isSelected}
                          className={`w-full min-h-[60px] px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#0D3FE8]/8 border-[#0D3FE8] ring-1 ring-[#0D3FE8]'
                              : 'bg-white border-[#0B1536]/12 hover:border-[#0D3FE8]/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-[#DF1B2D] text-white'
                                  : 'border-2 border-[#0B1536]/25 bg-white text-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-sm sm:text-base text-[#0B1536]">
                                {srv.name}
                              </p>
                              <p className="text-xs text-[#0B1536]/65">
                                {srv.subtitle} · {srv.durationMinutes} min
                              </p>
                            </div>
                          </div>
                          <span className="font-display text-2xl sm:text-3xl font-bold text-[#DF1B2D] tabular-nums shrink-0">
                            {formatCurrency(srv.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Date & 7am-7pm Hourly Grid */}
                <div className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#0B1536]/10 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#0B1536]">
                      2. Fecha y Hora (7:00 AM – 7:00 PM)
                    </h2>
                    <span className="text-xs font-semibold text-[#0D3FE8]">
                      {TIME_SLOTS.length - occupiedSlotsForSelectedDate.size}{' '}
                      libres
                    </span>
                  </div>

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
                          className={`min-w-[66px] min-h-[66px] px-2 py-1.5 rounded-2xl border flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer ${
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
                          <span className="font-display text-2xl font-bold leading-tight tabular-nums">
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

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                          className={`min-h-[46px] px-2 py-2 rounded-xl border text-xs font-mono-num font-bold transition-colors whitespace-nowrap ${
                            isOccupied
                              ? 'bg-[#E9E4D8] text-[#0B1536]/35 border-transparent line-through cursor-not-allowed'
                              : isSelected
                                ? 'bg-[#0B1536] text-white border-[#0B1536] cursor-pointer shadow-sm'
                                : 'bg-white text-[#0B1536] border-[#0B1536]/15 hover:border-[#0D3FE8] cursor-pointer'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right 5 cols: Client Info + Deposit + Policies + Submit */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#0B1536]/10 space-y-5">
                  {/* Step 3: Client Details */}
                  <div className="space-y-2.5">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#0B1536] flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-[#0D3FE8]" />
                      <span>3. Datos de la clienta</span>
                    </h2>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nombre completo *"
                      aria-label="Nombre completo de la clienta"
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="WhatsApp / Teléfono"
                        aria-label="WhatsApp o teléfono"
                        className="w-full min-h-[46px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
                      />
                      <input
                        type="text"
                        value={clientInstagram}
                        onChange={(e) => setClientInstagram(e.target.value)}
                        placeholder="Instagram (@usuario)"
                        aria-label="Instagram"
                        className="w-full min-h-[46px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
                      />
                    </div>
                    <input
                      type="text"
                      value={referenceNote}
                      onChange={(e) => setReferenceNote(e.target.value)}
                      placeholder="Nota de diseño / curvatura / largo"
                      aria-label="Referencia de diseño"
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm text-[#0B1536] focus:outline-none focus:border-[#0D3FE8]"
                    />
                  </div>

                  {/* Step 4: Prepayment / Deposit */}
                  <div className="space-y-3 pt-3 border-t border-[#0B1536]/10">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0D3FE8]">
                      <CreditCard className="w-4 h-4" />
                      <span>4. Depósito o pago anticipado</span>
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
                              <option value="card">Tarjeta</option>
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
                          <span className="font-bold text-[#0D3FE8]">
                            Abono: {formatCurrency(depositDetails.depositAmount)}
                          </span>
                          <span className="font-mono-num text-[#0B1536]/75">
                            Resta: {formatCurrency(depositDetails.remainingAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 5: Mandatory Policies */}
                  <div className="rounded-2xl bg-[#F2EEE4] p-3.5 border border-[#0B1536]/10 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#DF1B2D]">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Normas obligatorias · 13 STUDIO</span>
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
                        Clienta informada: acepta 10 min de espera, sin
                        acompañantes y envío previo de referencia.
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
                </div>
              </div>
            </form>
          </main>
        )}

        {activeTab === 'servicios' && (
          <section
            id="servicios"
            aria-labelledby="servicios-heading"
            className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#92D5F0] uppercase tracking-wider mb-1">
                  <FourPointStar className="w-3.5 h-3.5 text-white" />
                  <span>Tarifario oficial 13 STUDIO</span>
                </div>
                <h1
                  id="servicios-heading"
                  className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white"
                >
                  Menú de Servicios
                </h1>
              </div>

              <button
                type="button"
                onClick={() => switchTab('nueva_cita')}
                className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#DF1B2D] hover:bg-[#C01424] text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
              >
                <span>
                  Ir a Nueva Cita ({selectedServices.length} ·{' '}
                  {formatCurrency(totalAmount)})
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {CATEGORIES_ORDER.map((category) => {
                const items = STUDIO_SERVICES.filter(
                  (s) => s.category === category
                );
                return (
                  <div
                    key={category}
                    className="bg-[#FAF8F2] text-[#0B1536] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#0B1536]/10 flex flex-col"
                  >
                    <div className="flex items-baseline justify-between gap-3 pb-4 border-b border-[#0B1536]/10">
                      <div>
                        <h2 className="font-display text-3xl font-bold uppercase text-[#0D3FE8]">
                          {CATEGORY_LABELS[category]}
                        </h2>
                        <p className="text-xs text-[#0B1536]/65 mt-0.5">
                          {CATEGORY_SUBTITLES[category]}
                        </p>
                      </div>
                      <FourPointStar className="w-4 h-4 text-[#DF1B2D] shrink-0" />
                    </div>

                    <div className="mt-3 divide-y divide-[#0B1536]/10 flex-1">
                      {items.map((service) => {
                        const isSelected = selectedServiceIds.includes(
                          service.id
                        );
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleService(service.id)}
                            aria-pressed={isSelected}
                            className={`w-full min-h-[64px] py-3 px-3 my-1 rounded-2xl flex items-center justify-between gap-3 text-left cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#0D3FE8]/8 ring-2 ring-[#0D3FE8]'
                                : 'hover:bg-[#F2EEE4]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-[#DF1B2D] text-white'
                                    : 'border-2 border-[#0B1536]/25 bg-white text-transparent'
                                }`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-sm sm:text-base text-[#0B1536]">
                                  {service.name}
                                </p>
                                <p className="text-xs text-[#0B1536]/65">
                                  {service.subtitle} · {service.durationMinutes}{' '}
                                  min
                                </p>
                              </div>
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
        )}

        {activeTab === 'galeria' && (
          <GallerySection
            onSelectServiceFromGallery={handleSelectServiceFromGallery}
          />
        )}
      </div>

      {/* Institutional Closing Footer */}
      <footer className="border-t border-white/15 bg-[#082BB3]/60 mt-auto">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <FourPointStar className="w-4 h-4 text-white shrink-0" />
            <p className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wide text-white">
              13 STUDIO · Tu mirada, tus reglas.
            </p>
          </div>
          <p className="text-xs text-white/75">
            Horario de atención: 7:00 AM – 7:00 PM · Control exclusivo de la
            lashista.
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar (Thumb Zone, 64px height <= 15% viewport cap) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0B1536]/95 backdrop-blur-md border-t border-white/15 grid grid-cols-4 items-center px-1"
      >
        {(
          [
            { id: 'agenda', label: 'Agenda', Icon: Calendar },
            { id: 'nueva_cita', label: 'Nueva Cita', Icon: CalendarPlus },
            { id: 'servicios', label: 'Servicios', Icon: Layers },
            { id: 'galeria', label: 'Galería', Icon: Images },
          ] as const
        ).map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                isActive ? 'text-[#92D5F0]' : 'text-white/75 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
              <span className="text-[11px] font-semibold tracking-tight">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Simulated Payment Gateway Bottom-Sheet / Modal */}
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
          className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 bg-[#0B1536] text-white border border-white/20 rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-3"
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
