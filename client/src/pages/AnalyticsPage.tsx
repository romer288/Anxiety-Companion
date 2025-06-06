import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AnxietyAnalytics } from "../components/analytics/AnxietyAnalytics";
import { TherapistReport } from "../components/analytics/TherapistReport";
import { useAuthStore } from "../context/auth-store";

export function AnalyticsPage() {
  const { user } = useAuthStore();

  return (
    <div className="container mx-auto max-w-5xl py-6">
      <Tabs defaultValue="dashboard">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="therapist">Therapist Report</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <AnxietyAnalytics />
        </TabsContent>
        
        <TabsContent value="therapist">
          <TherapistReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}