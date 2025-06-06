import { AnxietyTracker } from '@/components/tracking/AnxietyTracker';

export function TrackPage() {
  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Track Your Anxiety</h1>
      <AnxietyTracker />
    </div>
  );
}