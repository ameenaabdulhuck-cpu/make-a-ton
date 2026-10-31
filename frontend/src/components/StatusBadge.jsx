const TONES = {
  success: ['Active', 'Accepted', 'Paid', 'Available'],
  warning: ['Pending', 'Partially Paid', 'Paused', 'Unpaid', 'Manual'],
  error: ['Rejected', 'Overdue', 'Expired', 'Closed', 'Inactive'],
};

function toneFor(status) {
  const match = Object.entries(TONES).find(([, statuses]) => statuses.includes(status));
  return match ? match[0] : 'neutral';
}

export default function StatusBadge({ status }) {
  const tone = toneFor(status);
  return <span className={`badge badge-${tone}`}>{status}</span>;
}
