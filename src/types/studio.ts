export type ServiceCategory = 'cejas' | 'pestanas' | 'depilacion';

export interface StudioService {
  id: string;
  category: ServiceCategory;
  name: string;
  subtitle: string;
  price: number;
  durationMinutes: number;
}

export interface GalleryItem {
  id: string;
  category: ServiceCategory;
  serviceId: string;
  serviceLabel: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  techniqueNote: string;
}

export type DepositOptionType =
  | 'percentage_30'
  | 'percentage_50'
  | 'fixed_5'
  | 'full_100'
  | 'pay_later';

export type PaymentCollectionMode = 'direct_record' | 'gateway';

export type PaymentStatus = 'pending' | 'deposit_paid' | 'paid_full';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type PaymentMethod = 'card' | 'pago_movil' | 'zelle' | 'cash';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientInstagram: string;
  referenceNote: string;
  serviceIds: string[];
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:30 AM"
  totalAmount: number;
  depositOption: DepositOptionType;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionRef?: string;
  paidAt?: string;
  status: AppointmentStatus;
  policiesAccepted: boolean;
  reminderSent: boolean;
  notified24h: boolean;
  notified1h: boolean;
  createdAt: string;
}

export interface PaymentCheckoutContext {
  mode: 'new_booking' | 'settle_existing';
  appointmentDraft?: Omit<Appointment, 'id' | 'createdAt'>;
  existingAppointmentId?: string;
  clientName: string;
  date: string;
  time: string;
  serviceNames: string[];
  totalAmount: number;
  amountToPayNow: number;
  resultingPaymentStatus: PaymentStatus;
  depositLabel: string;
}
