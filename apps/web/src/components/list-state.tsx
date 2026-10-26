import type { ReactNode } from 'react';

type ListStateProps = {
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  /** Thai message shown when the list is empty, e.g. "ยังไม่มีข้อมูลสาขา". */
  emptyMessage: string;
  children: ReactNode;
};

/**
 * Shared loading / empty / error states for every list in the app (ticket #3 convention).
 * Renders `children` only once data has loaded and is non-empty. Thai copy throughout.
 */
export function ListState({ isPending, isError, isEmpty, emptyMessage, children }: ListStateProps) {
  if (isPending) return <p className="text-sm text-muted-foreground">กำลังโหลด…</p>;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่
      </p>
    );
  }
  if (isEmpty) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  return <>{children}</>;
}
