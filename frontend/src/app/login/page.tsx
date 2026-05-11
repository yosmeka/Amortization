"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";

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

            // Store token
            localStorage.setItem("token", res.token);

            // Role-based redirection
            const role = res.role.toUpperCase();

            if (role === "ADMIN") {
                router.push("/admin");           // ← You can change this later
            } 
            else if (role === "MAKER") {
                router.push("/");                // Home / Dashboard for Maker
            } 
            else if (role === "CHECKER") {
                router.push("/");          // Or wherever Checker should go
            } 
            else {
                // Fallback for unknown role
                router.push("/");
            }

            // Optional: You can also store the role in localStorage if needed later
            localStorage.setItem("role", role);
            localStorage.setItem("username", username);

        } catch (err: any) {
            setError(err.message || "Invalid username or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleLogin} style={styles.form}>
                <h2>Login</h2>

                {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

                <input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                    disabled={loading}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    disabled={loading}
                />

                <button 
                    type="submit" 
                    disabled={loading} 
                    style={styles.button}
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}

const styles = {
    container: {
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f4f6f9",
    },
    form: {
        width: "320px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "12px",
        padding: "28px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    },
    input: {
        padding: "12px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        fontSize: "16px",
    },
    button: {
        padding: "12px",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "16px",
        fontWeight: 600,
        marginTop: "8px",
    },
};