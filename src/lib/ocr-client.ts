import type { RelationshipType } from "@/lib/relationships";

export type QuickMode = "RESUMO" | "RESPONDER";

export type OcrPipelineStep = {
  key?: string;
  id?: string;
  label?: string;
  status?: string;
  state?: string;
};

export type OcrPipelineError = {
  message?: string;
  code?: string;
};

export type OcrPipelineStatus = {
  status?: string; // PENDING/RUNNING/DONE/ERROR
  steps?: OcrPipelineStep[];
  extractedText?: string;
  text?: string;
  error?: OcrPipelineError;
};

export type OcrPipelineStartResponse = {
  ok: boolean;
  pipelineId: string;
};

export async function startOcrPipeline(input: {
  files: File[];
  relationshipType: RelationshipType;
  quickMode: QuickMode;
}): Promise<{ ok: true; pipelineId: string } | { ok: false; error: string }> {
  try {
    const fd = new FormData();
    for (const f of input.files) fd.append("files", f);
    fd.append("relationshipType", input.relationshipType);
    fd.append("quickMode", input.quickMode);

    const res = await fetch("/api/ocr/pipeline/start", {
      method: "POST",
      body: fd,
      cache: "no-store",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const payload: any = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      const msg =
        String(payload?.error ?? payload?.message ?? "").trim() ||
        `Falha ao iniciar. Status ${res.status}`;
      return { ok: false, error: msg };
    }

    const pid =
      String(payload?.pipelineId ?? payload?.jobId ?? "").trim();

    if (!pid) {
      return { ok: false, error: "Resposta inválida ao iniciar (pipelineId ausente)." };
    }

    return { ok: true, pipelineId: pid };
  } catch (e: any) {
    return { ok: false, error: "Não foi possível conectar ao servidor." };
  }
}

export async function getOcrPipelineStatus(pipelineId: string): Promise<OcrPipelineStatus> {
  const qs = new URLSearchParams({ pipelineId }).toString();

  const res = await fetch(`/api/ocr/pipeline/status?${qs}`, {
    method: "GET",
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payload: any = isJson ? await res.json().catch(() => null) : await res.text();

  // Mesmo em erro, devolve payload para UI mostrar
  if (!res.ok) {
    return {
      status: "ERROR",
      error: { message: String(payload?.error ?? payload?.message ?? "Erro ao consultar status.") },
    };
  }

  return payload as OcrPipelineStatus;
}
