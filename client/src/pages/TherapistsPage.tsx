import TherapistDashboard from '@/components/TherapistDashboard';

export function TherapistsPage() {
  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Find a Therapist</h1>
      <TherapistDashboard />
    </div>
  );
}