'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  ChevronLeft,
  CreditCard,
  Truck,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['shipping', 'payment', 'review'] as const;
type Step = (typeof STEPS)[number];

const SHIPPING_METHODS = [
  { id: 'standard', price: 0, time: '5-7 business days' },
  { id: 'express', price: 12.99, time: '2-3 business days' },
  { id: 'overnight', price: 24.99, time: 'Next business day' },
];

const ORDER_ITEMS = [
  {
    name: 'AquaPure Insulated Bottle 500ml',
    variant: 'Sky Blue / 500ml',
    price: 24.99,
    quantity: 2,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=100&h=100&fit=crop',
  },
  {
    name: 'HydroZen Countertop Dispenser',
    variant: 'White',
    price: 89.99,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=100&h=100&fit=crop',
  },
];

const defaultFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
};

export default function CheckoutPage() {
  const t = useTranslations();
  const [currentStep, setCurrentStep] = useState<Step>('shipping');
  const [formData, setFormData] = useState(defaultFormData);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const stepIndex = Math.max(0, STEPS.indexOf(currentStep));

  const subtotal = ORDER_ITEMS.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = SHIPPING_METHODS.find((m) => m.id === shippingMethod)?.price ?? 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceedShipping = () => {
    return formData.firstName && formData.lastName && formData.email && formData.address;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">{t('checkout.title')}</h1>

      {/* Step Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-center">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all',
                    i < stepIndex
                      ? 'bg-green-500 text-white'
                      : i === stepIndex
                        ? 'bg-sky-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'hidden text-sm font-medium sm:block',
                    i <= stepIndex ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {t(`checkout.${step}` as any)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-4 h-0.5 w-12 sm:w-20',
                    i < stepIndex ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Form Area */}
        <div className="lg:col-span-2">
          {/* Shipping Step */}
          {currentStep === 'shipping' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                {t('checkout.shippingAddress')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.firstName')}
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.lastName')}
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.email')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.address')}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.city')}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.state')}
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.zipCode')}
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('checkout.country')}
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="JP">Japan</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  {t('checkout.shippingMethod')}
                </h3>
                <div className="space-y-3">
                  {SHIPPING_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all',
                        shippingMethod === method.id
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingMethod === method.id}
                        onChange={() => setShippingMethod(method.id)}
                        className="h-4 w-4 text-sky-500 focus:ring-sky-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900 capitalize">
                            {method.id}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">{method.time}</p>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {method.price === 0 ? t('checkout.free') : `$${method.price.toFixed(2)}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payment Step */}
          {currentStep === 'payment' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                {t('checkout.paymentMethod')}
              </h2>

              <div className="space-y-3">
                {/* Credit Card */}
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all',
                    paymentMethod === 'card'
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="h-4 w-4 text-sky-500 focus:ring-sky-500"
                  />
                  <CreditCard className="h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-900">{t('checkout.creditCard')}</span>
                </label>

                {paymentMethod === 'card' && (
                  <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        {t('checkout.cardNumber')}
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {t('checkout.expiry')}
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {t('checkout.cvc')}
                        </label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="123"
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PayPal */}
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all',
                    paymentMethod === 'paypal'
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'paypal'}
                    onChange={() => setPaymentMethod('paypal')}
                    className="h-4 w-4 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="rounded bg-[#003087] px-3 py-1 text-xs font-bold text-white">
                    PayPal
                  </span>
                  <span className="font-medium text-gray-900">{t('checkout.paypal')}</span>
                </label>
              </div>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                {t('checkout.reviewOrder')}
              </h2>

              {/* Shipping Address Summary */}
              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('checkout.shippingAddress')}
                  </h3>
                  <button
                    onClick={() => setCurrentStep('shipping')}
                    className="text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    {t('common.edit')}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {formData.firstName} {formData.lastName}<br />
                  {formData.address}<br />
                  {formData.city}, {formData.state} {formData.zipCode}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {t('checkout.shippingMethod')}: {shippingMethod}
                </p>
              </div>

              {/* Payment Summary */}
              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{t('checkout.payment')}</h3>
                  <button
                    onClick={() => setCurrentStep('payment')}
                    className="text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    {t('common.edit')}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {paymentMethod === 'card'
                    ? `Card ending in ${cardNumber.slice(-4) || '****'}`
                    : 'PayPal'}
                </p>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('checkout.items')}</h3>
                <div className="space-y-3">
                  {ORDER_ITEMS.map((item, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border border-gray-100 p-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.variant}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 flex justify-between">
            {currentStep !== 'shipping' ? (
              <button
                onClick={() =>
                  setCurrentStep(STEPS[Math.max(0, stepIndex - 1)]! as Step)
                }
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('checkout.back')}
              </button>
            ) : (
              <div />
            )}
            {currentStep !== 'review' ? (
              <button
                onClick={() =>
                  setCurrentStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]! as Step)
                }
                disabled={currentStep === 'shipping' && !canProceedShipping()}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('checkout.continue')}
              </button>
            ) : (
              <button className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600">
                <CheckCircle2 className="h-5 w-5" />
                {t('checkout.placeOrder')}
              </button>
            )}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t('checkout.orderSummary')}</h2>

            <div className="mb-4 space-y-2">
              {ORDER_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.shipping')}</span>
                  <span>{shippingCost === 0 ? t('checkout.free') : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('checkout.tax')}</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-lg font-bold text-gray-900">
                <span>{t('cart.total')}</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-700">
              <Shield className="h-4 w-4" />
              {t('checkout.secureTransaction')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
