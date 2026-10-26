import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORPCError } from '@orpc/client';
import { useState } from 'react';
import { ListState } from '@/components/list-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/lib/auth';
import { orpc } from '@/lib/orpc';
import { useQuery } from '@tanstack/react-query';

type Draft = { id?: string; code: string; name: string };
const emptyDraft: Draft = { code: '', name: '' };

/** Extract the Thai message from an API error, or a generic fallback. */
function thaiError(error: unknown): string {
  if (error instanceof ORPCError) {
    const data = error.data as { messageTh?: string } | undefined;
    if (data?.messageTh) return data.messageTh;
  }
  return 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
}

/** Stores master data: list (newest-first, paginated) with a minimal admin create/edit form. */
export function StoresList() {
  const user = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const stores = useQuery(orpc.stores.list.queryOptions({ input: { page, pageSize: 20 } }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.stores.key() });
  const onSuccess = () => {
    setDraft(emptyDraft);
    void invalidate();
  };
  const create = useMutation(orpc.stores.create.mutationOptions({ onSuccess }));
  const update = useMutation(orpc.stores.update.mutationOptions({ onSuccess }));
  const mutation = draft.id ? update : create;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.id) update.mutate({ id: draft.id, code: draft.code, name: draft.name });
    else create.mutate({ code: draft.code, name: draft.name });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">สาขา</h2>

      {isAdmin && (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="store-code">รหัสสาขา</Label>
            <Input
              id="store-code"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="store-name">ชื่อสาขา</Label>
            <Input
              id="store-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {draft.id ? 'บันทึกการแก้ไข' : 'เพิ่มสาขา'}
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
        isPending={stores.isPending}
        isError={stores.isError}
        isEmpty={stores.data?.items.length === 0}
        emptyMessage="ยังไม่มีข้อมูลสาขา"
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2">รหัส</th>
              <th className="py-2">ชื่อ</th>
              {isAdmin && <th className="py-2 text-right">การจัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {stores.data?.items.map((store) => (
              <tr key={store.id} className="border-b">
                <td className="py-2 font-medium">{store.code}</td>
                <td className="py-2">{store.name}</td>
                {isAdmin && (
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraft({ id: store.id, code: store.code, name: store.name })}
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

      {stores.data && (
        <Pagination
          page={stores.data.page}
          pageSize={stores.data.pageSize}
          total={stores.data.total}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
