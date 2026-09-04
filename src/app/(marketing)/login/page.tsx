import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-12">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
