import { Inter } from 'next/font/google';
import './admin.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-admin', display: 'swap' });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={`admin-theme ${inter.variable}`}>{children}</div>;
}
