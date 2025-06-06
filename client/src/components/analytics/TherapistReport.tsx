import { useState } from 'react';
import { useAuthStore } from '../../context/auth-store';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Mail, Calendar as CalendarIcon, Share2 } from 'lucide-react';
import { format } from 'date-fns';

export function TherapistReport() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [shareAll, setShareAll] = useState(true);
  const [reportDetails, setReportDetails] = useState({
    timeframe: '30days',
    includeNotes: true,
    includeChat: false,
    therapistEmail: 'dr.smith@example.com', // In a real app, this would come from the profile
    additionalNotes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const hasTherapist = true; // For demo purposes
  
  const handleSendReport = async () => {
    setIsLoading(true);
    
    // In a real app, this would make an API call to send the report
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Report Shared',
      description: hasTherapist 
        ? 'Your anxiety report has been shared with your therapist.' 
        : 'Your anxiety report has been sent to the provided email address.',
    });
    
    setIsLoading(false);
  };
  
  const handleInputChange = (key: string, value: any) => {
    setReportDetails(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Therapist Report</h2>
        <p className="text-muted-foreground">
          Share your anxiety data with your therapist or mental health provider
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>
              Customize what information to include in your report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-timeframe">Time Period</Label>
              <Select 
                value={reportDetails.timeframe}
                onValueChange={(value) => handleInputChange('timeframe', value)}
              >
                <SelectTrigger id="report-timeframe">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Past 7 Days</SelectItem>
                  <SelectItem value="30days">Past 30 Days</SelectItem>
                  <SelectItem value="90days">Past 90 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportDetails.timeframe === 'custom' && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/10">
                <Label>Custom Date Range</Label>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>
                      {format(selectedDate, 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                </div>
              </div>
            )}
            
            <div className="grid gap-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-notes">Include Session Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    Share your personal notes from each session
                  </p>
                </div>
                <Switch
                  id="include-notes"
                  checked={reportDetails.includeNotes}
                  onCheckedChange={(value) => handleInputChange('includeNotes', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-chat">Include Chat Transcripts</Label>
                  <p className="text-sm text-muted-foreground">
                    Share your conversations with the AI
                  </p>
                </div>
                <Switch
                  id="include-chat"
                  checked={reportDetails.includeChat}
                  onCheckedChange={(value) => handleInputChange('includeChat', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="share-all">Share All Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Include all analytics and visualizations
                  </p>
                </div>
                <Switch
                  id="share-all"
                  checked={shareAll}
                  onCheckedChange={setShareAll}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Therapist Details</CardTitle>
            <CardDescription>
              {hasTherapist 
                ? 'Your therapist information is already saved' 
                : 'Provide your therapist\'s contact information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasTherapist && (
              <div className="space-y-2">
                <Label htmlFor="therapist-email">Therapist's Email</Label>
                <Input 
                  id="therapist-email"
                  placeholder="therapist@example.com"
                  type="email"
                  value={reportDetails.therapistEmail}
                  onChange={(e) => handleInputChange('therapistEmail', e.target.value)}
                />
              </div>
            )}
            
            <div className="space-y-2 pt-2">
              <Label htmlFor="additional-notes">Additional Notes for Therapist</Label>
              <Textarea
                id="additional-notes"
                placeholder="Is there anything specific you'd like your therapist to know?"
                rows={5}
                value={reportDetails.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
              />
            </div>
            
            {hasTherapist && (
              <div className="rounded-md border p-3 bg-blue-50 mt-4">
                <h4 className="font-medium text-blue-700">Your Therapist</h4>
                <div className="text-sm mt-2 text-blue-600">
                  <p>Dr. Emily Smith</p>
                  <p>Next appointment: June 12, 2025</p>
                  <p>Report will be sent to: dr.smith@example.com</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" disabled={isLoading}>
              Preview Report
            </Button>
            <Button 
              onClick={handleSendReport} 
              disabled={isLoading || (!hasTherapist && !reportDetails.therapistEmail)}
            >
              {isLoading ? 'Sending...' : 'Send Report'}
              {!isLoading && (hasTherapist ? <Share2 className="ml-2 h-4 w-4" /> : <Mail className="ml-2 h-4 w-4" />)}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>
            This is what your therapist will receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-6 bg-white">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">Anxiety Companion Report</h3>
              <p className="text-muted-foreground">
                {reportDetails.timeframe === '7days' ? 'Past 7 Days' : 
                 reportDetails.timeframe === '30days' ? 'Past 30 Days' : 
                 reportDetails.timeframe === '90days' ? 'Past 90 Days' : 
                 `Custom Period (${format(selectedDate, 'MM/dd/yyyy')})`}
              </p>
              <p className="text-sm mt-1">Generated for: {user?.displayName || 'User'}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="border rounded-md p-2">
                    <div className="text-2xl font-bold">15</div>
                    <div className="text-sm text-muted-foreground">Sessions</div>
                  </div>
                  <div className="border rounded-md p-2">
                    <div className="text-2xl font-bold text-green-600">38%</div>
                    <div className="text-sm text-muted-foreground">Improvement</div>
                  </div>
                  <div className="border rounded-md p-2">
                    <div className="text-2xl font-bold text-amber-600">7.5</div>
                    <div className="text-sm text-muted-foreground">Avg. Initial Level</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Trigger Patterns</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Most frequent trigger: <span className="font-medium">Social Situations (42%)</span></li>
                  <li>Highest anxiety: <span className="font-medium">Work Pressure (8.2/10)</span></li>
                  <li>Most improved: <span className="font-medium">Performance Anxiety (56% reduction)</span></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Effective Interventions</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Most effective: <span className="font-medium">Mindfulness (63% improvement)</span></li>
                  <li>Most frequently used: <span className="font-medium">Breathing Exercises (7 times)</span></li>
                  <li>Least effective: <span className="font-medium">Positive Affirmations (21% improvement)</span></li>
                </ul>
              </div>
              
              {reportDetails.additionalNotes && (
                <div className="mt-4 border-t pt-3">
                  <h4 className="font-medium mb-2">Patient Notes</h4>
                  <p className="text-sm italic">"{reportDetails.additionalNotes}"</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}