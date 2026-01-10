// FRONT — src/app/conversas/new/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createContainer } from "@/lib/containers";
import { goalAreas, goalPresets, getStates, type GoalArea } from "@/lib/objectives";

export default function NewConversaPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [area, setArea] = useState<GoalArea>(goalAreas[0].value);

  const states = useMemo(() => getStates(area), [area]);
  const [currentStateId, setCurrentStateId] = useState(states.current[0].id);
  const [desiredStateId, setDesiredStateId] = useState(states.desired[0].id);
  const [presetId, setPresetId] = useState("");

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = goalPresets.find((p) => p.id === id);
    if (!preset) return;

    setArea(preset.area);
    const st = getStates(preset.area);
    setCurrentStateId(
      st.current.find((s) => s.id === preset.currentStateId)?.id ?? st.current[0].id
    );
    setDesiredStateId(
      st.desired.find((s) => s.id === preset.desiredStateId)?.id ?? st.desired[0].id
    );
  }

  function onCreate() {
    const c = createContainer({
      name: name.trim() || "Sem nome",
      goal: { area, currentStateId, desiredStateId },
    });

    router.push(`/conversas/${c.id}`);
  }

  return (
    <main className="min-h-[calc(100vh-64px)] px-0">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Nova conversa</h1>
          <p className="mt-1 text-sm text-zinc-300/80">
            Defina o objetivo para acompanhar a evolução dentro desta conversa.
          </p>
        </div>

        <div className="card p-6 md:p-7 space-y-5">
          <div className="space-y-2">
            <label className="label" htmlFor="name">
              Nome
            </label>
            <input
              id="name"
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Relacionamento – Janeiro"
            />
          </div>

          <div className="space-y-2">
            <label className="label" htmlFor="preset">
              Sugestão rápida (opcional)
            </label>
            <select
              id="preset"
              className="input w-full"
              value={presetId}
              onChange={(e) => applyPreset(e.target.value)}
            >
              <option value="">Nenhuma</option>
              {goalPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="label" htmlFor="area">
              Área
            </label>
            <select
              id="area"
              className="input w-full"
              value={area}
              onChange={(e) => setArea(e.target.value as GoalArea)}
            >
              {goalAreas.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="label" htmlFor="currentState">
                Situação atual
              </label>
              <select
                id="currentState"
                className="input w-full"
                value={currentStateId}
                onChange={(e) => setCurrentStateId(e.target.value)}
              >
                {states.current.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="label" htmlFor="desiredState">
                Situação desejada
              </label>
              <select
                id="desiredState"
                className="input w-full"
                value={desiredStateId}
                onChange={(e) => setDesiredStateId(e.target.value)}
              >
                {states.desired.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button className="btn btn-primary w-full sm:w-auto" onClick={onCreate}>
              Criar conversa
            </button>
            <Link className="btn w-full sm:w-auto" href="/conversas">
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
