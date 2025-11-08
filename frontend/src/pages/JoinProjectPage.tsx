import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { collaborationApi } from '@/lib/api/collaboration';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function JoinProjectPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const joinProject = async () => {
      if (!token) {
        setError('Invalid share link');
        setIsJoining(false);
        return;
      }

      try {
        const response = await collaborationApi.joinViaShareLink(token);
        toast.success('Successfully joined project!');
        navigate(`/project/${response.project_id}`);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.detail || 'Failed to join project';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsJoining(false);
      }
    };

    void joinProject();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isJoining ? 'Joining Project...' : error ? 'Join Failed' : 'Joined Successfully'}
          </CardTitle>
          <CardDescription>
            {isJoining
              ? 'Please wait while we add you to the project'
              : error
              ? 'There was a problem joining the project'
              : 'Redirecting to project...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {isJoining && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
          {error && (
            <div className="w-full space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button
                onClick={() => navigate('/project')}
                variant="outline"
                className="w-full"
              >
                Go to My Projects
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

