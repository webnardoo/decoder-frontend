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
    setCurrentStateId(st.current.find((s) => s.id === preset.currentStateId)?.id ?? st.current[0].id);
    setDesiredStateId(st.desired.find((s) => s.id === preset.desiredStateId)?.id ?? st.desired[0].id);
  }

  function onCreate() {
    const c = createContainer({
      name: name.trim() || "Sem nome",
      goal: { area, currentStateId, desiredStateId },
    });

    router.push(`/conversas/${c.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Nova conversa</h1>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Nome</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Relacionamento – Janeiro"
          />
        </div>

        <div>
          <label className="label">Sugestão rápida (opcional)</label>
          <select className="input" value={presetId} onChange={(e) => applyPreset(e.target.value)}>
            <option value="">Nenhuma</option>
            {goalPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Área</label>
          <select className="input" value={area} onChange={(e) => setArea(e.target.value as GoalArea)}>
            {goalAreas.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Situação atual</label>
            <select className="input" value={currentStateId} onChange={(e) => setCurrentStateId(e.target.value)}>
              {states.current.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Situação desejada</label>
            <select className="input" value={desiredStateId} onChange={(e) => setDesiredStateId(e.target.value)}>
              {states.desired.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={onCreate}>
            Criar conversa
          </button>
          <Link className="btn" href="/conversas">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}
