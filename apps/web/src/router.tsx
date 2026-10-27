import { createBrowserRouter } from 'react-router';
import { RequireAuth } from '@/components/require-auth';
import { HomePage } from '@/routes/home';
import { LoginPage } from '@/routes/login';
import { MasterDataPage } from '@/routes/master-data';
import { PurchaseOrdersPage } from '@/routes/purchase-orders';
import { RootLayout } from '@/routes/root-layout';
import { StockPage } from '@/routes/stock';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Everything below requires a signed-in user.
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'master-data', element: <MasterDataPage /> },
          { path: 'purchase-orders', element: <PurchaseOrdersPage /> },
          { path: 'stock', element: <StockPage /> },
        ],
      },
    ],
  },
]);
