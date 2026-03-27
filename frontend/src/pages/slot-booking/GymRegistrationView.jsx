import { useEffect, useState } from 'react';
import {
  CalendarRange,
  CheckCircle2,
  CreditCard,
  FileText,
  HeartPulse,
  ShieldAlert,
  UserRound,
  Waves,
} from 'lucide-react';
import {
  EmptyState,
  InlineBanner,
  RulesCard,
  SectionHeading,
  StatusBadge,
} from './shared';
import {
  formatCurrency,
  formatDate,
  formatPlanDuration,
  getSubscriptionStatusTone,
} from './utils';

const readOnlyFieldClassName = 'w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none';
const uploadFieldClassName = 'block w-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-brand-300';

const facilityMeta = {
  Gym: {
    eyebrow: 'Facilities / Gym',
    title: 'Gym registration',
    description: 'Review your gym subscription options, upload the required documents, and submit a registration request using the backend flow already available in this project.',
    sectionDescription: 'Choose the active gym plan you want to apply for.',
    activeMessage: 'Your current pass stays active until',
    pendingMessage: 'Your previous request is still under review. New submissions are disabled until it is resolved.',
    note: 'Preferred slot, emergency contact, and SBI reference fields are intentionally deferred.',
    icon: HeartPulse,
    lockedLabel: 'Gym subscription',
    emptyPlansTitle: 'No gym plans found',
    emptyPlansDescription: 'There are no active gym subscription plans available right now.',
  },
  SwimmingPool: {
    eyebrow: 'Facilities / Swimming',
    title: 'Swimming registration',
    description: 'Review swimming subscription plans, check live occupancy, and submit the required registration documents using the same backend workflow.',
    sectionDescription: 'Choose the active swimming plan you want to apply for.',
    activeMessage: 'Your current swimming pass stays active until',
    pendingMessage: 'Your previous swimming request is still under review. New submissions are disabled until it is resolved.',
    note: 'Preferred lane, coach preference, and extra medical profile fields are intentionally deferred.',
    icon: Waves,
    lockedLabel: 'Swimming subscription',
    emptyPlansTitle: 'No swimming plans found',
    emptyPlansDescription: 'There are no active swimming subscription plans available right now.',
  },
};

