import type {
  Appointment,
  DepositOptionType,
  GalleryItem,
  ServiceCategory,
  StudioService,
} from '../types/studio';
import { getOffsetDateISO, getUpcomingTimeFromNow } from '../utils/studioHelpers';

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  cejas: 'Cejas',
  pestanas: 'Pestañas',
  depilacion: 'Depilación',
};

export const CATEGORY_SUBTITLES: Record<ServiceCategory, string> = {
  cejas: 'Diseño, color y fijación a medida',
  pestanas: 'Aplicación punto por punto con acabado limpio',
  depilacion: 'Depi sin drama · Cuidado suave para la piel',
};

export const STUDIO_SERVICES: StudioService[] = [
  {
    id: 'cejas-epilacion',
    category: 'cejas',
    name: 'Epilación y diseño',
    subtitle: 'Cejas a tu medida',
    price: 5,
    durationMinutes: 25,
  },
  {
    id: 'cejas-tinte-henna',
    category: 'cejas',
    name: 'Tinte | Henna',
    subtitle: 'Color que se adapte a tu gusto',
    price: 5,
    durationMinutes: 30,
  },
  {
    id: 'cejas-laminado',
    category: 'cejas',
    name: 'Laminado',
    subtitle: 'Cejas peinadas y perfectas',
    price: 13,
    durationMinutes: 45,
  },
  {
    id: 'pestanas-natural',
    category: 'pestanas',
    name: 'Efecto natural',
    subtitle: 'Punto por punto',
    price: 8,
    durationMinutes: 60,
  },
  {
    id: 'pestanas-ojo-gato',
    category: 'pestanas',
    name: 'Efecto ojo de gato',
    subtitle: 'Punto por punto',
    price: 10,
    durationMinutes: 75,
  },
  {
    id: 'pestanas-volumen',
    category: 'pestanas',
    name: 'Efecto volumen',
    subtitle: 'Punto a punto',
    price: 13,
    durationMinutes: 90,
  },
  {
    id: 'pestanas-retiro',
    category: 'pestanas',
    name: 'Retiro',
    subtitle: 'Punto a punto',
    price: 5,
    durationMinutes: 30,
  },
  {
    id: 'depi-bozo',
    category: 'depilacion',
    name: 'Bozo',
    subtitle: 'Depi sin drama · Zona labial suave',
    price: 2,
    durationMinutes: 15,
  },
  {
    id: 'depi-axila',
    category: 'depilacion',
    name: 'Axila',
    subtitle: 'Depi sin drama · Piel limpia y fresca',
    price: 5,
    durationMinutes: 20,
  },
  {
    id: 'depi-piernas',
    category: 'depilacion',
    name: 'Piernas Completas',
    subtitle: 'Depi sin drama · Acabado sedoso',
    price: 12,
    durationMinutes: 45,
  },
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-cejas-laminado',
    category: 'cejas',
    serviceId: 'cejas-laminado',
    serviceLabel: 'Laminado · $13',
    title: 'Laminado pelo a pelo',
    description:
      'Dirección ascendente limpia, nutrición post-laminado y definición sin rigidez.',
    imageUrl: '/assets/aistudio/IMG_1166_fc7fcfcc.jpeg',
    imageAlt: 'Trabajo real de laminado de cejas en 13 STUDIO',
    techniqueNote: 'Fijación suave con queratina y diseño con pinza de precisión.',
  },
  {
    id: 'gal-pestanas-cat-eye',
    category: 'pestanas',
    serviceId: 'pestanas-ojo-gato',
    serviceLabel: 'Efecto ojo de gato · $10',
    title: 'Ojo de gato & diseño de cejas',
    description:
      'Proyección alargada en el ángulo externo que estiliza la mirada de inmediato.',
    imageUrl: '/assets/aistudio/IMG_1414_0b7a0f28.jpeg',
    imageAlt: 'Trabajo real de pestañas efecto ojo de gato y cejas en 13 STUDIO',
    techniqueNote: 'Curvatura C/D graduada de 8mm a 13mm + tinte en cejas.',
  },
  {
    id: 'gal-cejas-armonia',
    category: 'cejas',
    serviceId: 'cejas-epilacion',
    serviceLabel: 'Epilación y diseño · $5',
    title: 'Diseño anatómico & lifting',
    description:
      'Simetría adaptada al rostro respetando el grosor natural de tus cejas.',
    imageUrl: '/assets/aistudio/IMG_1411_4689ff86.png',
    imageAlt: 'Trabajo real de epilación y diseño de cejas en 13 STUDIO',
    techniqueNote: 'Visagismo personalizado con acabado limpio y peinado.',
  },
  {
    id: 'gal-pestanas-volumen',
    category: 'pestanas',
    serviceId: 'pestanas-volumen',
    serviceLabel: 'Efecto volumen · $13',
    title: 'Volumen ligero punto a punto',
    description:
      'Mayor densidad y marco oscuro en la línea de pestañas sin sensación pesada.',
    imageUrl: '/src/assets/images/gallery_lashes_volume_1794932017641.jpg',
    imageAlt: 'Extensión de pestañas efecto volumen en 13 STUDIO',
    techniqueNote: 'Abanicos ligeros punto a punto adaptados al grosor natural.',
  },
  {
    id: 'gal-depi-piernas',
    category: 'depilacion',
    serviceId: 'depi-piernas',
    serviceLabel: 'Piernas Completas · $12',
    title: 'Piernas completas sin irritación',
    description:
      'Cera tibia de baja temperatura con bálsamo calmante botánico al finalizar.',
    imageUrl: '/src/assets/images/gallery_waxing_legs_1794932018129.jpg',
    imageAlt: 'Resultado de depilación de piernas completas en 13 STUDIO',
    techniqueNote: 'Técnica rápida en camilla higiénica e hidratación calmante.',
  },
  {
    id: 'gal-depi-cuidado',
    category: 'depilacion',
    serviceId: 'depi-axila',
    serviceLabel: 'Bozo $2 · Axila $5',
    title: 'Cuidado delicado en zonas sensibles',
    description:
      'Perlas botánicas elásticas ideales para bozo y axilas sin maltratar la piel.',
    imageUrl: '/src/assets/images/gallery_waxing_care_1794932018450.jpg',
    imageAlt: 'Perlas de cera botánica y sérum calmante de 13 STUDIO',
    techniqueNote: 'Cera hipoalergénica + sérum de aloe vera post-depilación.',
  },
];

