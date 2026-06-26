'use client';

import { useState, useCallback } from 'react';
import {
  Save,
  Send,
  Plus,
  Trash2,
  Edit,
  Globe,
  Truck,
  CreditCard,
  Mail,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

type SettingsTab = 'general' | 'shipping' | 'payments' | 'email';

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  baseRate: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  lastEdited: Date;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const initialShippingZones: ShippingZone[] = [
  { id: 'sz-1', name: 'North America', countries: ['United States', 'Canada', 'Mexico'], baseRate: 5.99 },
  { id: 'sz-2', name: 'Europe', countries: ['United Kingdom', 'Germany', 'France', 'Spain', 'Italy'], baseRate: 12.99 },
  { id: 'sz-3', name: 'Asia Pacific', countries: ['Japan', 'South Korea', 'Australia', 'New Zealand'], baseRate: 18.99 },
];

const emailTemplates: EmailTemplate[] = [
  { id: 'et-1', name: 'Order Confirmation', subject: 'Your WaterMart Order #{{order_number}} is Confirmed!', lastEdited: new Date('2025-06-20') },
  { id: 'et-2', name: 'Shipping Update', subject: 'Your Order #{{order_number}} Has Shipped!', lastEdited: new Date('2025-06-18') },
  { id: 'et-3', name: 'Password Reset', subject: 'Reset Your WaterMart Password', lastEdited: new Date('2025-06-15') },
  { id: 'et-4', name: 'Welcome Email', subject: 'Welcome to WaterMart, {{first_name}}!', lastEdited: new Date('2025-06-10') },
];

const currencies = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
];

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (UTC-5)' },
  { value: 'America/Chicago', label: 'Central Time (UTC-6)' },
  { value: 'America/Denver', label: 'Mountain Time (UTC-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' },
];

// ── Shared Components ──────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-400 mt-0.5">{description}</p>
    </div>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-3 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
    />
  );
}

