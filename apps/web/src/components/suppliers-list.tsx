import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ORPCError } from '@orpc/client';
import { useState } from 'react';
import { ListState } from '@/components/list-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

type Draft = { id?: string; code: string; name: string; contact: string };
const emptyDraft: Draft = { code: '', name: '', contact: '' };

/** Extract the Thai message from an API error, or a generic fallback. */
function thaiError(error: unknown): string {
  if (error instanceof ORPCError) {
    const data = error.data as { messageTh?: string } | undefined;
    if (data?.messageTh) return data.messageTh;
  }
  return 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
}

/** Suppliers master data: list (newest-first, paginated) with a minimal admin create/edit form. */
export function SuppliersList() {
  const user = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const suppliers = useQuery(orpc.suppliers.list.queryOptions({ input: { page, pageSize: 20 } }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.suppliers.key() });
  const onSuccess = () => {
    setDraft(emptyDraft);
    void invalidate();
  };
  const create = useMutation(orpc.suppliers.create.mutationOptions({ onSuccess }));
  const update = useMutation(orpc.suppliers.update.mutationOptions({ onSuccess }));
  const mutation = draft.id ? update : create;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const { id, ...fields } = draft;
    if (id) update.mutate({ id, ...fields });
    else create.mutate(fields);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">ผู้จัดจำหน่าย</h2>

      {isAdmin && (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="supplier-code">รหัสผู้จัดจำหน่าย</Label>
            <Input
              id="supplier-code"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="supplier-name">ชื่อ</Label>
            <Input
              id="supplier-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="supplier-contact">ข้อมูลติดต่อ</Label>
            <Input
              id="supplier-contact"
              value={draft.contact}
              onChange={(e) => setDraft({ ...draft, contact: e.target.value })}
              required
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {draft.id ? 'บันทึกการแก้ไข' : 'เพิ่มผู้จัดจำหน่าย'}
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
        isPending={suppliers.isPending}
        isError={suppliers.isError}
        isEmpty={suppliers.data?.items.length === 0}
        emptyMessage="ยังไม่มีข้อมูลผู้จัดจำหน่าย"
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2">รหัส</th>
              <th className="py-2">ชื่อ</th>
              <th className="py-2">ติดต่อ</th>
              {isAdmin && <th className="py-2 text-right">การจัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.data?.items.map((supplier) => (
              <tr key={supplier.id} className="border-b">
                <td className="py-2 font-medium">{supplier.code}</td>
                <td className="py-2">{supplier.name}</td>
                <td className="py-2">{supplier.contact}</td>
                {isAdmin && (
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraft({
                          id: supplier.id,
                          code: supplier.code,
                          name: supplier.name,
                          contact: supplier.contact,
                        })
                      }
                    >
                      แก้ไข
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </ListState>

      {suppliers.data && (
        <Pagination
          page={suppliers.data.page}
          pageSize={suppliers.data.pageSize}
          total={suppliers.data.total}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
