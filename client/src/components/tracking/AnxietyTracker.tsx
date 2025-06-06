import { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { AnxietySession } from '../../shared/schema';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';

const triggerOptions = [
  { value: 'social', label: 'Social situations' },
  { value: 'health', label: 'Health concerns' },
  { value: 'work', label: 'Work or school pressure' },
  { value: 'family', label: 'Family issues' },
  { value: 'financial', label: 'Financial concerns' },
  { value: 'future', label: 'Future uncertainty' },
  { value: 'past_trauma', label: 'Past trauma' },
  { value: 'change', label: 'Change or transitions' },
  { value: 'performance', label: 'Performance anxiety' },
  { value: 'other', label: 'Other' }
];

export function AnxietyTracker() {
  const { user, currentSession, updateSession, startNewSession, endCurrentSession } = useSession();
  const { toast } = useToast();
  
  const [anxietyLevel, setAnxietyLevel] = useState<number>(currentSession?.preAnxietyLevel || 0);
  const [triggerCategory, setTriggerCategory] = useState<string | null>(currentSession?.triggerCategory || null);
  const [triggerDescription, setTriggerDescription] = useState<string>(currentSession?.triggerDescription || '');
  const [notes, setNotes] = useState<string>(currentSession?.notes || '');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      await startNewSession(user?.id || '1'); // Default to '1' if no user ID
      toast({
        title: 'Session started',
        description: 'You can now track your anxiety level.',
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEndSession = async () => {
    setIsLoading(true);
    try {
      await endCurrentSession();
      toast({
        title: 'Session ended',
        description: 'Your anxiety tracking session has been saved.',
      });
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: 'Error',
        description: 'Failed to end session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // If no session exists, create one first
      let sessionToUpdate = currentSession;
      if (!sessionToUpdate?.id) {
        sessionToUpdate = await startNewSession(user?.id || '1');
      }
      
      // Update the session with current values
      await updateSession({
        ...sessionToUpdate,
        preAnxietyLevel: anxietyLevel,
        triggerCategory,
        triggerDescription,
        notes
      });
      
      toast({
        title: 'Progress saved',
        description: 'Your anxiety tracking data has been updated.',
      });
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your progress. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anxiety Tracker</CardTitle>
          <CardDescription>
            Track your anxiety levels and identify triggers to better manage your mental health.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Anxiety Level Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="anxiety-level">Current Anxiety Level</Label>
              <span className="text-right font-medium">{anxietyLevel}/10</span>
            </div>
            <Slider
              id="anxiety-level"
              min={0}
              max={10}
              step={1}
              value={[anxietyLevel]}
              onValueChange={(value) => setAnxietyLevel(value[0])}
              aria-label="Anxiety Level"
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>None</span>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
              <span>Extreme</span>
            </div>
          </div>
          
          {/* Trigger Selection */}
          <div className="space-y-2">
            <Label htmlFor="trigger-category">What triggered your anxiety?</Label>
            <Select 
              value={triggerCategory || ''} 
              onValueChange={setTriggerCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a trigger category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {triggerOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Trigger Description */}
          <div className="space-y-2">
            <Label htmlFor="trigger-description">Describe the situation</Label>
            <Textarea
              id="trigger-description"
              placeholder="What was happening when you felt anxious?"
              value={triggerDescription}
              onChange={(e) => setTriggerDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other thoughts or feelings you want to record?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {currentSession?.id ? (
            <>
              <Button variant="outline" onClick={handleEndSession} disabled={isLoading}>
                End Session
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                Save Progress
              </Button>
            </>
          ) : (
            <Button onClick={handleStartSession} disabled={isLoading} className="w-full">
              Start Tracking
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* History will be added here in a future update */}
    </div>
  );
}