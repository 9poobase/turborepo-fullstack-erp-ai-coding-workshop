import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';
import { mockApi } from '@/test/mock-api';
import { StockSearch } from './stock-search';

function renderSearch() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <StockSearch />
    </QueryClientProvider>,
  );
}

function balance(
  sku: string,
  productName: string,
  quantity: number,
  threshold: number | null,
  lowStock: boolean,
  storeCode = 'B01',
) {
  return {
    productId: `prd-${sku}`,
    sku,
    productName,
    storeCode,
    quantity,
    unit: 'ถุง',
    threshold,
    lowStock,
  };
}

describe('StockSearch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows a loading state first', () => {
    mockApi({ 'GET /stock/search': { items: [], total: 0, page: 1, pageSize: 20 } });

    renderSearch();

    expect(screen.getByText('กำลังโหลด…')).toBeInTheDocument();
  });

  it('renders balances newest-first as returned by the API', async () => {
    mockApi({
      'GET /stock/search': {
        items: [
          balance('SKU003', 'Laundry detergent', 0, 3, true),
          balance('SKU001', 'Drinking water', 24, 3, false),
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    });

    renderSearch();

    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('SKU003');
    expect(rows[2]).toHaveTextContent('SKU001');
  });

  it('flags a low-stock product so it is distinguishable from an in-stock one', async () => {
    mockApi({
      'GET /stock/search': {
        items: [balance('SKU003', 'Laundry detergent', 0, 3, true)],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    });

    renderSearch();

    expect(await screen.findByText('ใกล้หมด')).toBeInTheDocument();
  });

  it('shows an empty state when no balances match', async () => {
    mockApi({ 'GET /stock/search': { items: [], total: 0, page: 1, pageSize: 20 } });

    renderSearch();

    expect(await screen.findByText('ไม่พบข้อมูลสต็อก')).toBeInTheDocument();
  });

  it('shows an error state when the search request fails', async () => {
    mockApi({ 'GET /stock/search': new Response('nope', { status: 500 }) });

    renderSearch();

    expect(
      await screen.findByText('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('passes the SKU/name term and store filter to the API', async () => {
    const fetch = mockApi({
      'GET /stock/search': { items: [], total: 0, page: 1, pageSize: 20 },
    });

    renderSearch();

    fireEvent.change(await screen.findByLabelText('ค้นหา (SKU หรือชื่อสินค้า)'), {
      target: { value: 'SKU003' },
    });
    fireEvent.change(screen.getByLabelText('สาขา'), { target: { value: 'B01' } });

    await waitFor(() => {
      const search = fetch.mock.calls
        .map(([request]) => new URL((request as Request).url).search)
        .find((s) => s.includes('q=SKU003') && s.includes('storeCode=B01'));
      if (!search) throw new Error('combined term + store not sent yet');
      expect(search).toContain('q=SKU003');
      expect(search).toContain('storeCode=B01');
    });
  });
});
