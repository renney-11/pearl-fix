import { render, screen } from '@testing-library/react';
import Background from '../src/components/background';
import '@testing-library/jest-dom';

describe('Background Component', () => {
  it('renders children and footer correctly', () => {
    render(
      <Background>
        <div>Test Child</div>
      </Background>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
