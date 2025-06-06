import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/context/auth-store';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

// Input schema with string age before transformation
const completeProfileInputSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  zipCode: z.string().min(5, { message: 'Valid zip code is required' }),
  city: z.string().min(2, { message: 'City is required' }),
  age: z.string().min(1, { message: 'Age is required' }),
  language: z.enum(['en', 'es', 'pt']),
  locationPermission: z.boolean().default(false),
  notificationsEnabled: z.boolean().default(false),
});

// Output schema after transformation
const completeProfileSchema = completeProfileInputSchema.transform((data) => ({
  ...data,
  age: parseInt(data.age, 10),
})).refine(
  (data) => !isNaN(data.age) && data.age >= 12 && data.age <= 120,
  {
    message: 'Age must be between 12 and 120',
    path: ['age'],
  }
);

// Type for the form input values (before transformation)
type CompleteProfileInputValues = z.infer<typeof completeProfileInputSchema>;

// Type for the transformed values
type CompleteProfileValues = z.infer<typeof completeProfileSchema>;

export function CompleteProfilePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, updateProfile } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const form = useForm<CompleteProfileInputValues>({
    resolver: zodResolver(completeProfileInputSchema),
    defaultValues: {
      firstName: user?.displayName?.split(' ')[0] || '',
      lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
      zipCode: '',
      city: '',
      age: '',
      language: 'en',
      locationPermission: false,
      notificationsEnabled: false,
    },
  });
  
  const onSubmit: SubmitHandler<CompleteProfileInputValues> = async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert age to number
      const ageNumber = parseInt(data.age, 10);
      
      if (isNaN(ageNumber) || ageNumber < 12 || ageNumber > 120) {
        setError('Age must be between 12 and 120');
        setLoading(false);
        return;
      }
      
      await updateProfile({
        userId: user!.id,
        firstName: data.firstName,
        lastName: data.lastName,
        zipCode: data.zipCode,
        age: ageNumber,
        language: data.language,
        locationPermission: data.locationPermission,
        notificationsEnabled: data.notificationsEnabled,
      });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been completed successfully.',
      });
      
      navigate('/'); // Redirect to home page
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container max-w-md mx-auto py-8">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            We need a few more details to personalize your experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Preferred Language</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="en" id="language-en" />
                          <Label htmlFor="language-en">English</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="es" id="language-es" />
                          <Label htmlFor="language-es">Español</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pt" id="language-pt" />
                          <Label htmlFor="language-pt">Português</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="locationPermission"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Location Services</FormLabel>
                      <FormDescription>
                        Allow location tracking to find therapists near you
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notificationsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Notifications</FormLabel>
                      <FormDescription>
                        Receive reminders for check-ins and exercises
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Saving...' : 'Complete Profile'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Your information is protected and never shared without your permission
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}