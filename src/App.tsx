import { DtconProvider, useDtcon } from './state/DtconProvider';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
import MouseScreen from './screens/MouseScreen';
import JoystickScreen from './screens/JoystickScreen';

export default function App() {
  return (
    <DtconProvider>
      <Router />
    </DtconProvider>
  );
}

function Router() {
  const { screen } = useDtcon();
  switch (screen) {
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