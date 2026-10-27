import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DEFAULT_PAGE_SIZE, type Product } from '@erp/contracts';
import { ListState } from '@/components/list-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

type ThresholdDraft = { storeCode: string; threshold: string };
type Draft = {
  id?: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  sellingPrice: string;
  active: boolean;
  thresholds: ThresholdDraft[];
};

const emptyDraft: Draft = {
  sku: '',
  name: '',
  category: '',
  unit: '',
  sellingPrice: '',
  active: true,
  thresholds: [{ storeCode: '', threshold: '' }],
};

/** Fill a draft from an existing product, keeping one editable row per configured store threshold. */
function draftFrom(product: Product): Draft {
  const thresholds =
    product.thresholds.length > 0
      ? product.thresholds.map((t) => ({ storeCode: t.storeCode, threshold: String(t.threshold) }))
      : [{ storeCode: '', threshold: '' }];
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    sellingPrice: String(product.sellingPrice),
    active: product.active,
    thresholds,
  };
}

/** Build the contract input, keeping only fully filled per-store threshold rows. */
function toInput(draft: Draft) {
  const thresholds = draft.thresholds
    .filter((t) => t.storeCode.trim() && t.threshold.trim())
    .map((t) => ({ storeCode: t.storeCode.trim(), threshold: Number(t.threshold) }));
  return {
    sku: draft.sku,
    name: draft.name,
    category: draft.category,
    unit: draft.unit,
    sellingPrice: Number(draft.sellingPrice),
    active: draft.active,
    thresholds,
  };
}

/** Extract the Thai message from an API error, or a generic fallback. */
function thaiError(error: unknown): string {
  if (error instanceof ORPCError) {
    const data = error.data as { messageTh?: string } | undefined;
    if (data?.messageTh) return data.messageTh;
  }
  return 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
}

const priceFormat = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 });

/** Products master data: list (newest-first, paginated) with a minimal admin create/edit form. */
export function ProductsList() {
  const user = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const products = useQuery(
    orpc.products.list.queryOptions({ input: { page, pageSize: DEFAULT_PAGE_SIZE } }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.products.key() });
  const onSuccess = () => {
    setDraft(emptyDraft);
    void invalidate();
  };
  const create = useMutation(orpc.products.create.mutationOptions({ onSuccess }));
  const update = useMutation(orpc.products.update.mutationOptions({ onSuccess }));
  const mutation = draft.id ? update : create;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const input = toInput(draft);
    if (draft.id) update.mutate({ id: draft.id, ...input });
    else create.mutate(input);
  };

  const setThreshold = (index: number, patch: Partial<ThresholdDraft>) =>
    setDraft((prev) => ({
      ...prev,
      thresholds: prev.thresholds.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  const addThreshold = () =>
    setDraft((prev) => ({
      ...prev,
      thresholds: [...prev.thresholds, { storeCode: '', threshold: '' }],
    }));
  const removeThreshold = (index: number) =>
    setDraft((prev) => ({
      ...prev,
      thresholds: prev.thresholds.filter((_, i) => i !== index),
    }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">สินค้า</h2>

      {isAdmin && (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="product-sku">รหัสสินค้า (SKU)</Label>
            <Input
              id="product-sku"
              value={draft.sku}
              onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="product-name">ชื่อ</Label>
            <Input
              id="product-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="product-category">หมวดหมู่</Label>
            <Input
              id="product-category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="product-unit">หน่วย</Label>
            <Input
              id="product-unit"
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="product-price">ราคาขาย (บาท)</Label>
            <Input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              value={draft.sellingPrice}
              onChange={(e) => setDraft({ ...draft, sellingPrice: e.target.value })}
              required
            />
          </div>
          <div className="w-full space-y-2">
            <Label>จุดสั่งซื้อซ้ำต่อสาขา</Label>
            {draft.thresholds.map((row, index) => (
              <div key={index} className="flex items-end gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor={`product-store-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    สาขา
                  </Label>
                  <Input
                    id={`product-store-${index}`}
                    aria-label={`สาขา ${index + 1}`}
                    value={row.storeCode}
                    onChange={(e) => setThreshold(index, { storeCode: e.target.value })}
                    placeholder="B01"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={`product-threshold-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    จุดสั่งซื้อซ้ำ
                  </Label>
                  <Input
                    id={`product-threshold-${index}`}
                    aria-label={`จุดสั่งซื้อซ้ำ ${index + 1}`}
                    type="number"
                    min="0"
                    step="1"
                    value={row.threshold}
                    onChange={(e) => setThreshold(index, { threshold: e.target.value })}
                  />
                </div>
                {draft.thresholds.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeThreshold(index)}
                  >
                    ลบ
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={addThreshold}>
              + เพิ่มสาขา
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            ใช้งาน
          </label>
          <Button type="submit" disabled={mutation.isPending}>
            {draft.id ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
          </Button>
          {draft.id && (
            <Button type="button" variant="ghost" onClick={() => setDraft(emptyDraft)}>
              ยกเลิก
            </Button>
          )}
          {mutation.error && (
            <p role="alert" className="w-full text-sm text-destructive">
              {thaiError(mutation.error)}
            </p>
          )}
        </form>
      )}

      <ListState
        isPending={products.isPending}
        isError={products.isError}
        isEmpty={products.data?.items.length === 0}
        emptyMessage="ยังไม่มีข้อมูลสินค้า"
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2">SKU</th>
              <th className="py-2">ชื่อ</th>
              <th className="py-2">หมวดหมู่</th>
              <th className="py-2">หน่วย</th>
              <th className="py-2 text-right">ราคาขาย</th>
              <th className="py-2">สถานะ</th>
              {isAdmin && <th className="py-2 text-right">การจัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {products.data?.items.map((product) => (
              <tr key={product.id} className="border-b">
                <td className="py-2 font-medium">{product.sku}</td>
                <td className="py-2">{product.name}</td>
                <td className="py-2">{product.category}</td>
                <td className="py-2">{product.unit}</td>
                <td className="py-2 text-right">{priceFormat.format(product.sellingPrice)}</td>
                <td className="py-2">
                  {product.active ? (
                    <span className="text-muted-foreground">ใช้งาน</span>
                  ) : (
                    <span className="text-destructive">ปิดการใช้งาน</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDraft(draftFrom(product))}>
                      แก้ไข
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </ListState>

      {products.data && (
        <Pagination
          page={products.data.page}
          pageSize={products.data.pageSize}
          total={products.data.total}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
