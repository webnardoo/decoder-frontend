"use client";

import React, { useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("theme", theme);
}

export default function TopNavClient() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const isLight = theme === "light";
  const isDark = theme === "dark";

  const themePillStyle = useMemo(() => {
    return {
      borderRadius: 999,
      border: "1px solid var(--stroke-soft, rgba(0,0,0,.10))",
      background: "rgba(255,255,255,.55)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      padding: 4,
      display: "inline-flex",
      gap: 4,
      alignItems: "center",
      boxShadow: "0 6px 24px rgba(0,0,0,.06)",
    } as const;
  }, []);

  function setLight() {
    setTheme("light");
    applyTheme("light");
  }

  function setDark() {
    setTheme("dark");
    applyTheme("dark");
  }

  return (
    <>
      <header className="mktTopNav">
        <div className="mktTopNavInner">
          <a className="mktBrand" href="/">
           <img
  src="/logo-hitchai.png"
  alt="Hitch.ai"
  className="mktLogoImg"
/>
<span className="mktBrandText">Hitch.ai</span>
          </a>

          <div className="mktTopNavRight">
            <div style={themePillStyle} aria-label="Tema">
              <button
                type="button"
                className={`mktPillBtn ${isLight ? "isActive" : ""}`}
                onClick={setLight}
              >
                Light
              </button>
              <button
                type="button"
                className={`mktPillBtn ${isDark ? "isActive" : ""}`}
                onClick={setDark}
              >
                Dark
              </button>
            </div>

            <a className="mktCtaBtn" href="/signup">
              Assinar
            </a>
            <a className="mktCtaBtn mktCtaGhost" href="/app/start">
              Entrar
            </a>
          </div>
        </div>
      </header>

      <style jsx>{`
        .mktTopNav {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          border-bottom: 1px solid var(--stroke-soft, rgba(0, 0, 0, 0.1));
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        html[data-theme="dark"] .mktTopNav {
          background: rgba(10, 12, 16, 0.55);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mktTopNavInner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .mktBrand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
        }

      .mktLogoImg {
  height: 40px;
  width: auto;
  display: block;
}

        .mktBrandText {
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .mktTopNavRight {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .mktPillBtn {
          border: 0;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 999px;
          background: transparent;
          color: inherit;
          font-size: 13px;
          font-weight: 600;
          opacity: 0.72;
        }

        .mktPillBtn.isActive {
          opacity: 1;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--stroke-soft, rgba(0, 0, 0, 0.12));
        }

        html[data-theme="dark"] .mktPillBtn.isActive {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .mktCtaBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
          border: 1px solid rgba(124, 58, 237, 0.35);
          background: rgba(124, 58, 237, 0.12);
          box-shadow: 0 10px 26px rgba(124, 58, 237, 0.18);
          color: inherit;
        }

        .mktCtaBtn:hover {
          filter: brightness(1.02);
        }

        .mktCtaGhost {
          border: 1px solid var(--stroke-soft, rgba(0, 0, 0, 0.12));
          background: rgba(255, 255, 255, 0.55);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.06);
        }

        html[data-theme="dark"] .mktCtaGhost {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </>
  );
}