export const TIME_SLOTS: string[] = [
  '09:00 AM',
  '10:30 AM',
  '12:00 PM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM',
];

export const STUDIO_POLICIES = [
  {
    id: 'puntualidad',
    title: 'Puntualidad estricta',
    detail: 'Máximo 10 min de espera; pasado ese tiempo se cede el turno.',
  },
  {
    id: 'sin-acompanantes',
    title: 'Sin niños ni acompañantes',
    detail: 'Evita distracciones y reduce el tiempo en camilla.',
  },
  {
    id: 'referencia',
    title: 'Referencia de diseño previa',
    detail: 'Enviar foto o referencia de diseño antes de asistir a la cita.',
  },
];

export const DEPOSIT_OPTIONS: Array<{
  id: DepositOptionType;
  label: string;
  shortNote: string;
}> = [
  {
    id: 'percentage_50',
    label: '50% Anticipo',
    shortNote: 'Mitad del total',
  },
  {
    id: 'percentage_30',
    label: '30% Anticipo',
    shortNote: 'Reserva base',
  },
  {
    id: 'fixed_5',
    label: '$5 Fijo',
    shortNote: 'Abono fijo',
  },
  {
    id: 'full_100',
    label: '100% Total',
    shortNote: 'Liquidado',
  },
  {
    id: 'pay_later',
    label: 'Pendiente',
    shortNote: 'Sin abono aún',
  },
];

