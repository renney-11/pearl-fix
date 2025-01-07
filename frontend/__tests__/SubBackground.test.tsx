import React from 'react';
import { render, screen } from '@testing-library/react';
import SubBackground from '../src/components/subbackground';

describe('SubBackground Component', () => {
  it('renders children correctly', () => {
    render(
      <SubBackground>
        <p>Test Content</p>
      </SubBackground>
    );

    // Check if the child content is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct class names', () => {
    const { container } = render(
      <SubBackground>
        <p>Test Content</p>
      </SubBackground>
    );

    // Check if the div has the correct class names
    expect(container.firstChild).toHaveClass('bg-[#D1E0F1] rounded-2xl p-6 m-10');
  });
});
