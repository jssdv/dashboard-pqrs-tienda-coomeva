// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLive } from "./useLive";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, () => void>();
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string) {
    this.listeners.get(type)?.();
  }
}

afterEach(() => {
  FakeEventSource.instances = [];
  vi.unstubAllGlobals();
});

describe("useLive", () => {
  it("calls the latest callback on each change and closes the stream on unmount", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ onChange }) => useLive(onChange), { initialProps: { onChange: first } });

    const [source] = FakeEventSource.instances;
    expect(source.url).toBe("/api/events");
    source.emit("change");
    expect(first).toHaveBeenCalledTimes(1);

    rerender({ onChange: second });
    source.emit("change");
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);

    unmount();
    expect(source.closed).toBe(true);
  });

  it("does nothing without EventSource", () => {
    vi.stubGlobal("EventSource", undefined);
    expect(() => renderHook(() => useLive(() => {}))).not.toThrow();
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