const SubscriptionRegistrationView = ({
  data,
  loading,
  refreshing,
  submission,
  onRefresh,
  onSubmit,
  facilityType = 'Gym',
}) => {
  const meta = facilityMeta[facilityType] || facilityMeta.Gym;
  const FacilityIcon = meta.icon;
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [medicalCert, setMedicalCert] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (data?.currentSubscription) {
      setSelectedPlanId('');
      return;
    }

    if (!selectedPlanId && data?.plans?.length) {
      setSelectedPlanId(data.plans[0]._id || data.plans[0].planDuration || data.plans[0].name);
    }

    if (!selectedSlotId && data?.slots?.length) {
      const availableSlot = data.slots.find(s => s.activeCount < s.capacity) || data.slots[0];
      setSelectedSlotId(availableSlot._id);
    }
  }, [data, selectedPlanId, selectedSlotId]);

  const selectedPlan = data?.plans?.find((plan) => (plan._id || plan.planDuration || plan.name) === selectedPlanId) || data?.plans?.[0] || null;
  const subscription = data?.currentSubscription || null;
  const occupancy = data?.slotAvailability || null;
  const occupancyTotal = occupancy?.totalSlots || 0;
  const occupancyRegistered = occupancy?.registered || 0;
  const occupancyProgress = occupancyTotal > 0 ? Math.min(100, Math.round((occupancyRegistered / occupancyTotal) * 100)) : 0;
  const isFormLocked = Boolean(subscription);

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError('');

    if (isFormLocked) return;

    // Mandatory profile fields
    if (!data?.user?.name?.trim()) {
      setValidationError('Your profile name is required. Please update your profile before applying.');
      return;
    }

    if (!data?.user?.rollNumber?.trim()) {
      setValidationError('Roll number is required. Please update your profile before applying.');
      return;
    }

    if (!selectedPlan) {
      setValidationError('Select a plan before submitting the registration.');
      return;
    }

    if (!selectedSlotId) {
      setValidationError('Select an available time slot before submitting.');
      return;
    }

    if (!medicalCert) {
      setValidationError('Upload your medical certificate before submitting.');
      return;
    }

    if (!paymentReceipt) {
      setValidationError('Upload your payment receipt before submitting.');
      return;
    }

    onSubmit({
      facilityType,
      plan: selectedPlan,
      slotId: selectedSlotId,
      medicalCert,
      paymentReceipt,
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        actions={
          <div className="rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_360px]">
        <div className="space-y-6">
          {subscription ? (
            <InlineBanner
              tone={subscription.status === 'Approved' ? 'success' : 'warning'}
              icon={CheckCircle2}
              title={`${meta.lockedLabel} ${subscription.status?.toLowerCase()}`}
              description={
                subscription.status === 'Approved'
                  ? `${meta.activeMessage} ${formatDate(subscription.endDate)}. A new registration is disabled while this subscription is active.`
                  : meta.pendingMessage
              }
            />
          ) : null}

          {submission.success && (
            <InlineBanner
              tone="success"
              icon={CheckCircle2}
              title="Registration submitted"
              description={submission.success}
            />
          )}

          {(validationError || submission.error) && (
            <InlineBanner
              tone="danger"
              icon={ShieldAlert}
              title="Registration blocked"
              description={validationError || submission.error}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                  <UserRound size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Personal details</h2>
                  <p className="mt-1 text-sm text-gray-500">These fields are prefilled from the authenticated user profile.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Full name <span className="text-red-500">*</span></label>
                  <input value={data?.user?.name || ''} readOnly className={`${readOnlyFieldClassName} ${!data?.user?.name?.trim() ? 'border-red-300 bg-red-50' : ''}`} />
                  {!data?.user?.name?.trim() && <p className="mt-1 text-xs text-red-500">Name is required. Update your profile.</p>}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Email</label>
                  <input value={data?.user?.email || ''} readOnly className={readOnlyFieldClassName} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Roll number <span className="text-red-500">*</span></label>
                  <input value={data?.user?.rollNumber || 'Not available'} readOnly className={`${readOnlyFieldClassName} ${!data?.user?.rollNumber?.trim() ? 'border-red-300 bg-red-50' : ''}`} />
                  {!data?.user?.rollNumber?.trim() && <p className="mt-1 text-xs text-red-500">Roll number is required. Update your profile.</p>}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Department</label>
                  <input value={data?.user?.department || 'Not available'} readOnly className={readOnlyFieldClassName} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Backend scope note</label>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    This version only submits the fields currently supported by the backend: plan, medical certificate, and payment receipt. {meta.note}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                  <FacilityIcon size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Select a plan</h2>
                  <p className="mt-1 text-sm text-gray-500">{meta.sectionDescription}</p>
                </div>
              </div>

              {data?.plans?.length ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {data.plans.map((plan) => {
                    const planId = plan._id || plan.planDuration || plan.name;
                    const isSelected = planId === selectedPlanId;

                    return (
                      <button
                        key={planId}
                        type="button"
                        disabled={isFormLocked}
                        onClick={() => setSelectedPlanId(planId)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
                            : 'border-gray-200 bg-gray-50 hover:border-brand-200 hover:bg-brand-50/70'
                        } ${isFormLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{plan.name || formatPlanDuration(plan)}</p>
                            <p className="mt-1 text-sm text-gray-500">{plan.label || formatPlanDuration(plan)}</p>
                          </div>
                          {plan.tag ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                              {plan.tag}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-6 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Price</p>
                            <p className="mt-1 text-2xl font-bold text-gray-800">{formatCurrency(plan.price)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Duration</p>
                            <p className="mt-1 text-sm font-semibold text-gray-700">{formatPlanDuration(plan)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState
                    title={meta.emptyPlansTitle}
                    description={meta.emptyPlansDescription}
                  />
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                  <CalendarRange size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Select a time slot</h2>
                  <p className="mt-1 text-sm text-gray-500">Pick an available time slot for your {facilityType.toLowerCase()} subscription. Some slots may be full.</p>
                </div>
              </div>

              {data?.slots?.length ? (
                <div className="mt-5 grid gap-4 grid-cols-2 sm:grid-cols-3">
                  {data.slots.map((slot) => {
                    const isSelected = slot._id === selectedSlotId;
                    const isFull = slot.activeCount >= slot.capacity;
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={isFormLocked || isFull}
                        onClick={() => setSelectedSlotId(slot._id)}
                        className={`group relative flex flex-col items-center justify-center gap-1 rounded-2xl border p-4 text-center transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 shadow-[inset_0_0_0_1px_rgba(var(--brand-500),0.3)]'
                            : isFull 
                            ? 'border-red-100 bg-red-50 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 bg-gray-50 hover:border-brand-200 hover:bg-brand-50/50'
                        } ${isFormLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        <p className={`text-sm font-bold ${isFull ? 'text-red-800' : 'text-gray-800'}`}>
                          {slot.startTime} - {slot.endTime}
                        </p>
                        <p className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${isFull ? 'text-red-500' : 'text-gray-500'}`}>
                           {isFull ? 'Full capacity' : `${slot.spotsLeft} slots left`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState
                    title="No slots available"
                    description="There are no active time slots for this facility right now."
                  />
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Payment and documents</h2>
                  <p className="mt-1 text-sm text-gray-500">Upload the two files required by the subscription backend.</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span className="font-semibold">Payment instructions:</span> {data?.paymentInstructions || 'No payment instructions available.'}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="medicalCert" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Medical certificate <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="medicalCert"
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    disabled={isFormLocked}
                    onChange={(event) => setMedicalCert(event.target.files?.[0] || null)}
                    className={uploadFieldClassName}
                  />
                  <p className="mt-2 text-xs text-gray-500">{medicalCert?.name || 'PDF, JPG, or PNG up to 5 MB.'}</p>
                </div>

                <div>
                  <label htmlFor="paymentReceipt" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Payment receipt <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="paymentReceipt"
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    disabled={isFormLocked}
                    onChange={(event) => setPaymentReceipt(event.target.files?.[0] || null)}
                    className={uploadFieldClassName}
                  />
                  <p className="mt-2 text-xs text-gray-500">{paymentReceipt?.name || 'Upload the receipt generated after SBI Collect payment.'}</p>
                </div>
              </div>
            </section>
          </form>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Summary</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {subscription ? `Your current ${facilityType === 'Gym' ? 'gym' : 'swimming'} subscription status.` : 'The selected plan and current occupancy snapshot.'}
                </p>
              </div>
              {subscription ? <StatusBadge status={subscription.status} tone={getSubscriptionStatusTone(subscription.status)} /> : null}
            </div>

            {subscription ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Plan</p>
                  <p className="mt-2 text-base font-bold text-gray-800">{subscription.plan}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Start date</p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">{formatDate(subscription.startDate)}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Valid until</p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">{formatDate(subscription.endDate)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Time Slot</p>
                  <p className="mt-2 text-sm font-semibold text-gray-800">{subscription.slotId ? `${subscription.slotId.startTime} - ${subscription.slotId.endTime}` : 'No slot assigned'}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Pass ID</p>
                  <p className="mt-2 text-sm font-semibold text-gray-800">{subscription.passId || 'Will be assigned after approval'}</p>
                </div>
              </div>
            ) : selectedPlan ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Selected plan</p>
                  <p className="mt-2 text-base font-bold text-gray-800">{selectedPlan.name || formatPlanDuration(selectedPlan)}</p>
                  <p className="mt-1 text-sm text-gray-500">{selectedPlan.label || formatPlanDuration(selectedPlan)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Price</p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">{formatCurrency(selectedPlan.price)}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Duration</p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">{formatPlanDuration(selectedPlan)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="Choose a plan"
                  description="Select any active gym plan to see its summary before submitting."
                />
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-brand-500" />
                <p className="text-sm font-semibold text-gray-800">Occupancy snapshot</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>{occupancy?.registered || 0} registered</span>
                <StatusBadge status={occupancy?.status || 'Unknown'} tone={getSubscriptionStatusTone(occupancy?.status)} />
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-gray-100">
                <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${occupancyProgress}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {occupancy?.available || 0} of {occupancy?.totalSlots || 0} slots currently available.
              </p>
            </div>

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isFormLocked || submission.submitting || !data?.plans?.length}
              className="mt-5 w-full rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFormLocked
                ? 'Registration unavailable'
                : submission.submitting
                  ? 'Submitting registration...'
                  : 'Submit registration'}
            </button>

            <p className="mt-3 text-xs text-gray-500">
              The backend requires both document uploads even if the design mock highlights only the receipt field.
            </p>
          </div>

          <RulesCard title="Quick rules" rules={data?.quickRules || []} accent="info" />

          {loading && !data ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 rounded bg-gray-100" />
                <div className="h-20 rounded-2xl bg-gray-100" />
                <div className="h-20 rounded-2xl bg-gray-100" />
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
};

export default SubscriptionRegistrationView;
