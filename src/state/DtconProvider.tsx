import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DemoTransport } from '../bluetooth/DemoTransport';
import { TransportStatus, IDtconTransport } from '../bluetooth/transport';
import { DEFAULT_PREFERENCES, ModeId, Preferences, loadPreferences, savePreferences } from '../storage/preferences';
import { moveItem } from '../utils/math';

export type Screen = 'intro' | 'home' | 'mouse' | 'joystick';

interface DtconContextValue {
  screen: Screen;
  go: (screen: Screen) => void;
  transport: IDtconTransport;
  transportStatus: TransportStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  prefs: Preferences;
  setDpi: (dpi: number) => void;
  setScrollSensitivity: (sensitivity: number) => void;
  setLastMode: (mode: ModeId) => void;
  reorderModes: (from: number, to: number) => void;
}

const DtconContext = createContext<DtconContextValue | null>(null);

export function DtconProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('intro');
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(() => ({
    status: 'DISCONNECTED',
    isDemo: true,
    packetsSent: 0,
    bytesSent: 0,
  }));

  const transport = useMemo(() => new DemoTransport(), []);
  const statusRef = useRef<TransportStatus>(transportStatus);

  useEffect(() => {
    statusRef.current = transportStatus;
  }, [transportStatus]);

  useEffect(() => {
    return transport.onStatusChange(setTransportStatus);
  }, [transport]);

  useEffect(() => {
    savePreferences(prefs);
  }, [prefs]);

  useEffect(() => {
    void transport.connect();
  }, [transport]);

  const go = useCallback((next: Screen) => setScreen(next), []);

  const connect = useCallback(async () => {
    const result = await transport.connect();
    if (!result.ok) {
      setTransportStatus((s) => ({ ...s, status: 'ERROR', lastError: result.error }));
    }
  }, [transport]);

  const disconnect = useCallback(async () => {
    await transport.disconnect();
  }, [transport]);

  const setDpi = useCallback((dpi: number) => {
    setPrefs((p) => ({ ...p, dpi }));
  }, []);

  const setScrollSensitivity = useCallback((sensitivity: number) => {
    setPrefs((p) => ({ ...p, scrollSensitivity: sensitivity }));
  }, []);

  const setLastMode = useCallback((mode: ModeId) => {
    setPrefs((p) => ({ ...p, lastMode: mode }));
  }, []);

  const reorderModes = useCallback((from: number, to: number) => {
    setPrefs((p) => ({ ...p, modeOrder: moveItem(p.modeOrder, from, to) }));
  }, []);

  const value = useMemo<DtconContextValue>(
    () => ({
      screen,
      go,
      transport,
      transportStatus,
      connect,
      disconnect,
      prefs,
      setDpi,
      setScrollSensitivity,
      setLastMode,
      reorderModes,
    }),
    [
      screen,
      go,
      transport,
      transportStatus,
      connect,
      disconnect,
      prefs,
      setDpi,
      setScrollSensitivity,
      setLastMode,
      reorderModes,
    ],
  );

  return <DtconContext.Provider value={value}>{children}</DtconContext.Provider>;
}

export function useDtcon(): DtconContextValue {
  const ctx = useContext(DtconContext);
  if (!ctx) throw new Error('useDtcon must be used within DtconProvider');
  return ctx;
}

export { DEFAULT_PREFERENCES };