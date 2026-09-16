"use client";

import Image from "next/image";
import { useState } from "react";
import z01Logo from "../../public/z-01.png";

export default function FloatingWatermark() {
    const [hovered, setHovered] = useState(false);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    return (
        <aside
            aria-label="Fixed brand watermark and scroll to top"
            onClick={scrollToTop}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: "fixed",
                bottom: "22px",
                right: "24px",
                zIndex: 90,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transform: hovered ? "scale(1.08) translateY(-3px)" : "scale(1)",
                transition: "all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
                userSelect: "none"
            }}
            title="Zemen Bank S.C. • Click to scroll to top"
        >
            {/* Visual glow backdrop for contrast on dark/light */}
            <div
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    borderRadius: "16px",
                    background: hovered
                        ? "rgba(255, 255, 255, 0.2)"
                        : "transparent",
                    backdropFilter: hovered ? "blur(8px)" : "none",
                    boxShadow: hovered
                        ? "0 8px 24px rgba(220, 38, 38, 0.25)"
                        : "none",
                    transition: "all 0.25s ease"
                }}
            >
                <Image
                    src={z01Logo}
                    alt="Zemen Bank"
                    width={82}
                    height={73}
                    unoptimized
                    priority
                    style={{
                        objectFit: "contain",
                        filter: hovered
                            ? "drop-shadow(0 8px 20px rgba(220, 38, 38, 0.45))"
                            : "drop-shadow(0 4px 14px rgba(0, 0, 0, 0.2))",
                        transition: "filter 0.25s ease"
                    }}
                />
            </div>

            {/* Subtle floating hint tooltip on hover */}
            {hovered && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "82px",
                        background: "rgba(15, 23, 42, 0.92)",
                        color: "#ffffff",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        pointerEvents: "none",
                        letterSpacing: "0.3px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        animation: "fadeIn 0.2s ease"
                    }}
                >
                    <span>▲</span>
                    <span>Scroll to Top</span>
                </div>
            )}
        </aside>
    );
}
