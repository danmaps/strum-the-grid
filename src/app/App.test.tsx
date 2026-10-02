import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { syntheticSpans } from '../data/synthetic';

vi.mock('../map/NetworkMap', () => ({ default: () => <div>Map boundary</div> }));
vi.mock('../visualization/Profile', () => ({ default: ({ sagM }: { sagM: number }) => <output data-testid="profile-sag">{sagM}</output> }));
Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
afterEach(cleanup);

describe('primary learning state', () => {
  it('selects, changes frequency/profile, plays silently, and restores source values exactly', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(40));
    const source = JSON.stringify(syntheticSpans[0]);
    fireEvent.change(screen.getByLabelText('Select synthetic span'), { target: { value: syntheticSpans[0].id } });
    const initialHz = screen.getByTestId('fundamental-frequency').textContent;
    fireEvent.click(screen.getByRole('button', { name: /Change the physics/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Span profile' }));
    const initialSag = Number(screen.getByTestId('profile-sag').textContent);
    fireEvent.change(screen.getByLabelText('Reference tension (N)'), { target: { value: 40000 } });
    expect(parseFloat(screen.getByTestId('fundamental-frequency').textContent!)).toBeGreaterThan(parseFloat(initialHz!));
    expect(Number(screen.getByTestId('profile-sag').textContent)).toBeLessThan(initialSag);
    expect(JSON.stringify(syntheticSpans[0])).toBe(source);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Reference tension' }));
    expect(screen.getByTestId('fundamental-frequency').textContent).toBe(initialHz);
    fireEvent.click(screen.getByRole('button', { name: /Strum this span/ }));
    expect(screen.getByTestId('strum-count').textContent).toBe('1 EXCITATIONS');
    fireEvent.click(screen.getByRole('button', { name: /Open resonance laboratory/ }));
    expect(screen.getByRole('button', { name: 'Mode 4' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mode 4' }));
    expect(screen.getByRole('button', { name: 'Mode 4' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(screen.getByLabelText('Temperature (°C)'), { target: { value: 70 } });
    fireEvent.click(screen.getByRole('button', { name: /Reset all span parameters/ }));
    expect(screen.getByTestId('fundamental-frequency').textContent).toBe(initialHz);
  });
});
