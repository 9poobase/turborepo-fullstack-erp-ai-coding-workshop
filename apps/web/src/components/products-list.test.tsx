import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';
import { mockApi } from '@/test/mock-api';
import { ProductsList } from './products-list';

function renderList() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ProductsList />
    </QueryClientProvider>,
  );
}

function product(id: string, sku: string, name: string, active = true) {
  return {
    id,
    sku,
    name,
    category: 'ของใช้',
    unit: 'แพ็ค',
    sellingPrice: 60,
    active,
    thresholds: [{ storeCode: 'B01', threshold: 3 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ProductsList', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows a loading state first', () => {
    mockApi({ 'GET /products': { items: [], total: 0, page: 1, pageSize: 20 } });

    renderList();

    expect(screen.getByText('กำลังโหลด…')).toBeInTheDocument();
  });

  it('renders products newest-first as returned by the API', async () => {
    mockApi({
      'GET /products': {
        items: [product('p2', 'SKU002', 'Tissue paper'), product('p1', 'SKU001', 'Water')],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    });

    renderList();

    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('SKU002');
    expect(rows[2]).toHaveTextContent('SKU001');
  });

  it('marks an inactive product so it is distinguishable from active ones', async () => {
    mockApi({
      'GET /products': {
        items: [product('p1', 'SKU003', 'Laundry detergent', false)],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    });

    renderList();

    expect(await screen.findByText('ปิดการใช้งาน')).toBeInTheDocument();
  });

  it('shows an empty state when there are no products', async () => {
    mockApi({ 'GET /products': { items: [], total: 0, page: 1, pageSize: 20 } });

    renderList();

    expect(await screen.findByText('ยังไม่มีข้อมูลสินค้า')).toBeInTheDocument();
  });

  it('shows an error state when the list request fails', async () => {
    mockApi({ 'GET /products': new Response('nope', { status: 500 }) });

    renderList();

    expect(
      await screen.findByText('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
