import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/context/auth-store';

export function ProfilePage() {
  const { user, profile } = useAuthStore();
  
  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Profile'} 
                  className="h-32 w-32 rounded-full object-cover border-4 border-primary/20"
                />
              ) : (
                <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center text-4xl font-bold">
                  {user?.displayName?.[0] || user?.email?.[0] || '?'}
                </div>
              )}
              
              <div className="mt-4 text-center">
                <h3 className="text-xl font-semibold">
                  {user?.displayName || 'Anonymous User'}
                </h3>
                <p className="text-muted-foreground">{user?.email || ''}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>
                Your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Display Name</h3>
                  <p>{user?.displayName || 'Not set'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{user?.email || 'Not set'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Preferred Language</h3>
                  <p>
                    {profile?.language === 'en' && 'English'}
                    {profile?.language === 'es' && 'Español'}
                    {profile?.language === 'pt' && 'Português'}
                    {!profile?.language && 'English (Default)'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Account Created</h3>
                  <p>May 11, 2025</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}