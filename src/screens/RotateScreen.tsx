export default function RotateScreen() {
  return (
    <div className="rotate-screen" role="alert">
      <div className="rotate-screen__icon" aria-hidden="true">
        <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5h18a2 2 0 0 1 2 2v22a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M11 9h14" opacity="0.4" />
          <path d="M27 18h6m0 0-3-3m3 3-3 3" />
        </svg>
      </div>
      <h1 className="rotate-screen__title">DTcon</h1>
      <p className="rotate-screen__sub">Rotate your device to landscape to use the controller.</p>
    </div>
  );
}