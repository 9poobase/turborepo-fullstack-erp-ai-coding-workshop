import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';
import { mockApi } from '@/test/mock-api';
import { SuppliersList } from './suppliers-list';

function renderList() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SuppliersList />
    </QueryClientProvider>,
  );
}

function supplier(id: string, code: string, name: string) {
  return {
    id,
    code,
    name,
    contact: 'ติดต่อ',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('SuppliersList', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows a loading state first', () => {
    mockApi({ 'GET /suppliers': { items: [], total: 0, page: 1, pageSize: 20 } });

    renderList();

    expect(screen.getByText('กำลังโหลด…')).toBeInTheDocument();
  });

  it('renders suppliers newest-first as returned by the API', async () => {
    mockApi({
      'GET /suppliers': {
        items: [supplier('x2', 'SUP02', 'Second'), supplier('x1', 'SUP01', 'First')],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    });

    renderList();

    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('SUP02');
    expect(rows[2]).toHaveTextContent('SUP01');
  });

  it('shows an empty state when there are no suppliers', async () => {
    mockApi({ 'GET /suppliers': { items: [], total: 0, page: 1, pageSize: 20 } });

    renderList();

    expect(await screen.findByText('ยังไม่มีข้อมูลผู้จัดจำหน่าย')).toBeInTheDocument();
  });

  it('shows an error state when the list request fails', async () => {
    mockApi({ 'GET /suppliers': new Response('nope', { status: 500 }) });

    renderList();

    expect(
      await screen.findByText('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
