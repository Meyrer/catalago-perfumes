import type { LucideIcon } from 'lucide-react';

export default function StatCard({ label, value, detail, help, icon: Icon }: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  help?: React.ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-icon"><Icon size={22} aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className={help ? 'admin-stat-label flex items-center gap-1' : 'admin-stat-label'}>{label}{help}</p>
        <p className="admin-stat-value">{value}</p>
        {detail && <p className="admin-stat-detail">{detail}</p>}
      </div>
    </div>
  );
}
