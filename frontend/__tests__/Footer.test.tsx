import { render, screen } from '@testing-library/react';
import Footer from '../src/components/footer';  // Import the component
import '@testing-library/jest-dom';

describe('Footer Component', () => {
  test('renders correctly with copyright message', () => {
    render(<Footer />);
    
    expect(screen.getByText(/© 2024 Copyright: PEARLFIX.com/i)).toBeInTheDocument();
  });

  test('has the correct class names for styling', () => {
    render(<Footer />);
    
    const footerElement = screen.getByRole('contentinfo');
    expect(footerElement).toHaveClass('bg-[rgba(229,243,253,255)]');
    expect(footerElement).toHaveClass('py-6');
    expect(footerElement).toHaveClass('px-8');
  });
});
