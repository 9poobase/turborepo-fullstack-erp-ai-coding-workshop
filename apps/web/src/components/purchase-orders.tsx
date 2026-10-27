import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  CreatePurchaseOrderSchema,
  DEFAULT_PAGE_SIZE,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@erp/contracts';
import { ListState } from '@/components/list-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

type LineDraft = { sku: string; quantity: string; unitPrice: string };
type Draft = {
  id?: string;
  supplierCode: string;
  storeCode: string;
  expectedReceiptDate: string;
  lines: LineDraft[];
};

const emptyLine: LineDraft = { sku: '', quantity: '', unitPrice: '' };
const emptyDraft: Draft = {
  supplierCode: '',
  storeCode: '',
  expectedReceiptDate: '',
  lines: [emptyLine],
};

/** Fill a draft from an existing order so a purchasing officer can edit it. */
function draftFrom(order: PurchaseOrder): Draft {
  return {
    id: order.id,
    supplierCode: order.supplierCode,
    storeCode: order.storeCode,
    expectedReceiptDate: order.expectedReceiptDate,
    lines: order.lines.map((line) => ({
      sku: line.sku,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
    })),
  };
}

/** Build the contract input. A blank number becomes NaN so the schema reports it, not a silent 0. */
function toInput(draft: Draft) {
  const num = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));
  return {
    supplierCode: draft.supplierCode.trim(),
    storeCode: draft.storeCode.trim(),
    expectedReceiptDate: draft.expectedReceiptDate,
    lines: draft.lines.map((line) => ({
      sku: line.sku.trim(),
      quantity: num(line.quantity),
      unitPrice: num(line.unitPrice),
    })),
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

const statusLabels: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'ฉบับร่าง',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  PARTIALLY_RECEIVED: 'รับสินค้าบางส่วน',
  COMPLETED: 'เสร็จสิ้น',
  REJECTED: 'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิก',
};

const priceFormat = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Purchase orders: a list (newest-first, paginated) and, for purchasing officers, a form to draft
 * an order and to edit a draft. Checks use the contract schema, the same one the API enforces.
 */
export function PurchaseOrders() {
  const user = useCurrentUser();
  const canDraft = user?.role === 'PURCHASING_OFFICER';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);

  const orders = useQuery(
    orpc.purchaseOrders.list.queryOptions({ input: { page, pageSize: DEFAULT_PAGE_SIZE } }),
  );

  const onSuccess = () => {
    setDraft(emptyDraft);
    setFormError(null);
    void queryClient.invalidateQueries({ queryKey: orpc.purchaseOrders.key() });
  };
  const create = useMutation(orpc.purchaseOrders.create.mutationOptions({ onSuccess }));
  const update = useMutation(orpc.purchaseOrders.update.mutationOptions({ onSuccess }));
  const mutation = draft.id ? update : create;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.reset();
    update.reset();
    const parsed = CreatePurchaseOrderSchema.safeParse(toInput(draft));
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง');
      return;
    }
    setFormError(null);
    if (draft.id) update.mutate({ id: draft.id, ...parsed.data });
    else create.mutate(parsed.data);
  };

  const setLine = (index: number, patch: Partial<LineDraft>) =>
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  const addLine = () => setDraft((prev) => ({ ...prev, lines: [...prev.lines, emptyLine] }));
  const removeLine = (index: number) =>
    setDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  const reset = () => {
    setDraft(emptyDraft);
    setFormError(null);
    create.reset();
    update.reset();
  };

  const errorMessage = formError ?? (mutation.error ? thaiError(mutation.error) : null);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ใบสั่งซื้อ</h1>
        <p className="text-muted-foreground">ร่างและแก้ไขใบสั่งซื้อก่อนส่งขออนุมัติ</p>
      </div>

      {canDraft && (
        <form onSubmit={submit} className="space-y-4">
          <h2 className="text-lg font-semibold">
            {draft.id ? 'แก้ไขใบสั่งซื้อฉบับร่าง' : 'ร่างใบสั่งซื้อใหม่'}
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="po-supplier">ผู้จัดจำหน่าย</Label>
              <Input
                id="po-supplier"
                value={draft.supplierCode}
                onChange={(e) => setDraft({ ...draft, supplierCode: e.target.value })}
                placeholder="SUP01"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="po-store">สาขาปลายทาง</Label>
              <Input
                id="po-store"
                value={draft.storeCode}
                onChange={(e) => setDraft({ ...draft, storeCode: e.target.value })}
                placeholder="B01"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="po-date">วันที่คาดว่าจะได้รับสินค้า</Label>
              <Input
                id="po-date"
                type="date"
                value={draft.expectedReceiptDate}
                onChange={(e) => setDraft({ ...draft, expectedReceiptDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>รายการสินค้า</Label>
            {draft.lines.map((line, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`po-sku-${index}`} className="text-xs text-muted-foreground">
                    รหัสสินค้า (SKU) {index + 1}
                  </Label>
                  <Input
                    id={`po-sku-${index}`}
                    value={line.sku}
                    onChange={(e) => setLine(index, { sku: e.target.value })}
                    placeholder="SKU001"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`po-qty-${index}`} className="text-xs text-muted-foreground">
                    จำนวนที่สั่ง {index + 1}
                  </Label>
                  <Input
                    id={`po-qty-${index}`}
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => setLine(index, { quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`po-price-${index}`} className="text-xs text-muted-foreground">
                    ราคาซื้อต่อหน่วย (บาท) {index + 1}
                  </Label>
                  <Input
                    id={`po-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => setLine(index, { unitPrice: e.target.value })}
                    required
                  />
                </div>
                {draft.lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`ลบรายการที่ ${index + 1}`}
                    onClick={() => removeLine(index)}
                  >
                    ลบ
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={addLine}>
              + เพิ่มรายการสินค้า
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              {draft.id ? 'บันทึกการแก้ไข' : 'บันทึกฉบับร่าง'}
            </Button>
            {draft.id && (
              <Button type="button" variant="ghost" onClick={reset}>
                ยกเลิก
              </Button>
            )}
          </div>
          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
        </form>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">รายการใบสั่งซื้อ</h2>
        <ListState
          isPending={orders.isPending}
          isError={orders.isError}
          isEmpty={orders.data?.items.length === 0}
          emptyMessage="ยังไม่มีใบสั่งซื้อ"
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2">ผู้จัดจำหน่าย</th>
                <th className="py-2">สาขาปลายทาง</th>
                <th className="py-2">วันที่คาดว่าจะได้รับ</th>
                <th className="py-2">รายการสินค้า</th>
                <th className="py-2">สถานะ</th>
                {canDraft && <th className="py-2 text-right">การจัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {orders.data?.items.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="py-2">
                    {order.supplierCode} {order.supplierName}
                  </td>
                  <td className="py-2">
                    {order.storeCode} {order.storeName}
                  </td>
                  <td className="py-2">{order.expectedReceiptDate}</td>
                  <td className="py-2">
                    {order.lines
                      .map(
                        (line) =>
                          `${line.sku} × ${line.quantity} @ ${priceFormat.format(line.unitPrice)}`,
                      )
                      .join(', ')}
                  </td>
                  <td className="py-2">{statusLabels[order.status]}</td>
                  {canDraft && (
                    <td className="py-2 text-right">
                      {order.status === 'DRAFT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            reset();
                            setDraft(draftFrom(order));
                          }}
                        >
                          แก้ไข
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListState>

        {orders.data && (
          <Pagination
            page={orders.data.page}
            pageSize={orders.data.pageSize}
            total={orders.data.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </section>
  );
}
