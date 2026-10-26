import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';
import { mockApi } from '@/test/mock-api';
import { StoresList } from './stores-list';

function renderList() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <StoresList />
    </QueryClientProvider>,
  );
}

function store(id: string, code: string, name: string) {
  return {
    id,
    code,
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('StoresList', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows a loading state first', () => {
    mockApi({ 'GET /auth/me': { user: null }, 'GET /stores': { items: [], total: 0, page: 1, pageSize: 20 } });

    renderList();

    expect(screen.getByText('กำลังโหลด…')).toBeInTheDocument();
  });

  it('renders stores newest-first as returned by the API', async () => {
    mockApi({
      'GET /stores': {
        items: [store('s2', 'B02', 'Riverside Store'), store('s1', 'B01', 'Central Store')],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    });

    renderList();

    const rows = await screen.findAllByRole('row');
    // rows[0] is the header; data rows follow in API order (newest first).
    expect(rows[1]).toHaveTextContent('B02');
    expect(rows[2]).toHaveTextContent('B01');
  });

  it('shows an empty state when there are no stores', async () => {
    mockApi({ 'GET /stores': { items: [], total: 0, page: 1, pageSize: 20 } });

    renderList();

    expect(await screen.findByText('ยังไม่มีข้อมูลสาขา')).toBeInTheDocument();
  });

  it('shows an error state when the list request fails', async () => {
    mockApi({ 'GET /stores': new Response('nope', { status: 500 }) });

    renderList();

    expect(
      await screen.findByText('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
