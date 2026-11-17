import { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import type { PaymentCheckoutContext, PaymentMethod } from '../types/studio';
import { formatCurrency, formatReadableDate } from '../utils/studioHelpers';
import { FourPointStar } from './StarMotif';

interface PaymentGatewayModalProps {
  context: PaymentCheckoutContext | null;
  onClose: () => void;
  onPaymentSuccess: (result: {
    method: PaymentMethod;
    transactionRef: string;
    paidAt: string;
  }) => void;
}

export function PaymentGatewayModal({
  context,
  onClose,
  onPaymentSuccess,
}: PaymentGatewayModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [pmBank, setPmBank] = useState('Banesco');
  const [pmPhone, setPmPhone] = useState('');
  const [pmReference, setPmReference] = useState('');

  const [zelleEmail, setZelleEmail] = useState('');
  const [zelleCode, setZelleCode] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTx, setCompletedTx] = useState<{
    ref: string;
    method: PaymentMethod;
    amount: number;
  } | null>(null);

  if (!context) return null;

  const remainingAfterPayment = Math.max(
    0,
    Math.round(
      (context.totalAmount -
        (context.mode === 'settle_existing'
          ? context.totalAmount
          : context.amountToPayNow)) *
        100
    ) / 100
  );

  const fillTestCredentials = () => {
    setErrorMsg(null);
    if (method === 'card') {
      setCardHolder(context.clientName || 'María González');
      setCardNumber('4532 8910 3341 1313');
      setCardExpiry('09/29');
      setCardCvv('313');
    } else if (method === 'pago_movil') {
      setPmBank('Mercantil');
      setPmPhone('0412-5551313');
      setPmReference('849213');
    } else {
      setZelleEmail('clienta@correo.com');
      setZelleCode('ZL-13STUDIO');
    }
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (method === 'card') {
      const cleanDigits = cardNumber.replace(/\s+/g, '');
      if (!cardHolder.trim()) {
        setErrorMsg('Ingresa el nombre del titular de la tarjeta.');
        return;
      }
      if (cleanDigits.length < 12) {
        setErrorMsg('Ingresa un número de tarjeta válido (mín. 12 dígitos).');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) {
        setErrorMsg('Ingresa el vencimiento en formato MM/AA.');
        return;
      }
      if (cardCvv.trim().length < 3) {
        setErrorMsg('Ingresa el código CVV (3 o 4 dígitos).');
        return;
      }
    } else if (method === 'pago_movil') {
      if (!pmPhone.trim() || pmReference.trim().length < 4) {
        setErrorMsg(
          'Ingresa tu teléfono emisor y los últimos dígitos de referencia.'
        );
        return;
      }
    } else {
      if (!zelleEmail.trim() || !zelleCode.trim()) {
        setErrorMsg('Ingresa el correo remitente y el código de confirmación.');
        return;
      }
    }

    setIsProcessing(true);

    setTimeout(() => {
      const prefix =
        method === 'card' ? 'TX-13S' : method === 'pago_movil' ? 'PM-13S' : 'ZL-13S';
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const transactionRef = `${prefix}-${randomNum}`;
      const paidAt = new Date().toISOString();

      setIsProcessing(false);
      setCompletedTx({
        ref: transactionRef,
        method,
        amount: context.amountToPayNow,
      });

      onPaymentSuccess({
        method,
        transactionRef,
        paidAt,
      });
    }, 900);
  };

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const grouped = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(grouped);
  };

  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gateway-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[#0B1536]/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-[#FAF8F2] text-[#0B1536] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/25 overflow-hidden sm:my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#0D3FE8] text-white px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FourPointStar className="w-4 h-4 text-white shrink-0" />
            <div>
              <p className="text-xs font-medium text-white/80">
                Pasarela de Pago Simulada · 13 STUDIO
              </p>
              <h2
                id="gateway-title"
                className="font-display text-2xl font-bold uppercase tracking-wide"
              >
                {completedTx ? 'Pago Confirmado' : 'Confirmar Depósito'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar pasarela de pago"
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedTx ? (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/12 text-emerald-700 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-display text-3xl uppercase text-[#0B1536]">
                ¡Turno asegurado!
              </h3>
              <p className="mt-1 text-sm text-[#0B1536]/75">
                El estado de la cita de{' '}
                <strong className="text-[#0B1536]">{context.clientName}</strong>{' '}
                se actualizó a{' '}
                <strong className="text-[#0D3FE8]">
                  {context.resultingPaymentStatus === 'paid_full'
                    ? 'Pagado Total'
                    : 'Depósito Pagado'}
                </strong>
                .
              </p>
            </div>

            <div className="rounded-2xl bg-[#F2EEE4] p-4 space-y-2.5 text-sm border border-[#0B1536]/10">
              <div className="flex justify-between gap-2">
                <span className="text-[#0B1536]/65">Referencia</span>
                <span className="font-mono-num font-semibold text-[#0B1536]">
                  {completedTx.ref}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#0B1536]/65">Fecha y hora</span>
                <span className="font-semibold text-[#0B1536] tabular-nums">
                  {formatReadableDate(context.date)} · {context.time}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#0B1536]/65">Monto pagado ahora</span>
                <span className="font-mono-num font-bold text-emerald-700">
                  {formatCurrency(completedTx.amount)}
                </span>
              </div>
              <div className="flex justify-between gap-2 pt-2 border-t border-[#0B1536]/10">
                <span className="text-[#0B1536]/65">Saldo pendiente en estudio</span>
                <span className="font-mono-num font-bold text-[#0B1536]">
                  {formatCurrency(remainingAfterPayment)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-2xl bg-[#0D3FE8] hover:bg-[#082BB3] text-white font-bold text-sm tracking-wide cursor-pointer transition-colors"
            >
              Ver cita en Agenda 13 STUDIO
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmPayment} className="p-6 sm:p-7 space-y-5">
            {/* Summary Strip */}
            <div className="rounded-2xl bg-[#F2EEE4] p-4 border border-[#0B1536]/10 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0D3FE8]">
                    {context.clientName} · {formatReadableDate(context.date)} ·{' '}
                    {context.time}
                  </p>
                  <p className="text-sm font-semibold text-[#0B1536] mt-0.5 truncate">
                    {context.serviceNames.join(' + ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[11px] text-[#0B1536]/60">
                    {context.depositLabel}
                  </span>
                  <span className="font-display text-3xl font-bold text-[#DF1B2D] tabular-nums leading-none">
                    {formatCurrency(context.amountToPayNow)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[#0B1536]/70 pt-2 border-t border-[#0B1536]/10">
                <span>Total servicios: {formatCurrency(context.totalAmount)}</span>
                <span className="tabular-nums">
                  Resta en estudio: {formatCurrency(remainingAfterPayment)}
                </span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#0B1536]/75">
                  Método de pago
                </span>
                <button
                  type="button"
                  onClick={fillTestCredentials}
                  className="text-xs font-semibold text-[#0D3FE8] hover:underline cursor-pointer"
                >
                  Usar datos de prueba
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('card');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    method === 'card'
                      ? 'bg-[#0B1536] text-white border-[#0B1536]'
                      : 'bg-white text-[#0B1536] border-[#0B1536]/15 hover:border-[#0D3FE8]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>Tarjeta</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('pago_movil');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    method === 'pago_movil'
                      ? 'bg-[#0B1536] text-white border-[#0B1536]'
                      : 'bg-white text-[#0B1536] border-[#0B1536]/15 hover:border-[#0D3FE8]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Pago Móvil</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('zelle');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    method === 'zelle'
                      ? 'bg-[#0B1536] text-white border-[#0B1536]'
                      : 'bg-white text-[#0B1536] border-[#0B1536]/15 hover:border-[#0D3FE8]'
                  }`}
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span>Zelle</span>
                </button>
              </div>
            </div>

            {/* Method Specific Fields */}
            {method === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                    Titular de la tarjeta
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Nombre como aparece en la tarjeta"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm focus:outline-none focus:border-[#0D3FE8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                    Número de tarjeta
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    placeholder="4532 8910 3341 1313"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm font-mono-num focus:outline-none focus:border-[#0D3FE8]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                      Vencimiento
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardExpiry}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      placeholder="MM/AA"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm font-mono-num focus:outline-none focus:border-[#0D3FE8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) =>
                        setCardCvv(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="313"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm font-mono-num focus:outline-none focus:border-[#0D3FE8]"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === 'pago_movil' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-white p-3 border border-[#0B1536]/10 text-xs text-[#0B1536]/80">
                  Datos del estudio: <strong>Banesco (0134)</strong> · Tel:{' '}
                  <strong className="font-mono-num">0412-1313013</strong> · ID:{' '}
                  <strong className="font-mono-num">V-26130130</strong>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                      Banco emisor
                    </label>
                    <select
                      value={pmBank}
                      onChange={(e) => setPmBank(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-[#0B1536]/15 text-sm focus:outline-none focus:border-[#0D3FE8]"
                    >
                      <option value="Banesco">Banesco</option>
                      <option value="Mercantil">Mercantil</option>
                      <option value="Provincial">BBVA Provincial</option>
                      <option value="BDV">Banco de Venezuela</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                      Teléfono emisor
                    </label>
                    <input
                      type="tel"
                      value={pmPhone}
                      onChange={(e) => setPmPhone(e.target.value)}
                      placeholder="0412-5551313"
                      className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-[#0B1536]/15 text-sm font-mono-num focus:outline-none focus:border-[#0D3FE8]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                    Número de referencia
                  </label>
                  <input
                    type="text"
                    value={pmReference}
                    onChange={(e) => setPmReference(e.target.value)}
                    placeholder="Ej. 849213"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm font-mono-num focus:outline-none focus:border-[#0D3FE8]"
                  />
                </div>
              </div>
            )}

            {method === 'zelle' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-white p-3 border border-[#0B1536]/10 text-xs text-[#0B1536]/80">
                  Zelle oficial: <strong>pagos@13studio.beauty</strong> (A nombre
                  de 13 STUDIO).
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                    Correo remitente
                  </label>
                  <input
                    type="email"
                    value={zelleEmail}
                    onChange={(e) => setZelleEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm focus:outline-none focus:border-[#0D3FE8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1536]/75 mb-1">
                    Código de confirmación
                  </label>
                  <input
                    type="text"
                    value={zelleCode}
                    onChange={(e) => setZelleCode(e.target.value)}
                    placeholder="Ej. ZL-13STUDIO"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#0B1536]/15 text-sm font-mono-num focus:outline-none focus:border-[#0D3FE8]"
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <p
                role="alert"
                className="text-xs font-semibold text-[#DF1B2D] bg-[#DF1B2D]/10 px-3.5 py-2.5 rounded-xl"
              >
                {errorMsg}
              </p>
            )}

            <div className="pt-1 space-y-2.5">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full min-h-[48px] rounded-2xl bg-[#DF1B2D] hover:bg-[#C01424] disabled:opacity-60 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Lock className="w-4 h-4" aria-hidden="true" />
                {isProcessing
                  ? 'Procesando pago simulado...'
                  : `Pagar ${formatCurrency(context.amountToPayNow)} y Confirmar`}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#0B1536]/60">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D3FE8]" />
                <span>
                  Entorno de pasarela simulada para pruebas de 13 STUDIO.
                </span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
