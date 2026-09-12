import { useDtcon } from '../state/DtconProvider';
import './joystick.css';

export default function JoystickScreen() {
  const { go } = useDtcon();

  return (
    <div className="joystick screen">
      <div className="joystick__card">
        <button className="joystick__home" onClick={() => go('home')} aria-label="Home">
          ⌂
        </button>
        <div className="joystick__icon">J</div>
        <h1 className="joystick__title">Joystick Mode</h1>
        <p className="joystick__body">
          Left stick, right stick, buttons and haptics are next. This screen ships with the first Bluetooth build.
        </p>
        <span className="joystick__soon">COMING SOON</span>
      </div>
    </div>
  );
}