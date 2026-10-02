import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import ollama from 'ollama';

// Mock Ollama to prevent real LLM calls during tests
vi.mock('ollama', () => ({
  default: {
    chat: vi.fn()
  }
}));

describe('API Route: POST /api/plan', () => {
  it('should return 400 for missing input (Zod validation)', async () => {
    const req = new Request('http://localhost/api/plan', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const res = await POST(req);
    expect(res.status).toBe(400);
    
    const data = await res.json();
    expect(data.error).toBe('Invalid request payload');
  });

  it('should return a valid recipe when successfully processed', async () => {
    // Setup mock response
    vi.mocked(ollama.chat).mockResolvedValueOnce({
      model: 'gemma2:2b',
      created_at: new Date().toISOString(),
      message: { role: 'assistant', content: '# Mock Recipe' },
      done: true
    } as any);

    const mockProfile = {
      name: 'Test Celiac',
      allergies: ['Gluten'],
      strictness: 'Very strict'
    };

    const req = new Request('http://localhost/api/plan', {
      method: 'POST',
      body: JSON.stringify({ pantry: 'Chicken', profile: mockProfile }),
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.recipe).toBe('# Mock Recipe');
  });

  it('should handle ollama server errors securely (500)', async () => {
    vi.mocked(ollama.chat).mockRejectedValueOnce(new Error('Connection refused'));
    const mockProfile = { name: 'Test', allergies: [], strictness: '' };

    const req = new Request('http://localhost/api/plan', {
      method: 'POST',
      body: JSON.stringify({ pantry: 'Chicken', profile: mockProfile }),
    });
    
    const res = await POST(req);
    expect(res.status).toBe(500);
    
    const data = await res.json();
    expect(data.error).toBe('Connection refused');
  });
});
