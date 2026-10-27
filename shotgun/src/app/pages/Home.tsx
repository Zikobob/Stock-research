/** The first screen. Phase 0 is only the shell; the big HELP button and the guides arrive in later phases. */
export function Home() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-5xl font-black leading-none tracking-tight">Shotgun</h1>
        <p className="text-xl text-ink-dim">
          Rides shotgun when things go wrong. A voice co-pilot for teen drivers.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="text-lg font-bold text-amber">What it will do</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-dim">
          <li>Say &ldquo;Shotgun, help&rdquo; and get talked through pulling over.</li>
          <li>Tell you where you are, so you can tell 911.</li>
          <li>Walk you through a passenger emergency, step by step.</li>
          <li>Let you practise before you ever need it.</li>
        </ul>
      </div>

      <p className="text-sm text-ink-dim">
        Shotgun is an education tool. It does not replace 911, professional medical care, or
        certified first-aid/CPR training.
      </p>
    </section>
  );
}
