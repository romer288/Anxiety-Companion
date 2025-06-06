import { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { useAuthStore } from '../../context/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Sector
} from 'recharts';
import { useToast } from '../../hooks/use-toast';
import { AnxietySession } from '../../shared/schema';
import { Download, Share2, FileText, Mail } from 'lucide-react';

// Mock data - in real app, this would come from an API
const generateMockAnalytics = (userId: string, timeframe: string = 'week') => {
  // Generate random sessions for the dashboard
  const sessions: AnxietySession[] = [];
  
  // Determine date range based on timeframe
  const today = new Date();
  let startDate = new Date();
  
  if (timeframe === 'week') {
    startDate.setDate(today.getDate() - 7);
  } else if (timeframe === 'month') {
    startDate.setMonth(today.getMonth() - 1);
  } else if (timeframe === 'year') {
    startDate.setFullYear(today.getFullYear() - 1);
  }
  
  // Create sessions
  let currentDate = new Date(startDate);
  while (currentDate <= today) {
    // Not every day has a session
    if (Math.random() > 0.4) {
      // Create 1-3 sessions for this day
      const sessionsForDay = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < sessionsForDay; i++) {
        const preAnxietyLevel = Math.floor(Math.random() * 10) + 1;
        const postAnxietyLevel = Math.max(0, preAnxietyLevel - Math.floor(Math.random() * 6));
        
        const triggerCategories = [
          'social', 'health', 'work', 'family', 'financial', 
          'future', 'past_trauma', 'change', 'performance'
        ];
        
        const randomTrigger = triggerCategories[Math.floor(Math.random() * triggerCategories.length)];
        
        const interventionTypes = [
          'breathing', 'cognitive_reframing', 'grounding', 
          'mindfulness', 'positive_affirmation', 'progressive_relaxation'
        ];
        
        const randomIntervention = interventionTypes[Math.floor(Math.random() * interventionTypes.length)];
        
        const sessionDate = new Date(currentDate);
        sessionDate.setHours(
          8 + Math.floor(Math.random() * 12), // Between 8 AM and 8 PM
          Math.floor(Math.random() * 60)
        );
        
        sessions.push({
          id: Math.floor(Math.random() * 1000000),
          userId,
          startTime: sessionDate.toISOString(),
          endTime: (() => {
            const endDate = new Date(sessionDate);
            endDate.setMinutes(endDate.getMinutes() + 5 + Math.floor(Math.random() * 25));
            return endDate.toISOString();
          })(),
          language: 'en',
          stage: 'complete',
          triggerCategory: randomTrigger,
          triggerDescription: `Anxiety triggered by ${randomTrigger} situation`,
          preAnxietyLevel,
          intervention: `${randomIntervention} exercise`,
          interventionType: randomIntervention,
          postAnxietyLevel,
          notes: null
        });
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return sessions;
};

interface AnxietyAnalyticsProps {
  sharedWithTherapist?: boolean;
}

export function AnxietyAnalytics({ sharedWithTherapist = false }: AnxietyAnalyticsProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sessionsData, setSessionsData] = useState<AnxietySession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch session data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // In a real app, this would be an API call
        // const response = await fetch(`/api/anxiety-sessions?userId=${user?.id}&timeframe=${selectedTimeframe}`);
        // const data = await response.json();
        
        // For demo, generate mock data
        const mockData = generateMockAnalytics(user?.id || '1', selectedTimeframe);
        
        // Sort chronologically
        mockData.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        setSessionsData(mockData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load analytics data.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user?.id, selectedTimeframe, toast]);
  
  // Calculate statistics
  const totalSessions = sessionsData.length;
  const averagePreAnxiety = totalSessions 
    ? sessionsData.reduce((sum, session) => sum + (session.preAnxietyLevel || 0), 0) / totalSessions 
    : 0;
  const averagePostAnxiety = totalSessions 
    ? sessionsData.reduce((sum, session) => sum + (session.postAnxietyLevel || 0), 0) / totalSessions 
    : 0;
  const averageImprovement = averagePreAnxiety - averagePostAnxiety;
  const improvementPercentage = averagePreAnxiety > 0 
    ? Math.round((averageImprovement / averagePreAnxiety) * 100) 
    : 0;
  
  // Prepare data for charts
  const anxietyLevelData = sessionsData.map(session => ({
    date: format(new Date(session.startTime), 'MM/dd'),
    time: format(new Date(session.startTime), 'HH:mm'),
    pre: session.preAnxietyLevel,
    post: session.postAnxietyLevel,
    name: format(new Date(session.startTime), 'MMM dd, HH:mm')
  }));
  
  // Aggregate trigger categories
  const triggerCounts: Record<string, number> = {};
  sessionsData.forEach(session => {
    if (session.triggerCategory) {
      triggerCounts[session.triggerCategory] = (triggerCounts[session.triggerCategory] || 0) + 1;
    }
  });
  
  const triggerData = Object.entries(triggerCounts).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value
  }));
  
  // Intervention effectiveness
  const interventionData: Record<string, { count: number, totalImprovement: number }> = {};
  sessionsData.forEach(session => {
    if (session.interventionType && session.preAnxietyLevel !== null && session.postAnxietyLevel !== null) {
      if (!interventionData[session.interventionType]) {
        interventionData[session.interventionType] = { count: 0, totalImprovement: 0 };
      }
      
      interventionData[session.interventionType].count++;
      interventionData[session.interventionType].totalImprovement += 
        (session.preAnxietyLevel - session.postAnxietyLevel);
    }
  });
  
  const interventionEffectiveness = Object.entries(interventionData).map(([type, data]) => ({
    name: type.replace('_', ' '),
    effectiveness: data.count > 0 ? data.totalImprovement / data.count : 0,
    count: data.count
  }));
  
  // Sort by effectiveness
  interventionEffectiveness.sort((a, b) => b.effectiveness - a.effectiveness);
  
  // Handle report generation
  const generateReport = () => {
    toast({
      title: 'Report Generated',
      description: 'Your anxiety report has been generated and is ready to download.',
    });
  };
  
  // Share with therapist
  const shareWithTherapist = () => {
    toast({
      title: 'Report Shared',
      description: 'Your anxiety report has been shared with your therapist.',
    });
  };
  
  // Colors for charts
  const preAnxietyColor = '#f97316'; // Orange
  const postAnxietyColor = '#3b82f6'; // Blue
  const triggerColors = [
    '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', 
    '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#84cc16'
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Anxiety Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Track your anxiety patterns and see how different interventions have helped
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateReport}>
              <FileText className="h-4 w-4 mr-2" /> Generate Report
            </Button>
            
            {!sharedWithTherapist && (
              <Button variant="default" size="sm" onClick={shareWithTherapist}>
                <Share2 className="h-4 w-4 mr-2" /> Share with Therapist
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 h-64">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardHeader className="bg-muted/30 h-8" />
              <CardContent className="pt-6">
                <div className="h-32 bg-muted/30 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sessions</CardTitle>
                <CardDescription>Total tracked anxiety episodes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalSessions}</div>
                <p className="text-muted-foreground text-sm mt-2">
                  {selectedTimeframe === 'week' ? 'Past 7 days' : selectedTimeframe === 'month' ? 'Past 30 days' : 'Past 12 months'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Average Improvement</CardTitle>
                <CardDescription>Reduction in anxiety level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {averageImprovement.toFixed(1)} points
                </div>
                <p className="text-muted-foreground text-sm mt-2">
                  {improvementPercentage}% average reduction in anxiety
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Most Effective</CardTitle>
                <CardDescription>Best anxiety intervention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 capitalize">
                  {interventionEffectiveness[0]?.name || 'None'}
                </div>
                <p className="text-muted-foreground text-sm mt-2">
                  {interventionEffectiveness[0]
                    ? `${interventionEffectiveness[0].effectiveness.toFixed(1)} point average improvement`
                    : 'No interventions recorded yet'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts and Analysis */}
          <Tabs defaultValue="trends">
            <TabsList className="mb-4">
              <TabsTrigger value="trends">Anxiety Trends</TabsTrigger>
              <TabsTrigger value="triggers">Triggers</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="history">Session History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Anxiety Levels Over Time</CardTitle>
                  <CardDescription>
                    Before and after intervention levels over {selectedTimeframe}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {anxietyLevelData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={anxietyLevelData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="pre" 
                            name="Pre-Intervention" 
                            stroke={preAnxietyColor} 
                            strokeWidth={2}
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="post" 
                            name="Post-Intervention" 
                            stroke={postAnxietyColor} 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-muted-foreground">
                      No anxiety data available for this time period
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Anxiety Improvement</CardTitle>
                  <CardDescription>
                    How much each session reduced your anxiety
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {anxietyLevelData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={anxietyLevelData.map(d => ({
                            ...d,
                            improvement: (d.pre || 0) - (d.post || 0)
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="improvement" 
                            name="Anxiety Reduction" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-muted-foreground">
                      No improvement data available for this time period
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="triggers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Common Anxiety Triggers</CardTitle>
                  <CardDescription>
                    What most frequently causes your anxiety
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {triggerData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={triggerData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {triggerData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={triggerColors[index % triggerColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value} sessions`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-muted-foreground">
                      No trigger data available for this time period
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Trigger Analysis</CardTitle>
                  <CardDescription>
                    Anxiety levels by different triggers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {triggerData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(triggerCounts).map(([category, count]) => {
                            const relatedSessions = sessionsData.filter(
                              s => s.triggerCategory === category
                            );
                            
                            const avgPre = relatedSessions.reduce(
                              (sum, s) => sum + (s.preAnxietyLevel || 0), 
                              0
                            ) / relatedSessions.length;
                            
                            const avgPost = relatedSessions.reduce(
                              (sum, s) => sum + (s.postAnxietyLevel || 0), 
                              0
                            ) / relatedSessions.length;
                            
                            return {
                              name: category.replace('_', ' '),
                              avgPre,
                              avgPost,
                              count
                            };
                          })}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="avgPre" 
                            name="Average Pre-Anxiety" 
                            fill={preAnxietyColor} 
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="avgPost" 
                            name="Average Post-Anxiety" 
                            fill={postAnxietyColor} 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-muted-foreground">
                      No trigger data available for this time period
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="interventions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Most Effective Interventions</CardTitle>
                  <CardDescription>
                    Which techniques work best for you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {interventionEffectiveness.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={interventionEffectiveness}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" domain={[0, 10]} />
                          <YAxis type="category" dataKey="name" width={100} />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="effectiveness" 
                            name="Avg. Improvement" 
                            fill="#10b981" 
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-muted-foreground">
                      No intervention data available for this time period
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Intervention Frequency</CardTitle>
                  <CardDescription>
                    How often each technique has been used
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {interventionEffectiveness.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={interventionEffectiveness}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="count" 
                            name="Times Used" 
                            fill="#8b5cf6" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-muted-foreground">
                      No intervention data available for this time period
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Session History</CardTitle>
                  <CardDescription>
                    Record of your anxiety management sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsData.length > 0 ? (
                    <div className="border rounded-md">
                      <div className="grid grid-cols-5 font-medium p-3 border-b bg-muted/20">
                        <div>Date & Time</div>
                        <div>Trigger</div>
                        <div>Intervention</div>
                        <div className="text-center">Initial Level</div>
                        <div className="text-center">Final Level</div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {sessionsData.map((session, i) => (
                          <div 
                            key={session.id || i} 
                            className="grid grid-cols-5 p-3 border-b hover:bg-muted/10 transition-colors"
                          >
                            <div className="text-sm">
                              {format(new Date(session.startTime), 'MMM dd, yyyy')}
                              <br />
                              <span className="text-muted-foreground">
                                {format(new Date(session.startTime), 'h:mm a')}
                              </span>
                            </div>
                            <div className="capitalize text-sm">
                              {session.triggerCategory?.replace('_', ' ') || 'Not specified'}
                            </div>
                            <div className="capitalize text-sm">
                              {session.interventionType?.replace('_', ' ') || 'Not specified'}
                            </div>
                            <div className="text-center font-medium text-orange-600">
                              {session.preAnxietyLevel !== null ? session.preAnxietyLevel : '-'}/10
                            </div>
                            <div className="text-center font-medium text-blue-600">
                              {session.postAnxietyLevel !== null ? session.postAnxietyLevel : '-'}/10
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-muted-foreground">
                      No session history available for this time period
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Export Options</CardTitle>
                    <CardDescription>
                      Download or share your session history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Export as PDF Report
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Export as CSV Data
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Mail className="h-4 w-4 mr-2" />
                        Email to Therapist
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Calendar View</CardTitle>
                    <CardDescription>
                      See days with recorded sessions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={date => date && setSelectedDate(date)}
                      className="rounded-md border"
                      // Highlight days with sessions
                      modifiers={{
                        hasSessions: sessionsData.map(s => new Date(s.startTime))
                      }}
                      modifiersClassNames={{
                        hasSessions: "bg-primary/20 font-medium text-primary"
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}