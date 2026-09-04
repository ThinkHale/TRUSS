import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Get started' };

export default function SignupPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-12">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
