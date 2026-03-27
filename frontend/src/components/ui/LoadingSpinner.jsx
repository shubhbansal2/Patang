const LoadingSpinner = ({ message = 'Loading...' }) => (
    <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    </div>
);

export default LoadingSpinner;
