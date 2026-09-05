import type { Metadata } from 'next';
import Link from 'next/link';
import { NewOrgForm } from '@/components/admin/NewOrgForm';

export const metadata: Metadata = { title: 'New company' };

export default function AdminNewOrg() {
  return (
    <div className="admin-page">
      <p className="admin-crumb">
        <Link href="/admin/orgs">← Companies</Link>
      </p>

      <h1>New company</h1>
      <p className="admin-sub">
        Creates the tenant and its context in one step. Nobody belongs to it yet — add their
        people on the company page once it exists.
      </p>

      <NewOrgForm />
    </div>
  );
}
