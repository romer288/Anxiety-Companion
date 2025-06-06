import { useState } from 'react';
import { useAuthStore } from '@/context/auth-store';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Star, Phone, Mail, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Sample therapist data (would be fetched from API in production)
const mockTherapists = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    specialty: 'Cognitive Behavioral Therapy',
    rating: 4.9,
    distance: 2.3,
    address: '123 Therapy Lane, Boston, MA',
    phone: '(555) 123-4567',
    email: 'sarah.johnson@example.com',
    bio: 'Specializing in anxiety disorders with over 15 years of experience helping patients develop coping mechanisms through CBT techniques.',
    acceptingNewPatients: true,
    insuranceAccepted: ['Blue Cross', 'Aetna', 'Cigna'],
    imageUrl: 'https://randomuser.me/api/portraits/women/45.jpg'
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    specialty: 'Mindfulness-Based Therapy',
    rating: 4.7,
    distance: 3.8,
    address: '456 Wellness Blvd, Boston, MA',
    phone: '(555) 987-6543',
    email: 'michael.chen@example.com',
    bio: 'Integrating mindfulness techniques with traditional therapy approaches to help clients manage anxiety in the moment and build long-term resilience.',
    acceptingNewPatients: true,
    insuranceAccepted: ['Medicare', 'Cigna', 'Harvard Pilgrim'],
    imageUrl: 'https://randomuser.me/api/portraits/men/22.jpg'
  },
  {
    id: '3',
    name: 'Dr. Lisa Rodriguez',
    specialty: 'Acceptance and Commitment Therapy',
    rating: 4.8,
    distance: 5.1,
    address: '789 Healing Way, Cambridge, MA',
    phone: '(555) 456-7890',
    email: 'lisa.rodriguez@example.com',
    bio: 'Helping clients develop psychological flexibility through acceptance and commitment therapy, with special focus on anxiety and stress management.',
    acceptingNewPatients: false,
    insuranceAccepted: ['Blue Cross', 'UnitedHealthcare', 'Tufts'],
    imageUrl: 'https://randomuser.me/api/portraits/women/33.jpg'
  }
];

export default function TherapistDashboard() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [zipCode, setZipCode] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [therapists, setTherapists] = useState(mockTherapists);
  const [showAllTherapists, setShowAllTherapists] = useState(true);
  
  const handleSearch = () => {
    setIsSearching(true);
    
    // Simulate API request delay
    setTimeout(() => {
      // In a real app, we would filter from actual API data
      // For demo, we're just pretending to filter the mock data
      let filtered = mockTherapists;
      
      if (specialty) {
        // This would be a real filter in production
        toast({
          title: 'Filtering by specialty',
          description: `Showing therapists specializing in ${specialty}`,
        });
      }
      
      if (zipCode) {
        toast({
          title: 'Location search',
          description: `Showing therapists near ${zipCode}`,
        });
      }
      
      setTherapists(filtered);
      setShowAllTherapists(false);
      setIsSearching(false);
    }, 1000);
  };
  
  const handleRequestAppointment = (therapistId: string, therapistName: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to request an appointment',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Appointment requested',
      description: `Your request has been sent to ${therapistName}. They will contact you shortly.`,
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find a Therapist</CardTitle>
          <CardDescription>
            Connect with licensed therapists specializing in anxiety management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zip-code">Your ZIP Code</Label>
              <Input
                id="zip-code"
                placeholder="Enter ZIP code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger id="specialty">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cbt">Cognitive Behavioral Therapy</SelectItem>
                  <SelectItem value="mindfulness">Mindfulness-Based Therapy</SelectItem>
                  <SelectItem value="act">Acceptance and Commitment Therapy</SelectItem>
                  <SelectItem value="psychodynamic">Psychodynamic Therapy</SelectItem>
                  <SelectItem value="emdr">EMDR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSearch} disabled={isSearching} className="w-full">
            {isSearching ? 'Searching...' : 'Search Therapists'}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Therapist Results */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {showAllTherapists ? 'Recommended Therapists' : 'Search Results'}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {therapists.map((therapist) => (
            <Card key={therapist.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={therapist.imageUrl} 
                      alt={therapist.name} 
                      className="h-12 w-12 rounded-full border object-cover"
                    />
                    <div>
                      <CardTitle className="text-lg">{therapist.name}</CardTitle>
                      <CardDescription>{therapist.specialty}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center text-yellow-500">
                    <Star className="fill-yellow-500 stroke-yellow-500 h-4 w-4" />
                    <span className="ml-1 text-sm">{therapist.rating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <MapPin className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {therapist.address} ({therapist.distance} miles away)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 shrink-0" />
                    <span>{therapist.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 shrink-0" />
                    <span>{therapist.email}</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm line-clamp-3">{therapist.bio}</p>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {therapist.insuranceAccepted.map((insurance) => (
                    <span 
                      key={insurance} 
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                    >
                      {insurance}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <div className="text-xs font-medium">
                  {therapist.acceptingNewPatients ? (
                    <span className="text-green-600">Accepting new patients</span>
                  ) : (
                    <span className="text-red-600">Not accepting new patients</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`https://maps.google.com/?q=${therapist.address}`} target="_blank" rel="noopener noreferrer">
                      <MapPin className="mr-2 h-4 w-4" />
                      Map
                    </a>
                  </Button>
                  <Button 
                    size="sm" 
                    disabled={!therapist.acceptingNewPatients}
                    onClick={() => handleRequestAppointment(therapist.id, therapist.name)}
                  >
                    Request Appointment
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}