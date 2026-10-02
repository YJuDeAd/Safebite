import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Page from './page';

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: { user: { email: "test@example.com" } }, status: "authenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock the global fetch
global.fetch = vi.fn();

describe('UI: Home Page (Dynamic Profiles)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('renders the setup form if no profile exists in localStorage', () => {
    render(<Page />);
    expect(screen.getByText('Your Dietary Profile')).toBeInTheDocument();
    expect(screen.getByText('Save Profile')).toBeInTheDocument();
  });

  it('can save a profile and transition to the pantry view', () => {
    render(<Page />);
    
    // Fill out profile
    fireEvent.change(screen.getByPlaceholderText(/e.g. Celiac & Peanut Allergy/i), { target: { value: 'My Allergy' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g. Gluten, Wheat/i), { target: { value: 'Gluten' } });
    
    fireEvent.click(screen.getByText('Save Profile'));
    
    // Now we should see the profile summary and pantry input
    expect(screen.getByText('My Allergy')).toBeInTheDocument();
    expect(screen.getByText(/Gluten/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Chicken breast/i)).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('submits successfully and renders markdown recipe', async () => {
    // Setup local storage directly
    localStorage.setItem('safebite_profile', JSON.stringify({
      name: 'Test Profile',
      allergies: ['Gluten'],
      strictness: 'Standard'
    }));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipe: '# Delicious Safe Recipe' })
    });

    render(<Page />);
    
    // Wait for load
    await screen.findByPlaceholderText(/e.g. Chicken breast/i);
    
    // Fill in ingredients
    const textarea = screen.getByPlaceholderText(/e.g. Chicken breast/i);
    fireEvent.change(textarea, { target: { value: 'Chicken' } });
    
    // Click Generate
    const button = screen.getByText('Generate Recipe');
    fireEvent.click(button);
    
    expect(button).toBeDisabled();

    // Await render of markdown
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delicious Safe Recipe' })).toBeInTheDocument();
    });
  });
});
