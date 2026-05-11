"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";

export default function RegisterPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"MAKER" | "CHECKER"| "ADMIN">("MAKER");

    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await registerUser({ username, password, role });

            alert("User registered successfully");
            router.push("/login");
        } catch {
            alert("Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleRegister} style={styles.form}>
                <h2>Register</h2>

                <input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                />

                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    style={styles.input}
                >
                    <option value="MAKER">MAKER</option>
                    <option value="CHECKER">CHECKER</option>
                    <option value="ADMIN">ADMIN</option>
                </select>

                <button disabled={loading} style={styles.button}>
                    {loading ? "Creating..." : "Register"}
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
    },
    form: {
        width: "320px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "10px",
        padding: "20px",
        borderRadius: "10px",
        background: "white",
    },
    input: {
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "6px",
    },
    button: {
        padding: "10px",
        background: "#16a34a",
        color: "white",
        border: "none",
        borderRadius: "6px",
    },
};