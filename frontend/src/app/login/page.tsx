"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";
import Image from "next/image";
import bgImage from "../../../public/bg7.png";

export default function LoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await loginUser({ username, password });
            localStorage.setItem("token", res.token);
            const role = res.role.toUpperCase();

            if (role === "ADMIN") {
                router.push("/register");
            } else if (role === "MAKER") {
                router.push("/");
            } else if (role === "CHECKER") {
                router.push("/");
            } else {
                router.push("/");
            }

            localStorage.setItem("role", role);
            localStorage.setItem("username", username);

        } catch (err: any) {
            setError(err.message || "Invalid username or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:justify-end md:pr-[10%] lg:pr-[12%] p-4 font-sans bg-gray-900 overflow-hidden">
            {/* Background Image Overlay */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={bgImage}
                    alt="Background"
                    fill
                    className="object-cover object-center scale-[1.08] md:scale-[1]"   // ← Zoomed out a bit
                    quality={100}
                    priority
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[850px] flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl min-h-[460px]">

                {/* Left Panel - Branding (Slight Red - bg-red-600/30) */}
                <div className="w-full md:w-[45%] bg-red-600/30 p-10 flex flex-col justify-center relative">
                    <div className="flex-1 flex flex-col justify-center items-center text-center drop-shadow-md">
                        <div className="flex items-center justify-center mb-5 text-white">
                            {/* <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <span className="text-2xl font-extrabold text-red-600">Z</span>
                            </div> */}
                        </div>
                        <h1 className="text-[28px] font-bold tracking-tight text-white mb-3 leading-tight">
                            Amortization System
                        </h1>
                        <p className="text-white/90 text-[14px] font-medium tracking-wide max-w-[240px] leading-relaxed">
                            Platform for managing leases and calculating amortizations.
                        </p>
                    </div>

                    <div className="absolute bottom-6 left-0 w-full text-center px-6 drop-shadow-md">
                        <p className="text-white/80 text-[11px] sm:text-[12px] font-medium">
                            ©{new Date().getFullYear()} Zemen Bank. All rights reserved.
                        </p>
                    </div>
                </div>

                {/* Right Panel - Login Form */}
                <div className="w-full md:w-[55%] p-10 md:px-14 md:py-16 flex flex-col justify-center bg-white relative">

                    <div className="mb-8 text-center">
                        <h2 className="text-[26px] font-bold text-gray-800">Login</h2>
                        <p className="text-gray-500 text-[14px] mt-1 font-medium">Please enter your credentials to continue.</p>
                    </div>

                    <form onSubmit={handleLogin} className="w-full mx-auto flex flex-col">

                        {error && (
                            <div className="mb-5 text-sm text-red-600 bg-red-50 py-3 px-4 rounded-lg text-center font-medium border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* Distinct Input Fields aligned vertically */}
                        <div className="flex flex-col gap-5 mb-6">
                            <div className="relative flex flex-col gap-1.5">
                                <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1">Username</label>
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={loading}
                                    className="w-full px-5 py-3.5 bg-[#f4f7fb] border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50 text-[15px] text-gray-800 placeholder-gray-400 transition-all duration-200"
                                    required
                                />
                            </div>

                            <div className="relative flex flex-col gap-1.5">
                                <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        className="w-full px-5 py-3.5 bg-[#f4f7fb] border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50 text-[15px] text-gray-800 placeholder-gray-400 transition-all duration-200"
                                        required
                                    />
                                    {/* Eye icon for password field */}
                                    <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1281c9] hover:bg-[#0f6aa6] text-white rounded-lg py-[14px] text-[15px] font-semibold transition-all duration-200 active:bg-[#0c5382] disabled:opacity-70 disabled:cursor-not-allowed mb-2 shadow-md shadow-red-600/20 mt-2"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}