function SelectInput({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
        enabled ? 'bg-blue-600' : 'bg-slate-700'
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function SaveBar({ onSave, isSaving }: { onSave: () => void; isSaving?: boolean }) {
  return (
    <div className="flex justify-end pt-4 border-t border-slate-800 mt-8">
      <button
        onClick={onSave}
        disabled={isSaving}
        className="inline-flex items-center gap-2 h-10 px-6 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}

// ── General Tab ────────────────────────────────────────────────────────────────

function GeneralTab() {
  const [storeName, setStoreName] = useState('WaterMart');
  const [description, setDescription] = useState(
    'Premium water filtration and purification products for home and outdoor use. We help you drink cleaner, healthier water.'
  );
  const [supportEmail, setSupportEmail] = useState('support@watermart.com');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/New_York');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('General settings saved', { description: 'Store configuration has been updated' });
    }, 600);
  }, []);

  return (
    <div>
      <SectionHeader
        title="General Settings"
        description="Configure your store's basic information, currency, language, and timezone."
      />

      <div className="space-y-5 max-w-2xl">
        <FormField label="Store Name" htmlFor="storeName">
          <TextInput id="storeName" value={storeName} onChange={setStoreName} placeholder="My Water Store" />
        </FormField>

        <FormField label="Store Description" htmlFor="description">
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
          />
        </FormField>

        <FormField label="Support Email" htmlFor="supportEmail">
          <TextInput id="supportEmail" value={supportEmail} onChange={setSupportEmail} type="email" placeholder="support@example.com" />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Default Currency" htmlFor="currency">
            <SelectInput id="currency" value={currency} onChange={setCurrency} options={currencies} />
          </FormField>
          <FormField label="Default Language" htmlFor="language">
            <SelectInput id="language" value={language} onChange={setLanguage} options={languages} />
          </FormField>
          <FormField label="Timezone" htmlFor="timezone">
            <SelectInput id="timezone" value={timezone} onChange={setTimezone} options={timezones} />
          </FormField>
        </div>
      </div>

      <SaveBar onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}

// ── Shipping Tab ───────────────────────────────────────────────────────────────

function ShippingTab() {
  const [freeShipping, setFreeShipping] = useState(true);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [dimensionUnit, setDimensionUnit] = useState('cm');
  const [zones, setZones] = useState<ShippingZone[]>(initialShippingZones);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCountries, setNewCountries] = useState('');
  const [newRate, setNewRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddZone = useCallback(() => {
    if (!newName.trim() || !newCountries.trim() || !newRate) {
      toast.error('Please fill all fields');
      return;
    }
    const zone: ShippingZone = {
      id: `sz-${Date.now()}`,
      name: newName.trim(),
      countries: newCountries.split(',').map((c) => c.trim()).filter(Boolean),
      baseRate: parseFloat(newRate),
    };
    setZones((prev) => [...prev, zone]);
    setNewName('');
    setNewCountries('');
    setNewRate('');
    setShowForm(false);
    toast.success('Shipping zone added');
  }, [newName, newCountries, newRate]);

  const handleDeleteZone = useCallback((zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    toast.success('Shipping zone removed');
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Shipping settings saved', { description: 'Shipping configuration updated' });
    }, 600);
  }, []);

  return (
    <div>
      <SectionHeader
        title="Shipping Settings"
        description="Configure shipping zones, rates, units, and free shipping options."
      />

      <div className="space-y-4 max-w-2xl">
        {/* Free Shipping Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700/50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-white">Enable Free Shipping</p>
            <p className="text-xs text-slate-400 mt-0.5">Offer free shipping on qualifying orders</p>
          </div>
          <ToggleSwitch enabled={freeShipping} onChange={setFreeShipping} />
        </div>

        {/* Weight & Dimension Units */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Default Weight Unit" htmlFor="weightUnit">
            <SelectInput
              id="weightUnit"
              value={weightUnit}
              onChange={setWeightUnit}
              options={[
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'lb', label: 'Pounds (lb)' },
              ]}
            />
          </FormField>
          <FormField label="Default Dimension Unit" htmlFor="dimensionUnit">
            <SelectInput
              id="dimensionUnit"
              value={dimensionUnit}
              onChange={setDimensionUnit}
              options={[
                { value: 'cm', label: 'Centimeters (cm)' },
                { value: 'inch', label: 'Inches (in)' },
              ]}
            />
          </FormField>
        </div>
      </div>

      {/* Shipping Zones Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-white">Shipping Zones</h4>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Zone
          </button>
        </div>

        {/* Add Zone Form */}
        {showForm && (
          <div className="mb-4 p-4 bg-slate-800/40 border border-slate-700 rounded-lg animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="Zone Name" htmlFor="zoneName">
                <TextInput id="zoneName" value={newName} onChange={setNewName} placeholder="e.g. Southeast Asia" />
              </FormField>
              <FormField label="Countries (comma-separated)" htmlFor="zoneCountries">
                <TextInput id="zoneCountries" value={newCountries} onChange={setNewCountries} placeholder="Japan, South Korea, China" />
              </FormField>
              <FormField label="Base Rate ($)" htmlFor="zoneRate">
                <TextInput id="zoneRate" value={newRate} onChange={setNewRate} placeholder="9.99" type="number" />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 border border-slate-700 rounded-lg hover:text-white hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddZone}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Zone
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Zone Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Countries</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Base Rate</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-white">{zone.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {zone.countries.map((c) => (
                          <span key={c} className="px-2 py-0.5 text-xs bg-slate-800 text-slate-300 rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-medium text-white">${zone.baseRate.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toast.info(`Editing ${zone.name}`)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {zones.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No shipping zones configured</p>
            </div>
          )}
        </div>
      </div>

      <SaveBar onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}

// ── Payments Tab ───────────────────────────────────────────────────────────────

function PaymentsTab() {
  // Stripe state
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripePublicKey, setStripePublicKey] = useState('pk_test_xxxxxxxxxxxxxxxxxxxx');
  const [stripeSecretKey, setStripeSecretKey] = useState('sk_test_xxxxxxxxxxxxxxxxxxxx');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('whsec_xxxxxxxxxxxxxxxxxxxx');
  const [stripeTestMode, setStripeTestMode] = useState(false);
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showStripeWebhook, setShowStripeWebhook] = useState(false);

  // PayPal state
  const [paypalEnabled, setPaypalEnabled] = useState(true);
  const [paypalClientId, setPaypalClientId] = useState('AX8f3MpQr2VwYzAbCdEfGhIjKlMnOp');
  const [paypalClientSecret, setPaypalClientSecret] = useState('EL9Nx2Ws7RtYzAbCdEfGhIjKlMnOpQr');
  const [paypalSandbox, setPaypalSandbox] = useState(false);
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Payment settings saved', { description: 'Payment gateway configuration updated' });
    }, 600);
  }, []);

  const inputClass =
    'w-full h-10 px-3 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';

  return (
    <div>
      <SectionHeader
        title="Payment Settings"
        description="Configure credit card processing via Stripe and PayPal payments."
      />

      {/* Stripe Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h4 className="text-base font-semibold text-white">Stripe</h4>
            <p className="text-xs text-slate-400 mt-0.5">Accept credit and debit card payments</p>
          </div>
          <ToggleSwitch enabled={stripeEnabled} onChange={setStripeEnabled} />
        </div>

        {stripeEnabled && (
          <div className="space-y-4 max-w-2xl p-5 bg-slate-800/20 border border-slate-800 rounded-xl">
            <FormField label="Public Key" htmlFor="stripePublicKey">
              <TextInput id="stripePublicKey" value={stripePublicKey} onChange={setStripePublicKey} placeholder="pk_live_..." />
            </FormField>

            <FormField label="Secret Key" htmlFor="stripeSecretKey">
              <div className="relative">
                <input
                  id="stripeSecretKey"
                  type={showStripeSecret ? 'text' : 'password'}
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder="sk_live_..."
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowStripeSecret(!showStripeSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showStripeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <FormField label="Webhook Secret" htmlFor="stripeWebhookSecret">
              <div className="relative">
                <input
                  id="stripeWebhookSecret"
                  type={showStripeWebhook ? 'text' : 'password'}
                  value={stripeWebhookSecret}
                  onChange={(e) => setStripeWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowStripeWebhook(!showStripeWebhook)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showStripeWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium text-white">Test Mode</p>
                <p className="text-xs text-slate-400">Use Stripe test environment for development</p>
              </div>
              <ToggleSwitch enabled={stripeTestMode} onChange={setStripeTestMode} />
            </div>
          </div>
        )}
      </div>

      {/* PayPal Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h4 className="text-base font-semibold text-white">PayPal</h4>
            <p className="text-xs text-slate-400 mt-0.5">Accept PayPal and Venmo payments</p>
          </div>
          <ToggleSwitch enabled={paypalEnabled} onChange={setPaypalEnabled} />
        </div>

        {paypalEnabled && (
          <div className="space-y-4 max-w-2xl p-5 bg-slate-800/20 border border-slate-800 rounded-xl">
            <FormField label="Client ID" htmlFor="paypalClientId">
              <TextInput id="paypalClientId" value={paypalClientId} onChange={setPaypalClientId} placeholder="AX..." />
            </FormField>

            <FormField label="Client Secret" htmlFor="paypalClientSecret">
              <div className="relative">
                <input
                  id="paypalClientSecret"
                  type={showPaypalSecret ? 'text' : 'password'}
                  value={paypalClientSecret}
                  onChange={(e) => setPaypalClientSecret(e.target.value)}
                  placeholder="EL..."
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPaypalSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium text-white">Sandbox Mode</p>
                <p className="text-xs text-slate-400">Use PayPal sandbox environment for testing</p>
              </div>
              <ToggleSwitch enabled={paypalSandbox} onChange={setPaypalSandbox} />
            </div>
          </div>
        )}
      </div>

      <SaveBar onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}

// ── Email Tab ──────────────────────────────────────────────────────────────────

function EmailTab() {
  const [smtpHost, setSmtpHost] = useState('smtp.resend.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('watermart@resend.dev');
  const [smtpPassword, setSmtpPassword] = useState('re_8x3fMpQr2VwYzAbCdEfGhIjKlMn');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [fromName, setFromName] = useState('WaterMart');
  const [fromEmail, setFromEmail] = useState('noreply@watermart.com');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSendTest = useCallback(() => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    setSendingTest(true);
    setTimeout(() => {
      setSendingTest(false);
      toast.success('Test email sent', { description: `Message delivered to ${testEmail}` });
    }, 1500);
  }, [testEmail]);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Email settings saved', { description: 'SMTP configuration updated' });
    }, 600);
  }, []);

  const inputClass =
    'w-full h-10 px-3 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';

  return (
    <div>
      <SectionHeader
        title="Email Settings"
        description="Configure SMTP server settings and manage transactional email templates."
      />

      {/* SMTP Configuration */}
      <h4 className="text-base font-semibold text-white mb-4">SMTP Configuration</h4>
      <div className="space-y-4 max-w-2xl p-5 bg-slate-800/20 border border-slate-800 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="SMTP Host" htmlFor="smtpHost">
            <TextInput id="smtpHost" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.example.com" />
          </FormField>
          <FormField label="SMTP Port" htmlFor="smtpPort">
            <TextInput id="smtpPort" value={smtpPort} onChange={setSmtpPort} placeholder="587" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="SMTP Username" htmlFor="smtpUsername">
            <TextInput id="smtpUsername" value={smtpUsername} onChange={setSmtpUsername} placeholder="user@example.com" />
          </FormField>
          <FormField label="SMTP Password" htmlFor="smtpPassword">
            <div className="relative">
              <input
                id="smtpPassword"
                type={showSmtpPassword ? 'text' : 'password'}
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="Enter SMTP password"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="From Name" htmlFor="fromName">
            <TextInput id="fromName" value={fromName} onChange={setFromName} placeholder="My Store" />
          </FormField>
          <FormField label="From Email" htmlFor="fromEmail">
            <TextInput id="fromEmail" value={fromEmail} onChange={setFromEmail} type="email" placeholder="noreply@example.com" />
          </FormField>
        </div>
      </div>

      {/* Send Test Email */}
      <div className="mt-6 max-w-2xl">
        <h4 className="text-base font-semibold text-white mb-3">Send Test Email</h4>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FormField label="Recipient Email" htmlFor="testEmail">
              <TextInput
                id="testEmail"
                value={testEmail}
                onChange={setTestEmail}
                type="email"
                placeholder="test@example.com"
              />
            </FormField>
          </div>
          <button
            onClick={handleSendTest}
            disabled={sendingTest}
            className={clsx(
              'inline-flex items-center gap-2 h-10 px-5 text-sm font-medium text-white rounded-lg transition-colors flex-shrink-0',
              sendingTest ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {sendingTest ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test
              </>
            )}
          </button>
        </div>
      </div>

      {/* Email Templates */}
      <div className="mt-8">
        <h4 className="text-base font-semibold text-white mb-4">Email Templates</h4>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Template Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">
                    Subject
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                    Last Edited
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {emailTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-white">{template.name}</p>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="text-sm text-slate-400 truncate max-w-md">{template.subject}</p>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <p className="text-sm text-slate-400">
                        {template.lastEdited.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => toast.info(`Editing template: ${template.name}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/10 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SaveBar onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────────

const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: 'general', label: 'General', icon: Globe },
  { key: 'shipping', label: 'Shipping', icon: Truck },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'email', label: 'Email', icon: Mail },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white sm:hidden">Settings</h2>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'shipping' && <ShippingTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'email' && <EmailTab />}
      </div>
    </div>
  );
}
