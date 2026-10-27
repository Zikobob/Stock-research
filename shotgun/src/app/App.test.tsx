import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from './App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

describe('App shell', () => {
  it('shows the Shotgun home screen', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Shotgun' })).toBeInTheDocument();
  });

  it('always shows the education-tool disclaimer on the home screen', () => {
    renderAt('/');
    expect(screen.getByText(/does not replace 911/i)).toBeInTheDocument();
  });

  it('shows a friendly page for an unknown address', () => {
    renderAt('/nope');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});
