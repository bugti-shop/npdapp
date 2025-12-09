import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleCalendarAuth } from '@/utils/googleCalendarAuth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = () => {
      try {
        // Check for error in URL params
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
          setErrorMessage(error === 'access_denied' 
            ? 'Access was denied. Please try again and allow access to your calendar.'
            : `Authentication error: ${error}`
          );
          return;
        }

        // Try to extract token from hash (implicit flow)
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const expiresIn = params.get('expires_in');
          const tokenError = params.get('error');

          if (tokenError) {
            setStatus('error');
            setErrorMessage(`Authentication failed: ${tokenError}`);
            return;
          }

          if (accessToken && expiresIn) {
            // Store the token
            googleCalendarAuth.setAccessToken(accessToken, parseInt(expiresIn));
            googleCalendarAuth.setEnabled(true);
            
            setStatus('success');
            
            // Redirect after a short delay to show success message
            setTimeout(() => {
              // Determine where to redirect based on stored preference
              const returnTo = localStorage.getItem('googleAuthReturnTo') || '/settings';
              localStorage.removeItem('googleAuthReturnTo');
              navigate(returnTo, { replace: true });
            }, 1500);
            return;
          }
        }

        // No valid token found
        setStatus('error');
        setErrorMessage('No authentication token received. Please try again.');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred during authentication.');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  const handleRetry = () => {
    const authUrl = googleCalendarAuth.getAuthUrl();
    window.location.href = authUrl;
  };

  const handleGoBack = () => {
    const returnTo = localStorage.getItem('googleAuthReturnTo') || '/settings';
    localStorage.removeItem('googleAuthReturnTo');
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Connecting to Google Calendar</h1>
              <p className="text-muted-foreground mt-2">Please wait while we complete the authentication...</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 dark:bg-green-950 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">Successfully Connected!</h1>
              <p className="text-muted-foreground mt-2">Redirecting you back to settings...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-red-100 dark:bg-red-950 rounded-full">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-red-600 dark:text-red-400">Connection Failed</h1>
              <p className="text-muted-foreground mt-2">{errorMessage}</p>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={handleGoBack} className="w-full">
                Go Back to Settings
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthCallback;