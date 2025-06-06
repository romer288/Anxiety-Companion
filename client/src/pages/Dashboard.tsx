import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { format } from "date-fns";
import { AnxietySession } from "@/lib/types";

export default function Dashboard() {
  const { userId } = useSession();
  const [timeFrame, setTimeFrame] = useState<"week" | "month" | "year">("week");

  const { data: sessions, isLoading } = useQuery<AnxietySession[]>({
    queryKey: ["/api/sessions", userId],
    enabled: !!userId,
  });

  // Format data for charts
  const formatSessionData = () => {
    if (!sessions || sessions.length === 0) return [];

    // Sort sessions by date
    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Map to chart format
    return sortedSessions.map((session) => ({
      date: format(new Date(session.startTime), "MMM dd"),
      before: session.preAnxietyLevel || 0,
      after: session.postAnxietyLevel || 0,
      reduction: session.preAnxietyLevel && session.postAnxietyLevel 
        ? session.preAnxietyLevel - session.postAnxietyLevel 
        : 0,
      trigger: session.triggerCategory || "Unknown",
      intervention: session.interventionType || "Unknown",
    }));
  };

  const chartData = formatSessionData();

  // Calculate statistics
  const calculateStats = () => {
    if (!sessions || sessions.length === 0) {
      return {
        avgReduction: 0,
        totalSessions: 0,
        mostCommonTrigger: "None",
        mostEffectiveTechnique: "None",
      };
    }

    // Total sessions
    const totalSessions = sessions.length;

    // Calculate average anxiety reduction
    let totalReduction = 0;
    let completedSessions = 0;

    sessions.forEach((session) => {
      if (session.preAnxietyLevel !== null && session.postAnxietyLevel !== null) {
        totalReduction += session.preAnxietyLevel - session.postAnxietyLevel;
        completedSessions++;
      }
    });

    const avgReduction = completedSessions > 0 
      ? (totalReduction / completedSessions).toFixed(1) 
      : 0;

    // Find most common trigger
    const triggerCounts: Record<string, number> = {};
    sessions.forEach((session) => {
      if (session.triggerCategory) {
        triggerCounts[session.triggerCategory] = (triggerCounts[session.triggerCategory] || 0) + 1;
      }
    });

    const mostCommonTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    // Find most effective technique
    const techniques: Record<string, { count: number; totalReduction: number }> = {};
    
    sessions.forEach((session) => {
      if (
        session.interventionType && 
        session.preAnxietyLevel !== null && 
        session.postAnxietyLevel !== null
      ) {
        if (!techniques[session.interventionType]) {
          techniques[session.interventionType] = { count: 0, totalReduction: 0 };
        }
        
        techniques[session.interventionType].count += 1;
        techniques[session.interventionType].totalReduction += 
          session.preAnxietyLevel - session.postAnxietyLevel;
      }
    });

    let mostEffectiveTechnique = "None";
    let bestAvgReduction = 0;

    Object.entries(techniques).forEach(([technique, data]) => {
      const avgTechniqueReduction = data.totalReduction / data.count;
      if (avgTechniqueReduction > bestAvgReduction) {
        bestAvgReduction = avgTechniqueReduction;
        mostEffectiveTechnique = technique;
      }
    });

    return {
      avgReduction,
      totalSessions,
      mostCommonTrigger,
      mostEffectiveTechnique,
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-50">
        <Header />
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="py-10">
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Anxiety Management Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-sm text-secondary-500">Total Sessions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.avgReduction}</div>
              <p className="text-sm text-secondary-500">Avg. Anxiety Reduction</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold capitalize">{stats.mostCommonTrigger}</div>
              <p className="text-sm text-secondary-500">Most Common Trigger</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold capitalize">{stats.mostEffectiveTechnique}</div>
              <p className="text-sm text-secondary-500">Most Effective Technique</p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="anxiety-levels" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="anxiety-levels">Anxiety Levels</TabsTrigger>
            <TabsTrigger value="intervention-effectiveness">Intervention Effectiveness</TabsTrigger>
          </TabsList>
          
          <TabsContent value="anxiety-levels">
            <Card>
              <CardHeader>
                <CardTitle>Anxiety Levels Before & After</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="before"
                        name="Before"
                        stroke="#ef4444"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="after"
                        name="After"
                        stroke="#22c55e"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="intervention-effectiveness">
            <Card>
              <CardHeader>
                <CardTitle>Anxiety Reduction by Technique</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="reduction"
                        name="Anxiety Reduction"
                        fill="#3b82f6"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Trigger</th>
                    <th className="text-left py-2 px-4">Before</th>
                    <th className="text-left py-2 px-4">After</th>
                    <th className="text-left py-2 px-4">Reduction</th>
                    <th className="text-left py-2 px-4">Technique</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice(0, 5).map((session, i) => (
                    <tr key={i} className="border-b hover:bg-secondary-50">
                      <td className="py-2 px-4">{session.date}</td>
                      <td className="py-2 px-4 capitalize">{session.trigger}</td>
                      <td className="py-2 px-4">{session.before}</td>
                      <td className="py-2 px-4">{session.after}</td>
                      <td className="py-2 px-4">
                        <span className={session.reduction > 0 ? "text-green-600" : "text-secondary-600"}>
                          {session.reduction > 0 ? `-${session.reduction}` : session.reduction}
                        </span>
                      </td>
                      <td className="py-2 px-4 capitalize">{session.intervention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
