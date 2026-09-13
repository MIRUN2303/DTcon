import { useEffect, useMemo, useState } from 'react';
import { DtconProvider, useDtcon } from './state/DtconProvider';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
import MouseScreen from './screens/MouseScreen';
import JoystickScreen from './screens/JoystickScreen';
import RotateScreen from './screens/RotateScreen';

export default function App() {
  return (
    <DtconProvider>
      <Router />
    </DtconProvider>
  );
}

function usePortrait(): boolean {
  const [portrait, setPortrait] = useState<boolean>(() => window.matchMedia('(orientation: portrait)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return portrait;
}

function Router() {
  const portrait = usePortrait();
  const { screen } = useDtcon();
  const initial = useMemo(() => new URLSearchParams(window.location.search).get('screen'), []);
  const active = (initial && initial !== 'intro' ? initial : screen) as typeof screen;
  if (portrait) return <RotateScreen />;
  switch (active) {
    case 'intro':
      return <IntroScreen />;
    case 'home':
      return <HomeScreen />;
    case 'mouse':
      return <MouseScreen />;
    case 'joystick':
      return <JoystickScreen />;
    default:
      return <HomeScreen />;
  }
}