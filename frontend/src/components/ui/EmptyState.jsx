import { Inbox } from 'lucide-react';

const EmptyState = ({ icon: Icon = Inbox, title = 'Nothing here', subtitle = '' }) => (
    <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
        <div>
            <Icon size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
    </div>
);

export default EmptyState;
