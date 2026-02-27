"use client";

import React from "react";

type Variant = "default" | "cta" | "seg" | "chip";
type Size = "sm" | "md" | "lg";
type Tone = "normal" | "active";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  tone?: Tone; // usado em seg/chip
  fullWidth?: boolean;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Design System (App)
 * - Não muda lógica/fluxo. Só UI.
 * - Corrige "pulo" reservando SEMPRE a mesma borda em seg/chip (2px).
 */
const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "default",
    size = "md",
    tone = "normal",
    fullWidth = false,
    className,
    ...rest
  },
  ref
) {
  // ✅ box-border garante que borda não altera o "tamanho final" percebido
  const base =
    "box-border inline-flex items-center justify-center transition select-none disabled:opacity-60 disabled:cursor-not-allowed " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  const sizes: Record<Size, string> = {
    sm: "text-sm px-3 py-2 rounded-xl",
    md: "text-sm px-4 py-2 rounded-xl",
    lg: "text-sm px-5 py-3 rounded-2xl font-semibold",
  };

  // ✅ Importante:
  // - seg/chip SEMPRE têm border-2 (inativo e ativo) -> elimina layout shift
  // - no ativo, só troca border-color/background/text/shadow (sem mudar width/padding)
  const variants: Record<Variant, string> = {
    default:
      "border border-[var(--h-border)] bg-[rgba(2,6,23,0.03)] text-[var(--h-text)] " +
      "hover:bg-[rgba(2,6,23,0.06)] hover:border-[var(--h-hover-border)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.12)]",

    cta:
      "border border-[rgba(34,13,84,0.75)] text-white/90 " +
      "bg-[linear-gradient(90deg,rgba(34,13,84,0.92)_0%,rgba(50,18,118,0.92)_55%,rgba(34,13,84,0.92)_100%)] " +
      "shadow-[0_18px_46px_rgba(0,0,0,0.22),0_0_0_1px_rgba(255,255,255,0.02)_inset] " +
      "hover:shadow-[0_22px_56px_rgba(0,0,0,0.26),0_0_26px_rgba(34,13,84,0.20)] " +
      "rounded-2xl font-semibold px-5 py-3",

    // ✅ reserva borda mesmo inativo
    seg:
      "border-2 border-transparent bg-transparent text-[var(--h-subtle)] " +
      "hover:bg-[rgba(2,6,23,0.06)] hover:text-[var(--h-text)]",

    // ✅ borda sem foco já destacada (como você pediu) e constante (2px)
    chip:
      "border-2 border-[var(--ds-accent-border)] bg-[rgba(2,6,23,0.03)] text-[var(--h-subtle)] " +
      "hover:bg-[rgba(2,6,23,0.06)] hover:text-[var(--h-text)] rounded-2xl",
  };

  // ✅ ativo: NÃO adiciona/remova borda; só muda cor e fundo
  const activeTone =
    tone === "active"
      ? "text-white/90 border-[var(--ds-accentSolid)] " +
        "bg-[linear-gradient(90deg,rgba(34,13,84,0.92)_0%,rgba(50,18,118,0.92)_55%,rgba(34,13,84,0.92)_100%)] " +
        "shadow-[0_14px_40px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.02)_inset]"
      : "";

  const w = fullWidth ? "w-full" : "";
  const sizeClass = variant === "cta" ? "" : sizes[size];

  return (
    <button
      {...rest}
      ref={ref}
      className={cx(base, w, sizeClass, variants[variant], activeTone, className)}
    />
  );
});

export default Button;
