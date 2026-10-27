import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';
import { mockApi } from '@/test/mock-api';
import { StockReport } from './stock-report';

function renderReport() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <StockReport />
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

const page = (items: ReturnType<typeof balance>[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
});

const empty = page([]);

describe('StockReport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows a loading state first', () => {
    mockApi({ 'GET /stock/reports/on-hand': empty });

    renderReport();

    expect(screen.getByText('กำลังโหลด…')).toBeInTheDocument();
  });

  it('opens on the stock-on-hand report and keeps zero-stock products visible', async () => {
    mockApi({
      'GET /stock/reports/on-hand': page([
        balance('SKU003', 'Laundry detergent', 0, 3, true),
        balance('SKU001', 'Drinking water', 24, 3, false),
      ]),
    });

    renderReport();

    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('SKU003');
    expect(rows[1]).toHaveTextContent('ใกล้หมด');
    expect(rows[2]).toHaveTextContent('SKU001');
    expect(screen.getByRole('button', { name: 'สต็อกคงเหลือ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches to the low-stock report, which lists SKU003 with its balance of 0', async () => {
    const fetch = mockApi({
      'GET /stock/reports/on-hand': page([balance('SKU001', 'Drinking water', 24, 3, false)]),
      'GET /stock/reports/low-stock': page([balance('SKU003', 'Laundry detergent', 0, 3, true)]),
    });

    renderReport();
    await screen.findByText('SKU001');
    fireEvent.click(screen.getByRole('button', { name: 'สต็อกใกล้หมด' }));

    const row = await screen.findByRole('row', { name: /SKU003/ });
    expect(row).toHaveTextContent('ใกล้หมด');
    expect(screen.queryByText('SKU001')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'สต็อกใกล้หมด' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const paths = fetch.mock.calls.map(([request]) => new URL((request as Request).url).pathname);
    expect(paths).toContain('/api/stock/reports/low-stock');
  });

  it('does not ask for the low-stock report until it is chosen', async () => {
    const fetch = mockApi({ 'GET /stock/reports/on-hand': empty });

    renderReport();
    await screen.findByText('ไม่พบข้อมูลสต็อก');

    const paths = fetch.mock.calls.map(([request]) => new URL((request as Request).url).pathname);
    expect(paths).not.toContain('/api/stock/reports/low-stock');
  });

  it('shows an empty state for each report when nothing matches', async () => {
    mockApi({ 'GET /stock/reports/on-hand': empty, 'GET /stock/reports/low-stock': empty });

    renderReport();
    expect(await screen.findByText('ไม่พบข้อมูลสต็อก')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'สต็อกใกล้หมด' }));
    expect(await screen.findByText('ไม่พบสินค้าใกล้หมด')).toBeInTheDocument();
  });

  it('shows an error state when the report request fails', async () => {
    mockApi({ 'GET /stock/reports/on-hand': new Response('nope', { status: 500 }) });

    renderReport();

    expect(
      await screen.findByText('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('passes the SKU/name term and store filter to the chosen report', async () => {
    const fetch = mockApi({
      'GET /stock/reports/on-hand': empty,
      'GET /stock/reports/low-stock': empty,
    });

    renderReport();
    fireEvent.click(screen.getByRole('button', { name: 'สต็อกใกล้หมด' }));
    fireEvent.change(await screen.findByLabelText('ค้นหา (SKU หรือชื่อสินค้า)'), {
      target: { value: 'SKU003' },
    });
    fireEvent.change(screen.getByLabelText('สาขา'), { target: { value: 'B01' } });

    await waitFor(() => {
      const search = fetch.mock.calls
        .map(([request]) => new URL((request as Request).url))
        .find(
          (url) =>
            url.pathname === '/api/stock/reports/low-stock' &&
            url.search.includes('q=SKU003') &&
            url.search.includes('storeCode=B01'),
        );
      if (!search) throw new Error('combined term + store not sent to the low-stock report yet');
    });
  });
});
