import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from './Layout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

/** The app and its routes. Later phases add one route per feature. */
export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

/** Split out so tests can render the routes inside a MemoryRouter. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
