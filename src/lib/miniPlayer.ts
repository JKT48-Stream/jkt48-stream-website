import { useSyncExternalStore } from "react";

type MiniPlayerState = {
  videoId: string | null;
  title: string;
  channelTitle: string;
  isMini: boolean;
};

let state: MiniPlayerState = {
  videoId: null,
  title: "",
  channelTitle: "",
  isMini: false,
};

const listeners = new Set<() => void>();
function setState(p: Partial<MiniPlayerState>) {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useMiniPlayer() {
  const snap = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  return {
    ...snap,
    open: (videoId: string, title: string, channelTitle: string) =>
      setState({ videoId, title, channelTitle, isMini: false }),
    close: () => setState({ videoId: null, isMini: false }),
    setMini: (v: boolean) => setState({ isMini: v }),
  };
}
