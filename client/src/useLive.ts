import { useEffect, useRef } from "react";

// Calls onChange whenever the server reports a write. EventSource reconnects on its own.
// Without EventSource (tests, very old browsers) the screen just stays as it was loaded.
export function useLive(onChange: () => void): void {
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource("/api/events");
    const refetch = () => latest.current();
    source.addEventListener("change", refetch);
    return () => source.close();
  }, []);
}
