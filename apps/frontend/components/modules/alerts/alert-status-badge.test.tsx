import { render, screen } from '@testing-library/react';
import { AlertStatusBadge } from './alert-status-badge';

describe('AlertStatusBadge', () => {
  it('should render the "En riesgo" state for at_risk', () => {
    const { container } = render(<AlertStatusBadge status="at_risk" />);
    expect(screen.getByText('En riesgo')).toBeInTheDocument();
    expect(container.querySelector('[data-status="at_risk"]')).toBeInTheDocument();
  });

  it('should render the "Estable" state for stable', () => {
    const { container } = render(<AlertStatusBadge status="stable" />);
    expect(screen.getByText('Estable')).toBeInTheDocument();
    expect(container.querySelector('[data-status="stable"]')).toBeInTheDocument();
  });
});
