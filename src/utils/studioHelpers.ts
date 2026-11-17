import type {
  Appointment,
  DepositOptionType,
  PaymentStatus,
  StudioService,
} from '../types/studio';

export function getOffsetDateISO(offsetDays: number): string {
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offsetDays
  );
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeFromDate(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`;
}

export function getUpcomingTimeFromNow(offsetMinutes: number): {
  dateISO: string;
  timeLabel: string;
} {
  const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
  // Round minutes to nearest 5 for clean display
  const mins = Math.round(target.getMinutes() / 5) * 5;
  target.setMinutes(mins, 0, 0);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return {
    dateISO: `${year}-${month}-${day}`,
    timeLabel: formatTimeFromDate(target),
  };
}

export function parseAppointmentDateTime(
  dateISO: string,
  timeStr: string
): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
  let hours = match ? parseInt(match[1], 10) : 10;
  const minutes = match ? parseInt(match[2], 10) : 0;
  const meridiem = match ? match[3].toUpperCase() : 'AM';

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return new Date(year || 2026, (month || 1) - 1, day || 1, hours, minutes, 0, 0);
}

export function getMinutesUntilAppointment(
  appointment: Appointment,
  nowMs: number = Date.now()
): number {
  const target = parseAppointmentDateTime(appointment.date, appointment.time);
  return Math.round((target.getTime() - nowMs) / 60000);
}

export function formatCountdownLabel(minutesUntil: number): string {
  if (minutesUntil <= 0 && minutesUntil >= -30) {
    return 'En curso ahora';
  }
  if (minutesUntil < 60) {
    return `En ${minutesUntil} min`;
  }
  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  if (hours < 24) {
    return mins > 0 ? `En ${hours}h ${mins}m` : `En ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `En ${days}d ${remHours}h` : `En ${days} día(s)`;
}

export function getUpcomingDays(count = 14): Array<{
  iso: string;
  weekdayShort: string;
  dayNumber: string;
  monthShort: string;
  relativeTag: string | null;
}> {
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];

  const days = [];
  for (let i = 0; i < count; i++) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = getOffsetDateISO(i);
    days.push({
      iso,
      weekdayShort: weekdays[d.getDay()],
      dayNumber: String(d.getDate()).padStart(2, '0'),
      monthShort: months[d.getMonth()],
      relativeTag: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : null,
    });
  }
  return days;
}

export function formatReadableDate(iso: string): string {
  const today = getOffsetDateISO(0);
  const tomorrow = getOffsetDateISO(1);
  const [y, m, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);

  const formatted = dateObj.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  if (iso === today) return `Hoy · ${formatted}`;
  if (iso === tomorrow) return `Mañana · ${formatted}`;
  return formatted;
}

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

export function calculateDepositDetails(
  totalAmount: number,
  option: DepositOptionType
): {
  depositAmount: number;
  remainingAmount: number;
  resultingStatus: PaymentStatus;
  label: string;
} {
  if (totalAmount <= 0) {
    return {
      depositAmount: 0,
      remainingAmount: 0,
      resultingStatus: 'pending',
      label: 'Sin servicios',
    };
  }

  let depositAmount = 0;
  let label = '';

  switch (option) {
    case 'percentage_30':
      depositAmount = Math.round(totalAmount * 0.3 * 100) / 100;
      label = '30% de anticipo';
      break;
    case 'percentage_50':
      depositAmount = Math.round(totalAmount * 0.5 * 100) / 100;
      label = '50% de anticipo';
      break;
    case 'fixed_5':
      depositAmount = Math.min(totalAmount, 5);
      label = totalAmount <= 5 ? 'Monto fijo ($5)' : 'Depósito fijo $5';
      break;
    case 'full_100':
      depositAmount = totalAmount;
      label = 'Pago completo (100%)';
      break;
    case 'pay_later':
    default:
      depositAmount = 0;
      label = 'Pendiente de pago';
      break;
  }

  const remainingAmount = Math.max(
    0,
    Math.round((totalAmount - depositAmount) * 100) / 100
  );
  const resultingStatus: PaymentStatus =
    depositAmount <= 0
      ? 'pending'
      : remainingAmount <= 0
        ? 'paid_full'
        : 'deposit_paid';

  return {
    depositAmount,
    remainingAmount,
    resultingStatus,
    label,
  };
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'paid_full':
      return 'Pagado Total';
    case 'deposit_paid':
      return 'Depósito Pagado';
    case 'pending':
    default:
      return 'Pendiente de Pago';
  }
}

