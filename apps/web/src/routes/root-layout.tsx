import { Link, Outlet } from 'react-router';
import { UserMenu } from '@/components/user-menu';

export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 font-semibold">
          <nav className="flex items-center gap-4">
            <Link to="/">ERP Workshop</Link>
            <Link
              to="/master-data"
              className="text-sm font-normal text-muted-foreground hover:text-foreground"
            >
              ข้อมูลหลัก
            </Link>
            <Link
              to="/purchase-orders"
              className="text-sm font-normal text-muted-foreground hover:text-foreground"
            >
              ใบสั่งซื้อ
            </Link>
            <Link
              to="/stock"
              className="text-sm font-normal text-muted-foreground hover:text-foreground"
            >
              ค้นหาสต็อก
            </Link>
          </nav>
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
