'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type === 'recovery') {
      router.replace('/auth?view=update_password');
    } else {
      router.replace('/dashboard');
    }
  }, [router]);

  return null;
}
