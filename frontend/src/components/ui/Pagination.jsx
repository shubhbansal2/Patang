import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ page, totalPages, onPageChange }) => {
    if (!totalPages || totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-4 pt-4">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={16} />
                Prev
            </button>
            <span className="text-sm font-medium text-gray-500">
                Page <span className="text-gray-800 font-bold">{page}</span> of <span className="text-gray-800 font-bold">{totalPages}</span>
            </span>
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                Next
                <ChevronRight size={16} />
            </button>
        </div>
    );
};

export default Pagination;
