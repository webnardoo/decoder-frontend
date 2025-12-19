"use client";

import ResultView, {
  type QuickAnalysisResponseV11,
  type QuickModeUI,
} from "@/components/result-view";

export function QuickAnalysisCard({
  data,
  quickMode,
}: {
  data: QuickAnalysisResponseV11;
  quickMode: QuickModeUI;
}) {
  return (
    <div className="w-full">
      <ResultView data={data} quickMode={quickMode} />
    </div>
  );
}

export default QuickAnalysisCard;
