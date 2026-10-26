import { StoresList } from '@/components/stores-list';
import { SuppliersList } from '@/components/suppliers-list';

/** Master data for stores and suppliers. Admins can create and edit; everyone can view. */
export function MasterDataPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ข้อมูลหลัก</h1>
        <p className="text-muted-foreground">จัดการข้อมูลสาขาและผู้จัดจำหน่าย</p>
      </div>
      <StoresList />
      <SuppliersList />
    </div>
  );
}
