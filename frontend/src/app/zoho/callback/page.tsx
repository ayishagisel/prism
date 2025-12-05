'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ZohoCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing OAuth callback...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
          setError('No authorization code received from Zoho. The user may have cancelled the authorization.');
          return;
        }

        setStatus('Exchanging authorization code for access token...');

        // The backend automatically handles the callback via /api/zoho/callback
        // We just need to redirect back to dashboard after a moment
        setStatus('Authorization successful! Redirecting to dashboard...');

        // Redirect back to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/agency/dashboard');
        }, 2000);
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        {error ? (
          <>
            <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>⚠️ Authorization Error</h1>
            <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
            <button
              onClick={() => router.push('/agency/dashboard')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Return to Dashboard
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}></div>
            </div>
            <h1 style={{ marginBottom: '16px', color: '#1f2937' }}>Connecting to Zoho</h1>
            <p style={{ color: '#666', marginBottom: '8px' }}>{status}</p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
