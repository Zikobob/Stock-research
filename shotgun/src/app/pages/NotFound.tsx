import { Link } from 'react-router';

export function NotFound() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-extrabold">Page not found</h1>
      <p className="text-ink-dim">That page does not exist.</p>
      <Link to="/" className="inline-block rounded-xl bg-amber px-5 py-3 font-bold text-night">
        Back to home
      </Link>
    </section>
  );
}
