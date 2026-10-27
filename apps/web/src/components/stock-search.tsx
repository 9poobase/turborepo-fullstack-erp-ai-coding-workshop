import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@erp/contracts';
import { ListState } from '@/components/list-state';
import { Pagination } from '@/components/pagination';
import { StockBalanceTable } from '@/components/stock-balance-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { orpc } from '@/lib/orpc';

/**
 * Stock search: find balances by SKU, product name and store, and see the current quantity, unit,
 * reorder threshold and a low-stock flag. Results paginate newest-first with the shared
 * loading/empty/error states.
 */
export function StockSearch() {
  const [q, setQ] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [page, setPage] = useState(1);

  const stock = useQuery(
    orpc.stock.search.queryOptions({
      input: {
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        q: q.trim() || undefined,
        storeCode: storeCode.trim() || undefined,
      },
    }),
  );

  // A new search term or store resets to the first page.
  const onQ = (value: string) => {
    setQ(value);
    setPage(1);
  };
  const onStore = (value: string) => {
    setStoreCode(value);
    setPage(1);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">ค้นหาสต็อก</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="stock-q">ค้นหา (SKU หรือชื่อสินค้า)</Label>
          <Input
            id="stock-q"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="SKU001"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stock-store">สาขา</Label>
          <Input
            id="stock-store"
            value={storeCode}
            onChange={(e) => onStore(e.target.value)}
            placeholder="B01"
          />
        </div>
      </div>

      <ListState
        isPending={stock.isPending}
        isError={stock.isError}
        isEmpty={stock.data?.items.length === 0}
        emptyMessage="ไม่พบข้อมูลสต็อก"
      >
        <StockBalanceTable items={stock.data?.items ?? []} />
      </ListState>

      {stock.data && (
        <Pagination
          page={stock.data.page}
          pageSize={stock.data.pageSize}
          total={stock.data.total}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
