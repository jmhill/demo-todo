import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App.tsx';

describe('App', () => {
  it('should render hello world', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Hello World' }),
    ).toBeInTheDocument();
  });
});
