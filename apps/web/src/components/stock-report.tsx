import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@erp/contracts';
import { ListState } from '@/components/list-state';
import { Pagination } from '@/components/pagination';
import { StockBalanceTable } from '@/components/stock-balance-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { orpc } from '@/lib/orpc';

type ReportKind = 'on-hand' | 'low-stock';

const REPORTS: { kind: ReportKind; label: string; emptyMessage: string }[] = [
  { kind: 'on-hand', label: 'สต็อกคงเหลือ', emptyMessage: 'ไม่พบข้อมูลสต็อก' },
  { kind: 'low-stock', label: 'สต็อกใกล้หมด', emptyMessage: 'ไม่พบสินค้าใกล้หมด' },
];

/**
 * Manager stock reports: stock-on-hand and low-stock, by store with a SKU/name search. Zero-stock
 * products stay visible when they match. Results paginate newest-first with the shared
 * loading/empty/error states.
 */
export function StockReport() {
  const [kind, setKind] = useState<ReportKind>('on-hand');
  const [q, setQ] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [page, setPage] = useState(1);

  const input = {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    q: q.trim() || undefined,
    storeCode: storeCode.trim() || undefined,
  };
  // Only the chosen report is requested.
  const onHand = useQuery({
    ...orpc.stock.onHand.queryOptions({ input }),
    enabled: kind === 'on-hand',
  });
  const lowStock = useQuery({
    ...orpc.stock.lowStock.queryOptions({ input }),
    enabled: kind === 'low-stock',
  });
  const report = kind === 'on-hand' ? onHand : lowStock;
  const { emptyMessage } = REPORTS.find((r) => r.kind === kind)!;

  // A new report, search term or store resets to the first page.
  const onKind = (value: ReportKind) => {
    setKind(value);
    setPage(1);
  };
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
      <h1 className="text-2xl font-bold tracking-tight">รายงานสต็อก</h1>

      <div className="flex gap-2">
        {REPORTS.map((r) => (
          <Button
            key={r.kind}
            type="button"
            variant={kind === r.kind ? 'default' : 'outline'}
            aria-pressed={kind === r.kind}
            onClick={() => onKind(r.kind)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="report-q">ค้นหา (SKU หรือชื่อสินค้า)</Label>
          <Input
            id="report-q"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="SKU001"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-store">สาขา</Label>
          <Input
            id="report-store"
            value={storeCode}
            onChange={(e) => onStore(e.target.value)}
            placeholder="B01"
          />
        </div>
      </div>

      <ListState
        isPending={report.isPending}
        isError={report.isError}
        isEmpty={report.data?.items.length === 0}
        emptyMessage={emptyMessage}
      >
        <StockBalanceTable items={report.data?.items ?? []} />
      </ListState>

      {report.data && (
        <Pagination
          page={report.data.page}
          pageSize={report.data.pageSize}
          total={report.data.total}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
