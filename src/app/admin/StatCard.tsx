import type { LucideIcon } from 'lucide-react';

export default function StatCard({ label, value, detail, icon: Icon }: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-icon"><Icon size={22} aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="admin-stat-label">{label}</p>
        <p className="admin-stat-value">{value}</p>
        {detail && <p className="admin-stat-detail">{detail}</p>}
      </div>
    </div>
  );
}
