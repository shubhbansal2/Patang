const STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-700',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    dismissed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    acknowledged: 'bg-blue-100 text-blue-700',
    changesrequested: 'bg-purple-100 text-purple-700',
};

const StatusBadge = ({ status, className = '' }) => {
    if (!status) return null;
    const key = status.toLowerCase().replace(/\s+/g, '');
    const style = STATUS_STYLES[key] || 'bg-gray-100 text-gray-600';
    const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${style} ${className}`}>
            {label}
        </span>
    );
};

export default StatusBadge;
