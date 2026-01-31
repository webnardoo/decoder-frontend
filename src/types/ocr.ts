// src/types/ocr.ts

export type StepKey =
  | "RECEIVED"
  | "OCR"
  | "ORGANIZE"
  | "PREPARE"
  | "ANALYZE";

export type StepStatus = "PENDING" | "RUNNING" | "DONE" | "ERROR";

export type PipelineStep = {
  key: StepKey;
  status: StepStatus;
  label?: string;
  detail?: string;
};

export type OcrPipelineStatus = {
  pipelineId: string;
  done: boolean;
  error?: { message: string };
  steps: PipelineStep[];
  result?: {
    extractedText: string;
    analysis?: any;
  };
};
