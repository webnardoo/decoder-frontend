"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type GuidedOverlayStep = {
  id: string;
  /** Elemento principal (alvo do “clique para avançar” quando requireTargetClick=true) */
  targetTourId: string;
  /** Elementos adicionais para destacar junto (ex.: score + análise + botão) */
  highlightTourIds?: string[];
  title: string;
  body: string;
  requireTargetClick: boolean;
};

type Props = {
  enabled: boolean;
  step: GuidedOverlayStep | null;
  onAdvance: () => void;
  onBlockedClick?: () => void;
};

type Rect = { top: number; left: number; width: number; height: number };

function getRect(el: Element): Rect | null {
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r) return null;
  if (r.width <= 0 || r.height <= 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function isInsideRect(x: number, y: number, rect: Rect) {
  return (
    x >= rect.left &&
    x <= rect.left + rect.width &&
    y >= rect.top &&
    y <= rect.top + rect.height
  );
}

const STYLE_TAG_ID = "guided-overlay-pulse-style";

function ensurePulseStyleTag() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
@keyframes guidedOverlayPulseOutline {
  0%   { 
  outline-color: rgba(168, 85, 247, 0.95); 
  outline-offset: 4px; 
  filter: drop-shadow(0 0 0 rgba(168, 85, 247, 0)); 
}
50%  { 
  outline-color: rgba(168, 85, 247, 0.20); 
  outline-offset: 10px; 
  filter: drop-shadow(0 0 14px rgba(168, 85, 247, 0.55)); 
}
100% { 
  outline-color: rgba(168, 85, 247, 0.95); 
  outline-offset: 4px; 
  filter: drop-shadow(0 0 0 rgba(168, 85, 247, 0)); 
}
}
.guidedOverlayPulse {
  animation: guidedOverlayPulseOutline 1.05s ease-in-out infinite;
}
  `.trim();

  document.head.appendChild(style);
}

type PrevStyle = {
  position: string;
  zIndex: string;
  outline: string;
  outlineOffset: string;
  borderRadius: string;
  animation: string;
  tabIndex: string | null;
  hadPulseClass: boolean;
  dataOverlayTabindexApplied: boolean;
};

function getElByTourId(tourId: string) {
  return document.querySelector(`[data-tour-id="${tourId}"]`) as HTMLElement | null;
}

function isVisibleFocusable(el: HTMLElement) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if ((el as any).disabled) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  return true;
}

function isFocusable(el: HTMLElement) {
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  const ti = el.getAttribute("tabindex");
  if (ti != null) {
    const n = Number(ti);
    return Number.isFinite(n) && n >= 0;
  }
  return false;
}

function collectFocusableWithin(el: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    el.querySelectorAll<HTMLElement>(
      `a[href],button,input,textarea,select,[tabindex]:not([tabindex="-1"])`
    )
  );
  const list = [el, ...nodes].filter((x) => isFocusable(x) && isVisibleFocusable(x));
  // de-dup
  return Array.from(new Set(list));
}

export default function GuidedOverlay({
  enabled,
  step,
  onAdvance,
  onBlockedClick,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null);

  // foco-trap: manter referência sempre atual do step/estado
  const stepRef = useRef<GuidedOverlayStep | null>(null);
  const enabledRef = useRef(false);
  const allowPointerPassThroughRef = useRef(false);

  useEffect(() => {
    stepRef.current = step ?? null;
    enabledRef.current = enabled;
    allowPointerPassThroughRef.current = !!step && step.requireTargetClick === false;
  }, [enabled, step]);

  const targetSelector = useMemo(() => {
    if (!enabled || !step?.targetTourId) return null;
    return `[data-tour-id="${step.targetTourId}"]`;
  }, [enabled, step?.targetTourId]);

  const allHighlightIds = useMemo(() => {
    if (!enabled || !step) return [];
    const ids = new Set<string>();
    if (step.targetTourId) ids.add(step.targetTourId);
    (step.highlightTourIds ?? []).forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [enabled, step]);

  // garante CSS do blink
  useEffect(() => {
    if (!enabled) return;
    ensurePulseStyleTag();
  }, [enabled]);

  // Recalcula posição do alvo principal (resize/scroll e trocas de step)
  useEffect(() => {
    if (!enabled || !step || !targetSelector) {
      setRect(null);
      return;
    }

    const compute = () => {
      const el = document.querySelector(targetSelector);
      if (!el) {
        setRect(null);
        return;
      }
      setRect(getRect(el));
    };

    compute();

    const onScroll = () => compute();
    const onResize = () => compute();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    const id = window.setInterval(compute, 250);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.clearInterval(id);
    };
  }, [enabled, step?.id, targetSelector]);

  // Aplica destaque em TODOS os alvos (cards + botão)
  useEffect(() => {
    if (!enabled || !step) return;

    const prevMap = new Map<HTMLElement, PrevStyle>();

    for (const id of allHighlightIds) {
      const el = getElByTourId(id);
      if (!el) continue;

      const prev: PrevStyle = {
        position: el.style.position,
        zIndex: el.style.zIndex,
        outline: el.style.outline,
        outlineOffset: el.style.outlineOffset,
        borderRadius: el.style.borderRadius,
        animation: el.style.animation,
        tabIndex: el.getAttribute("tabindex"),
        hadPulseClass: el.classList.contains("guidedOverlayPulse"),
        dataOverlayTabindexApplied: (el as any)?.dataset?.overlayTabindexApplied === "1",
      };
      prevMap.set(el, prev);

      // Elevar sempre
      if (!el.style.position || el.style.position === "static") {
        el.style.position = "relative";
      }
      el.style.zIndex = "10000";
      el.style.outline = "2px solid rgba(168, 85, 247, 0.95)";
      el.style.outlineOffset = "4px";
      if (!el.style.borderRadius) el.style.borderRadius = "14px";

      // blink
      el.classList.add("guidedOverlayPulse");
    }

    return () => {
      for (const [el, prev] of prevMap.entries()) {
        el.style.position = prev.position;
        el.style.zIndex = prev.zIndex;
        el.style.outline = prev.outline;
        el.style.outlineOffset = prev.outlineOffset;
        el.style.borderRadius = prev.borderRadius;
        el.style.animation = prev.animation;

        // restaura tabindex apenas se a gente tiver aplicado
        if ((el as any)?.dataset?.overlayTabindexApplied === "1") {
          if (prev.tabIndex === null) el.removeAttribute("tabindex");
          else el.setAttribute("tabindex", prev.tabIndex);
          delete (el as any).dataset.overlayTabindexApplied;
        }

        if (!prev.hadPulseClass) el.classList.remove("guidedOverlayPulse");
      }
    };
  }, [enabled, step?.id, allHighlightIds, step]);

  // ✅ AUTO-FOCUS (sem clique) quando o step exige clique no alvo
  useEffect(() => {
    if (!enabled || !step) return;
    if (!step.requireTargetClick) return;

    const el = getElByTourId(step.targetTourId);
    if (!el) return;

    const isNaturallyFocusable =
      el.tagName === "BUTTON" ||
      el.tagName === "A" ||
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      (el as any).tabIndex >= 0;

    // se não for focável, torna focável só pro overlay (e restaura no cleanup do efeito de destaque)
    if (!isNaturallyFocusable && !el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "-1");
      (el as any).dataset.overlayTabindexApplied = "1";
    }

    const t = window.setTimeout(() => {
      try {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      } catch {}
      try {
        el.focus({ preventScroll: true });
      } catch {}
    }, 0);

    return () => window.clearTimeout(t);
  }, [enabled, step?.id, step?.requireTargetClick, step?.targetTourId, step]);

  // No step de digitação, foca automaticamente no alvo (não bloqueia interação)
  useEffect(() => {
    if (!enabled || !step) return;
    if (step.requireTargetClick) return;

    const el = getElByTourId(step.targetTourId);
    if (!el) return;

    const focusable =
      el.tagName === "TEXTAREA" || el.tagName === "INPUT" ? el : null;

    if (focusable) {
      const t = window.setTimeout(() => {
        try {
          (focusable as HTMLTextAreaElement | HTMLInputElement).focus();
        } catch {}
      }, 0);

      return () => window.clearTimeout(t);
    }
  }, [enabled, step?.id, step?.requireTargetClick, step?.targetTourId, step]);

  // Step que exige clique no alvo: registra listener direto no alvo
  useEffect(() => {
    if (!enabled || !step) return;
    if (!step.requireTargetClick) return;

    const el = getElByTourId(step.targetTourId);
    if (!el) return;

    const handler = () => {
      // deixa o clique real acontecer; só avança o guia
      onAdvance();
    };

    el.addEventListener("click", handler);

    return () => {
      el.removeEventListener("click", handler);
    };
  }, [enabled, step?.id, step?.requireTargetClick, step?.targetTourId, onAdvance, step]);

  // ✅ HARD focus-trap: bloqueia TAB/SHIFT+TAB e impede foco fora do(s) alvo(s)
  useEffect(() => {
    if (!enabled || !step) return;

    const getAllowedCycle = (): HTMLElement[] => {
      const s = stepRef.current;
      if (!enabledRef.current || !s) return [];

      // regra:
      // - se requireTargetClick=true => foco só no target (e filhos focáveis)
      // - se requireTargetClick=false => foco só no target (e filhos focáveis) também
      // (mantém o usuário preso no passo atual; evita “andar” na tela)
      const target = getElByTourId(s.targetTourId);
      if (!target) return [];

      const focusables = collectFocusableWithin(target);
      // se nada focável, pelo menos o próprio target (forçando tabindex no efeito acima)
      return focusables.length > 0 ? focusables : [target];
    };

    const focusFirst = () => {
      const allowed = getAllowedCycle();
      const first = allowed[0];
      if (!first) return;
      try {
        first.focus({ preventScroll: true });
      } catch {}
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const s = stepRef.current;
      if (!s) return;

      // Só faz sentido quando overlay está ativo na tela (não quando pointer pass-through)
      // Mesmo em passos de digitação, ainda queremos travar TAB para não sair do input.
      if (e.key !== "Tab") return;

      const allowed = getAllowedCycle();
      if (allowed.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const idx = active ? allowed.indexOf(active) : -1;

      e.preventDefault();

      const nextIdx = (() => {
        if (e.shiftKey) {
          if (idx <= 0) return allowed.length - 1;
          return idx - 1;
        }
        // forward
        if (idx < 0 || idx >= allowed.length - 1) return 0;
        return idx + 1;
      })();

      const next = allowed[nextIdx];
      if (!next) return;
      try {
        next.focus({ preventScroll: true });
      } catch {}
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!enabledRef.current) return;
      const s = stepRef.current;
      if (!s) return;

      const allowed = getAllowedCycle();
      if (allowed.length === 0) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // se o foco foi parar fora do ciclo permitido, puxa de volta
      if (!allowed.includes(target)) {
        // pequena tolerância: se for um filho do target permitido, aceita
        const root = getElByTourId(s.targetTourId);
        if (root && root.contains(target)) return;

        // volta pro primeiro permitido
        focusFirst();
      }
    };

    // capturar antes de outros handlers
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);

    // ao habilitar, força foco inicial dentro do trap
    const t = window.setTimeout(() => {
      focusFirst();
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [enabled, step?.id]);

  if (!enabled || !step) return null;

  const allowPointerPassThrough = step.requireTargetClick === false;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-9999 bg-black/55"
        style={{ pointerEvents: allowPointerPassThrough ? "none" : "auto" }}
        onMouseDown={(e) => {
          if (allowPointerPassThrough) return;

          if (rect) {
            const inside = isInsideRect(e.clientX, e.clientY, rect);
            if (!inside) onBlockedClick?.();
          } else {
            onBlockedClick?.();
          }
        }}
      />

      {/* “Hole” visual em volta do alvo principal (click target) */}
      {rect && (
        <div
          className="fixed z-9999 rounded-2xl"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div className="fixed z-[10001] left-4 right-4 top-4 mx-auto max-w-[780px]">
        <div className="rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur">
          <div className="text-sm font-semibold">{step.title}</div>
          <div className="mt-1 text-sm text-zinc-200">{step.body}</div>
          <div className="mt-2 text-xs text-zinc-400">
            {step.requireTargetClick
              ? "Clique no elemento destacado para avançar."
              : "Siga as instruções para avançar."}
          </div>
        </div>
      </div>
    </>
  );
}
