import type { StockBalance } from '@erp/contracts';

/** The balances table shared by the stock search and the stock reports. */
export function StockBalanceTable({ items }: { items: StockBalance[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="py-2">SKU</th>
          <th className="py-2">ชื่อสินค้า</th>
          <th className="py-2">สาขา</th>
          <th className="py-2 text-right">คงเหลือ</th>
          <th className="py-2">หน่วย</th>
          <th className="py-2 text-right">จุดสั่งซื้อซ้ำ</th>
          <th className="py-2">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.productId}-${item.storeCode}`} className="border-b">
            <td className="py-2 font-medium">{item.sku}</td>
            <td className="py-2">{item.productName}</td>
            <td className="py-2">{item.storeCode}</td>
            <td className="py-2 text-right">{item.quantity}</td>
            <td className="py-2">{item.unit}</td>
            <td className="py-2 text-right">{item.threshold ?? '—'}</td>
            <td className="py-2">
              {item.lowStock ? (
                <span className="text-destructive">ใกล้หมด</span>
              ) : (
                <span className="text-muted-foreground">ปกติ</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