export function buildReminderMessage(
  appointment: Appointment,
  services: StudioService[]
): string {
  const chosen = services
    .filter((s) => appointment.serviceIds.includes(s.id))
    .map((s) => `${s.name} (${formatCurrency(s.price)})`)
    .join(', ');

  const remaining = Math.max(
    0,
    Math.round((appointment.totalAmount - appointment.amountPaid) * 100) / 100
  );

  const paymentLine =
    remaining === 0
      ? `Estado de pago: Pagado total (${formatCurrency(appointment.totalAmount)})`
      : appointment.amountPaid > 0
        ? `Depósito abonado: ${formatCurrency(appointment.amountPaid)} · Saldo en estudio: ${formatCurrency(remaining)}`
        : `Total a abonar en estudio: ${formatCurrency(appointment.totalAmount)}`;

  return [
    `Hola ${appointment.clientName} ✨ Recordatorio de tu cita en 13 STUDIO:`,
    `📅 Fecha: ${formatReadableDate(appointment.date)}`,
    `⏰ Hora: ${appointment.time}`,
    `💅 Servicio(s): ${chosen}`,
    `💳 ${paymentLine}`,
    ``,
    `Normas para tu turno:`,
    `• Máx. 10 min de tolerancia (o se cede el turno).`,
    `• Asistir sin niños ni acompañantes.`,
    `• Envíanos tu foto de referencia antes de venir.`,
    ``,
    `13 STUDIO — Tu mirada, tus reglas.`,
  ].join('\n');
}

export function playSubtleChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(659.25, now, 0.22); // E5
    playTone(880, now + 0.14, 0.32); // A5
  } catch {
    // ignore audio restrictions
  }
}

export function downloadAppointmentICS(
  appointment: Appointment,
  services: StudioService[]
): void {
  const start = parseAppointmentDateTime(appointment.date, appointment.time);
  const chosenServices = services.filter((s) =>
    appointment.serviceIds.includes(s.id)
  );
  const totalMinutes =
    chosenServices.reduce((acc, s) => acc + s.durationMinutes, 0) || 45;
  const end = new Date(start.getTime() + totalMinutes * 60 * 1000);

  const fmtICS = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate()
    ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(
      d.getMinutes()
    ).padStart(2, '0')}00`;

  const serviceSummary = chosenServices.map((s) => s.name).join(' + ');
  const description = `Clienta: ${appointment.clientName} (${appointment.clientInstagram}) | Tel: ${appointment.clientPhone} | Servicios: ${serviceSummary} | Pagado: ${formatCurrency(appointment.amountPaid)} de ${formatCurrency(appointment.totalAmount)}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//13 STUDIO//Agenda Lashista//ES',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@13studio.app`,
    `DTSTAMP:${fmtICS(new Date())}`,
    `DTSTART:${fmtICS(start)}`,
    `DTEND:${fmtICS(end)}`,
    `SUMMARY:13 STUDIO · ${appointment.clientName} (${serviceSummary})`,
    `DESCRIPTION:${description.replace(/\n/g, ' ')}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Recordatorio 24h: Cita mañana ${appointment.time} con ${appointment.clientName} - ${serviceSummary}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Recordatorio 1h: Viene ${appointment.clientName} a las ${appointment.time} (${serviceSummary})`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `13-studio-${appointment.date}-${appointment.clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
