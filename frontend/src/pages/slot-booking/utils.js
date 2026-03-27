export const formatDate = (value, options = {}) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

export const formatTime = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatSlotTimeRange = (slot) => {
  if (!slot) return '—';

  if (slot.slotStart && slot.slotEnd) {
    return `${formatTime(slot.slotStart)} - ${formatTime(slot.slotEnd)}`;
  }

  if (slot.startTime && slot.endTime) {
    return `${slot.startTime} - ${slot.endTime}`;
  }

  return '—';
};

export const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return '—';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numericAmount);
};

export const formatPlanDuration = (plan) => {
  if (!plan) return '—';

  if (plan.planDuration) {
    const label = String(plan.planDuration);
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  }

  if (plan.validityDays) {
    const months = Math.max(1, Math.round(plan.validityDays / 30));
    return `${months} Month${months > 1 ? 's' : ''}`;
  }

  return '—';
};

export const getSubscriptionStatusTone = (status) => {
  const value = String(status || '').toLowerCase();

  if (['approved', 'confirmed', 'completed', 'attended', 'available'].includes(value)) {
    return 'success';
  }

  if (['pending', 'group_pending', 'provisioned', 'group open'].includes(value)) {
    return 'warning';
  }

  if (['cancelled', 'rejected', 'latecancelled', 'noshow', 'no_show', 'fully booked', 'full', 'missed'].includes(value)) {
    return 'danger';
  }

  if (['team practice'].includes(value)) {
    return 'neutral';
  }

  return 'info';
};

export const getSlotTone = (status) => {
  const value = String(status || '').toLowerCase();

  if (value === 'available') return 'success';
  if (value === 'group open') return 'warning';
  if (value === 'fully booked') return 'danger';
  if (value === 'team practice') return 'neutral';
  if (value === 'unavailable') return 'info';

  return 'info';
};

export const isSlotBookable = (status) => ['Available', 'Group Open'].includes(status);
