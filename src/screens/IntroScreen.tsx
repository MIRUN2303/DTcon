import { useEffect, useState } from 'react';
import { useDtcon } from '../state/DtconProvider';
import './intro.css';

export default function IntroScreen() {
  const { go } = useDtcon();
  const [phase, setPhase] = useState<'idle' | 'show' | 'done'>('idle');

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('show'));
    const timer = setTimeout(() => setPhase('done'), 1400);
    const nav = setTimeout(() => go('home'), 1500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(nav);
    };
  }, [go]);

  return (
    <div className={`intro screen ${phase}`} onClick={() => go('home')}>
      <div className="intro__mark">
        <span className="intro__dot" />
        <h1 className="intro__wordmark">DTcon</h1>
      </div>
      <p className="intro__tag">wireless touchpad &amp; controller</p>
    </div>
  );
}