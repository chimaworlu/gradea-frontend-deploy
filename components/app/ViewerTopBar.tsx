"use client";

import { useEffect, useState } from "react";
import { fetchViewer, viewerFrom, type Viewer } from "../../lib/scan/upload";
import { AppTopBar } from "./AppTopBar";

/**
 * The S2 top bar for a screen that does not otherwise ask who is signed in (the processing
 * placeholder). The session is checked once, on load (AGENTS.md section 5).
 */
export function ViewerTopBar() {
  const [viewer, setViewer] = useState<Viewer | undefined>(undefined);
  useEffect(() => {
    let current = true;
    void fetchViewer().then((result) => {
      if (current) setViewer(viewerFrom(result));
    });
    return () => {
      current = false;
    };
  }, []);
  return <AppTopBar viewer={viewer} />;
}
