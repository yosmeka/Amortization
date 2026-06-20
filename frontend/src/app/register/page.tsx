"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { fetchUsers, registerUser, updateUser, updateUserStatus, deleteUser, UserResponse } from "@/lib/api";

export default function UserManagementPage() {
    useAuthGuard(); // General auth guard
    const router = useRouter();

    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal states
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form inputs
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"MAKER" | "CHECKER" | "ADMIN">("MAKER");
    const [actionLoading, setActionLoading] = useState(false);

    // Edit context
    const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

    useEffect(() => {
        const currentUserRole = localStorage.getItem("role");
        if (currentUserRole !== "ADMIN") {
            alert("Unauthorized: Only ADMIN users can manage users.");
            router.push("/");
            return;
        }
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchUsers();
            setUsers(data);
        } catch (err: any) {
            console.error("Failed to fetch users", err);
            setError("Failed to fetch user list.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setError("");

        try {
            await registerUser({ username, email, password, role });
            setIsRegisterModalOpen(false);
            resetForm();
            loadUsers();
        } catch (err: any) {
            setError(err.message || "Registration failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setActionLoading(true);
        setError("");

        try {
            await updateUser(editingUser.id, { email, role });
            setIsEditModalOpen(false);
            setEditingUser(null);
            loadUsers();
        } catch (err: any) {
            setError(err.message || "Failed to edit user");
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleStatus = async (user: UserResponse) => {
        if (!confirm(`Are you sure you want to ${user.enabled ? "disable" : "enable"} ${user.username}?`)) return;
        try {
            await updateUserStatus(user.id, !user.enabled);
            loadUsers();
        } catch (err: any) {
            alert(err.message || "Failed to update status");
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Are you absolutely sure you want to delete ${name}? This action cannot be reversed.`)) return;
        try {
            await deleteUser(id);
            loadUsers();
        } catch (err: any) {
            alert(err.message || "Failed to delete user");
        }
    };

    const resetForm = () => {
        setUsername("");
        setEmail("");
        setPassword("");
        setRole("MAKER");
        setError("");
    };

    const openEditModal = (user: UserResponse) => {
        setEditingUser(user);
        setUsername(user.username);
        setEmail(user.email);
        setRole(user.role);
        setError("");
        setIsEditModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#f4f7fb] p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Management</h1>
                        <p className="text-gray-500 mt-1 font-medium">Add, modify, track, and disable users seamlessly.</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsRegisterModalOpen(true); }}
                        className="bg-[#1281c9] hover:bg-[#0f6aa6] text-white px-6 py-3 rounded-lg font-bold shadow-md shadow-[#1281c9]/20 transition-all flex items-center gap-2"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                        <span className="text-xl leading-none">+</span> Add New User
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20 text-gray-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#ee3124]"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#f9fafb] border-b border-gray-200 text-gray-600 text-[13px] uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/80 text-[14px]">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 font-mono">#{user.id}</td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{user.username}</td>
                                            <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'CHECKER' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {user.enabled ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center flex justify-center gap-3">
                                                <button onClick={() => openEditModal(user)} className="text-gray-500 hover:text-[#1281c9] transition flex items-center gap-1 font-semibold text-xs border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50">
                                                    Edit
                                                </button>
                                                <button onClick={() => handleToggleStatus(user)} className={`${user.enabled ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'} transition flex items-center gap-1 font-semibold text-xs border px-3 py-1.5 rounded-md`}>
                                                    {user.enabled ? 'Disable' : 'Enable'}
                                                </button>
                                                <button onClick={() => handleDelete(user.id, user.username)} className="text-red-500 hover:text-red-700 transition flex items-center gap-1 font-semibold text-xs border border-red-100 px-3 py-1.5 rounded-md hover:bg-red-50">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-gray-400 font-medium">No users found. Create one.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-8 relative">
                        <button onClick={() => setIsRegisterModalOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Register New User</h2>

                        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 py-3 px-4 rounded-lg font-medium">{error}</div>}

                        <form onSubmit={handleRegister} className="flex flex-col gap-4">
                            <div>
                                <label className="text-[13px] font-bold text-gray-700 mb-1 block">Username</label>
                                <input type="text" placeholder="johndoe" value={username} onChange={e => setUsername(e.target.value)} disabled={actionLoading} className="w-full px-4 py-3 bg-[#f4f7fb] border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all" required />
                            </div>
                            <div>
                                <label className="text-[13px] font-bold text-gray-700 mb-1 block">Email Content</label>
                                <input type="email" placeholder="john@zemenbank.com" value={email} onChange={e => setEmail(e.target.value)} disabled={actionLoading} className="w-full px-4 py-3 bg-[#f4f7fb] border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all" required />
                            </div>
                            <div>
                                <label className="text-[13px] font-bold text-gray-700 mb-1 block">Password</label>
                                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={actionLoading} className="w-full px-4 py-3 bg-[#f4f7fb] border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all" required />
                            </div>
                            <div>
                                <label className="text-[13px] font-bold text-gray-700 mb-1 block">Assign Role</label>
                                <select value={role} onChange={e => setRole(e.target.value as any)} disabled={actionLoading} className="w-full px-4 py-3 bg-[#f4f7fb] border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all font-semibold text-gray-700">
                                    <option value="MAKER">MAKER</option>
                                    <option value="CHECKER">CHECKER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <button type="submit" disabled={actionLoading} className="w-full mt-4 bg-[#ee3124] hover:bg-[#d42a1e] text-white rounded-xl py-3.5 font-bold shadow-md shadow-red-600/20 active:scale-[0.98] transition-all disabled:opacity-70" style={{ backgroundColor: 'var(--brand-primary)' }}>
                                {actionLoading ? "Registering..." : "Confirm Application"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-8 relative">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit User: {editingUser.username}</h2>

                        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 py-3 px-4 rounded-lg font-medium">{error}</div>}

                        <form onSubmit={handleEditSubmission} className="flex flex-col gap-4">
                            <div>
                                <label className="text-[13px] font-bold text-gray-700 mb-1 block">Username</label>
                                <input type="text" value={username} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed outline-none" />
                                <p className="text-[11px] text-gray-400 mt-1 ml-1">Username cannot be edited.</p>
                            </div>
                            <div>
                                <label className="text-[13px] font-bold text-gray-700 mb-1 block">Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={actionLoading} className="w-full px-4 py-3 bg-[#f4f7fb] border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all" required />
                            </div>
                            <div>
                                <label className="text-[13px] font-bold text-gray-700 mb-1 block">Role</label>
                                <select value={role} onChange={e => setRole(e.target.value as any)} disabled={actionLoading} className="w-full px-4 py-3 bg-[#f4f7fb] border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all font-semibold text-gray-700">
                                    <option value="MAKER">MAKER</option>
                                    <option value="CHECKER">CHECKER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <button type="submit" disabled={actionLoading} className="w-full mt-4 bg-[#ee3124] hover:bg-[#d42a1e] text-white rounded-xl py-3.5 font-bold shadow-md shadow-red-600/20 active:scale-[0.98] transition-all disabled:opacity-70" style={{ backgroundColor: 'var(--brand-primary)' }}>
                                {actionLoading ? "Saving Changes..." : "Save Modifications"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}