import { useData } from '../context/DataContext';
import { formatDate, formatMoney, getQuotationStatus } from '../utils/billing';
import StatusBadge from './StatusBadge';

export default function QuotationDetail({ quotation, showCustomer = true, showStaff = true }) {
  const { products, plans, customers, staff } = useData();
  const product = products.find((item) => item.id === quotation.productId);
  const plan = plans.find((item) => item.id === quotation.planId);
  const customer = customers.find((item) => item.id === quotation.customerId);
  const member = staff.find((item) => item.id === quotation.staffId);
  const variants = (product?.variants || []).filter((variant) => quotation.variantIds.includes(variant.id));
  const status = getQuotationStatus(quotation);

  return (
    <div className="printable quotation-doc">
      <div className="card-header">
        <div>
          <h2>Quotation {quotation.number}</h2>
          <p className="text-muted">Created {formatDate(quotation.createdAt)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="detail-list">
        {showCustomer && customer && (
          <div className="detail-item">
            <span>Customer</span>
            <strong>{customer.businessName}</strong>
            <div className="text-muted">{customer.name}</div>
          </div>
        )}
        {showStaff && member && (
          <div className="detail-item">
            <span>Prepared by</span>
            <strong>{member.name}</strong>
          </div>
        )}
        <div className="detail-item">
          <span>Valid until</span>
          <strong>{formatDate(quotation.validUntil)}</strong>
        </div>
        <div className="detail-item">
          <span>Payment terms</span>
          <strong>{quotation.paymentTerms}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Plan</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="primary-cell">
                {product?.name}
                <div className="text-muted">{variants.map((variant) => variant.name).join(', ') || 'Standard'}</div>
              </td>
              <td>
                {plan?.name}
                <div className="text-muted">{plan?.frequency} billing</div>
              </td>
              <td className="num">{quotation.quantity}</td>
              <td className="num money">{formatMoney(quotation.unitPrice)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary-box">
        <div className="summary-row">
          <span>Subtotal</span>
          <span className="money">{formatMoney(quotation.subtotal)}</span>
        </div>
        <div className="summary-row">
          <span>Discount</span>
          <span className="money">-{formatMoney(quotation.discountAmount)}</span>
        </div>
        <div className="summary-row">
          <span>
            {quotation.taxName} ({quotation.taxRate}%)
          </span>
          <span className="money">{formatMoney(quotation.taxAmount)}</span>
        </div>
        <div className="summary-row total">
          <span>Total per billing cycle</span>
          <span className="money">{formatMoney(quotation.total)}</span>
        </div>
      </div>
    </div>
  );
}
