import { AlertCircle, Check } from 'lucide-react';

/**
 * Reusable confirmation modal with optional text area.
 *
 * Props:
 *  - isOpen, onClose, onConfirm
 *  - title, description
 *  - variant: 'success' | 'danger' (controls colors)
 *  - confirmLabel, cancelLabel
 *  - textAreaProps: { value, onChange, placeholder, required }   (optional)
 *  - inputProps: { type, value, onChange, placeholder, min, max, required } (optional)
 *  - loading, error
 */
const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    description = '',
    variant = 'success',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    textAreaProps,
    inputProps,
    loading = false,
    error = '',
}) => {
    if (!isOpen) return null;

    const isDanger = variant === 'danger';
    const headerBg = isDanger ? 'border-red-100 bg-red-50' : 'border-brand-100 bg-brand-50';
    const headerText = isDanger ? 'text-red-800' : 'text-brand-800';
    const iconColor = isDanger ? 'text-red-600' : 'text-brand-600';
    const btnBg = isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600';

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                {/* Header */}
                <div className={`p-6 border-b ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        {isDanger ? <AlertCircle className={iconColor} size={24} /> : <Check className={iconColor} size={24} />}
                        <h3 className={`text-lg font-bold ${headerText}`}>{title}</h3>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {description && <p className="text-sm text-gray-600">{description}</p>}

                    {textAreaProps && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                {textAreaProps.label || 'Comments'}
                                {textAreaProps.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <textarea
                                rows={3}
                                value={textAreaProps.value}
                                onChange={textAreaProps.onChange}
                                placeholder={textAreaProps.placeholder || ''}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                            />
                        </div>
                    )}

                    {inputProps && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                {inputProps.label || 'Value'}
                                {inputProps.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                                type={inputProps.type || 'text'}
                                value={inputProps.value}
                                onChange={inputProps.onChange}
                                placeholder={inputProps.placeholder || ''}
                                min={inputProps.min}
                                max={inputProps.max}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 ${btnBg}`}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ConfirmModal;
