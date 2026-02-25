"use client";

import MarketingTopNavInner, { type Props } from "./topnav/MarketingTopNav";

export type { Props };

export default function MarketingTopNav(props: Props) {
  return <MarketingTopNavInner {...props} />;
}