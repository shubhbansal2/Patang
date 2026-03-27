import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/ui/ToastContainer';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { fetchUsers, updateUserRoles } from '../../services/executiveApi';
import { Search, Users, AlertTriangle, Shield } from 'lucide-react';

const ASSIGNABLE_ROLES = ['student', 'faculty', 'caretaker', 'captain', 'coordinator', 'gym_admin', 'swim_admin'];

const CoordinatorAccessPage = () => {
    const { showSuccess, showError } = useToast();
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalAction, setModalAction] = useState('add'); // 'add' | 'remove'
    const [selectedRole, setSelectedRole] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchUsers({ search: search || undefined, role: roleFilter || undefined, page, limit: 20 });
            setUsers(data.users || []);
            setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, page]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    // Debounced search: reset page on search change
    useEffect(() => { setPage(1); }, [search, roleFilter]);

    const openRoleModal = (user, action) => {
        setSelectedUser(user);
        setModalAction(action);
        setSelectedRole('');
        setModalError('');
        setModalOpen(true);
    };

    const handleRoleUpdate = async () => {
        if (!selectedRole) {
            setModalError('Please select a role');
            return;
        }
        setSubmitting(true);
        setModalError('');
        try {
            const res = await updateUserRoles(selectedUser._id, { action: modalAction, role: selectedRole });
            showSuccess(res.message || `Role ${modalAction === 'add' ? 'added' : 'removed'} successfully`);
            setModalOpen(false);
            loadUsers();
        } catch (err) {
            setModalError(err.response?.data?.message || 'Failed to update role');
        } finally {
            setSubmitting(false);
        }
    };

    const availableRolesForAction = () => {
        if (!selectedUser) return [];
        if (modalAction === 'add') {
            return ASSIGNABLE_ROLES.filter(r => !selectedUser.roles?.includes(r));
        }
        return (selectedUser.roles || []).filter(r => ASSIGNABLE_ROLES.includes(r));
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Coordinator Access Management</h1>
                <p className="text-sm text-gray-500">Search users and manage their roles and permissions.</p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative w-full sm:flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or roll number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                    <option value="">All Roles</option>
                    {ASSIGNABLE_ROLES.map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')}</option>
                    ))}
                </select>
            </div>

            {/* Content */}
            {loading ? (
                <LoadingSpinner message="Loading users..." />
            ) : error ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
                        <AlertTriangle size={24} className="mx-auto mb-2" />
                        {error}
                    </div>
                </div>
            ) : users.length === 0 ? (
                <EmptyState icon={Users} title="No Users Found" subtitle={search ? 'Try adjusting your search criteria.' : 'No users match the current filters.'} />
            ) : (
                <>
                    <p className="text-sm font-semibold text-gray-500">{pagination.total} user{pagination.total !== 1 && 's'} found</p>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        <th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">User</th>
                                        <th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Roles</th>
                                        <th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                                        <th className="text-right px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-800">{user.name || 'N/A'}</p>
                                                <p className="text-xs text-gray-400">{user.email}</p>
                                                {user.profileDetails?.rollNumber && (
                                                    <p className="text-xs text-gray-400 mt-0.5">{user.profileDetails.rollNumber}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(user.roles || []).map(r => (
                                                        <StatusBadge key={r} status={r} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${user.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {user.isVerified ? 'Verified' : 'Unverified'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openRoleModal(user, 'add')}
                                                        className="px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
                                                    >
                                                        + Add Role
                                                    </button>
                                                    <button
                                                        onClick={() => openRoleModal(user, 'remove')}
                                                        disabled={(user.roles || []).length <= 1}
                                                        className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        − Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Pagination page={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
                </>
            )}

            {/* Role Modal */}
            {modalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className={`p-6 border-b ${modalAction === 'add' ? 'border-brand-100 bg-brand-50' : 'border-red-100 bg-red-50'}`}>
                            <div className="flex items-center gap-3">
                                <Shield size={24} className={modalAction === 'add' ? 'text-brand-600' : 'text-red-600'} />
                                <h3 className={`text-lg font-bold ${modalAction === 'add' ? 'text-brand-800' : 'text-red-800'}`}>
                                    {modalAction === 'add' ? 'Add Role' : 'Remove Role'}
                                </h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                {modalAction === 'add' ? 'Add a role to' : 'Remove a role from'} <strong>{selectedUser?.name}</strong>
                            </p>
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Select Role <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                >
                                    <option value="">-- Select --</option>
                                    {availableRolesForAction().map(r => (
                                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            {modalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle size={14} /> {modalError}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setModalOpen(false)} disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50">Cancel</button>
                            <button
                                onClick={handleRoleUpdate}
                                disabled={submitting}
                                className={`flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 ${modalAction === 'add' ? 'bg-brand-500 hover:bg-brand-600' : 'bg-red-500 hover:bg-red-600'}`}
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : `Confirm ${modalAction === 'add' ? 'Add' : 'Remove'}`}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CoordinatorAccessPage;
