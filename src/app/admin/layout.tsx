import type { Metadata } from 'next';
import { AdminApp } from '@/components/admin/AdminApp';
import './admin.css';

export const metadata: Metadata = {
  title: { default: 'CMS', template: '%s · CMS' },
  robots: { index: false, follow: false },
};

/* The CMS admin. Everything here runs in the browser: it signs in with Supabase Auth and talks to
   the CMS API (cms/ in this repository), which checks that the user is an admin. */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminApp>{children}</AdminApp>;
}