export function getInitialSeedAppointments(): Appointment[] {
  const soonSlot = getUpcomingTimeFromNow(45);
  const laterTodaySlot = getUpcomingTimeFromNow(210);
  const tomorrow = getOffsetDateISO(1);
  const dayAfter = getOffsetDateISO(2);

  return [
    {
      id: 'apt-seed-soon',
      clientName: 'Sofía Delgado',
      clientPhone: '584245557710',
      clientInstagram: '@sofiadelgado.b',
      referenceNote: 'Primera vez volumen ligero punto a punto.',
      serviceIds: ['pestanas-volumen'],
      date: soonSlot.dateISO,
      time: soonSlot.timeLabel,
      totalAmount: 13,
      depositOption: 'percentage_50',
      amountPaid: 6.5,
      paymentStatus: 'deposit_paid',
      paymentMethod: 'pago_movil',
      transactionRef: 'REG-13S-402',
      paidAt: new Date().toISOString(),
      status: 'scheduled',
      policiesAccepted: true,
      reminderSent: true,
      notified24h: true,
      notified1h: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'apt-seed-later-today',
      clientName: 'Lucía Paredes',
      clientPhone: '584125559920',
      clientInstagram: '@luciaparedes_',
      referenceNote: 'Tinte henna tono castaño medio.',
      serviceIds: ['cejas-tinte-henna', 'depi-bozo'],
      date: laterTodaySlot.dateISO,
      time: laterTodaySlot.timeLabel,
      totalAmount: 7,
      depositOption: 'pay_later',
      amountPaid: 0,
      paymentStatus: 'pending',
      status: 'scheduled',
      policiesAccepted: true,
      reminderSent: false,
      notified24h: false,
      notified1h: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'apt-seed-1',
      clientName: 'Camila Mendoza',
      clientPhone: '584125550192',
      clientInstagram: '@cami.mendoza',
      referenceNote: 'Ojo de gato suave 9-12mm + cejas limpias sin quitar grosor.',
      serviceIds: ['pestanas-ojo-gato', 'cejas-epilacion'],
      date: tomorrow,
      time: '10:30 AM',
      totalAmount: 15,
      depositOption: 'percentage_50',
      amountPaid: 7.5,
      paymentStatus: 'deposit_paid',
      paymentMethod: 'pago_movil',
      transactionRef: 'PM-491820',
      paidAt: new Date().toISOString(),
      status: 'scheduled',
      policiesAccepted: true,
      reminderSent: false,
      notified24h: false,
      notified1h: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'apt-seed-2',
      clientName: 'Valeria Rojas',
      clientPhone: '584145558321',
      clientInstagram: '@valeriarojas_',
      referenceNote: 'Laminado natural bien peinado hacia arriba.',
      serviceIds: ['cejas-laminado', 'depi-bozo'],
      date: tomorrow,
      time: '03:30 PM',
      totalAmount: 15,
      depositOption: 'full_100',
      amountPaid: 15,
      paymentStatus: 'paid_full',
      paymentMethod: 'card',
      transactionRef: 'TX-13S-9021',
      paidAt: new Date().toISOString(),
      status: 'scheduled',
      policiesAccepted: true,
      reminderSent: false,
      notified24h: false,
      notified1h: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'apt-seed-4',
      clientName: 'Andrea Navarro',
      clientPhone: '584125553309',
      clientInstagram: '@andrea.nv',
      referenceNote: 'Piernas completas + axila.',
      serviceIds: ['depi-piernas', 'depi-axila'],
      date: dayAfter,
      time: '12:00 PM',
      totalAmount: 17,
      depositOption: 'fixed_5',
      amountPaid: 5,
      paymentStatus: 'deposit_paid',
      paymentMethod: 'zelle',
      transactionRef: 'ZL-77412',
      paidAt: new Date().toISOString(),
      status: 'scheduled',
      policiesAccepted: true,
      reminderSent: false,
      notified24h: false,
      notified1h: false,
      createdAt: new Date().toISOString(),
    },
  ];
}
