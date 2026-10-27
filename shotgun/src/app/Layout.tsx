import { Link, Outlet } from 'react-router';

/** The frame around every page: a skip link, a header with the name, and the page itself. */
export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-[env(safe-area-inset-bottom)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:rounded focus:bg-amber focus:px-3 focus:py-2 focus:text-night"
      >
        Skip to content
      </a>
      <header className="flex items-center justify-between py-5">
        <Link to="/" className="text-xl font-extrabold tracking-tight" aria-label="Shotgun home">
          Shotgun
        </Link>
      </header>
      <main id="main" className="flex-1 pb-10">
        <Outlet />
      </main>
    </div>
  );
}
