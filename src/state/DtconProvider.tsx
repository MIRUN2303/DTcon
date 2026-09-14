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
  attachTransport: (transport: IDtconTransport) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  prefs: Preferences;
  setDpi: (dpi: number) => void;
  setScrollSensitivity: (sensitivity: number) => void;
  setLastMode: (mode: ModeId) => void;
  setWiredAddress: (address: string) => void;
  reorderModes: (from: number, to: number) => void;
}

const DtconContext = createContext<DtconContextValue | null>(null);

export function DtconProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('intro');
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [transport, setTransport] = useState<IDtconTransport>(() => new DemoTransport());
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(() => ({
    status: 'DISCONNECTED',
    isDemo: true,
    packetsSent: 0,
    bytesSent: 0,
  }));
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
    if (transport.isDemo) void transport.connect();
  }, [transport]);

  const go = useCallback((next: Screen) => setScreen(next), []);

  const attachTransport = useCallback((next: IDtconTransport) => {
    setTransport((current) => {
      if (current !== next && !current.isDemo) void current.disconnect();
      return next;
    });
  }, []);

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

  const setWiredAddress = useCallback((address: string) => {
    setPrefs((p) => ({ ...p, wiredAddress: address.trim() }));
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
      attachTransport,
      connect,
      disconnect,
      prefs,
      setDpi,
      setScrollSensitivity,
      setLastMode,
      setWiredAddress,
      reorderModes,
    }),
    [
      screen,
      go,
      transport,
      transportStatus,
      attachTransport,
      connect,
      disconnect,
      prefs,
      setDpi,
      setScrollSensitivity,
      setLastMode,
      setWiredAddress,
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