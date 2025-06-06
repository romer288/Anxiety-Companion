import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AnxietyRatingProps {
  onSubmit: (rating: number) => void;
}

export default function AnxietyRating({ onSubmit }: AnxietyRatingProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const getRatingColor = (value: number) => {
    if (value <= 2) return "bg-green-100 text-green-800";
    if (value <= 3) return "bg-green-200 text-green-800";
    if (value <= 5) return "bg-yellow-100 text-yellow-800";
    if (value <= 6) return "bg-yellow-200 text-yellow-800";
    if (value <= 8) return "bg-orange-200 text-orange-800";
    return "bg-red-200 text-red-800";
  };

  const handleSubmit = () => {
    if (selectedRating !== null) {
      onSubmit(selectedRating);
    }
  };

  return (
    <div className="p-4 bg-white border-t border-secondary-200">
      <div className="text-center mb-3">
        <h3 className="font-medium">How would you rate your anxiety now?</h3>
        <p className="text-sm text-secondary-500">Select a value from 0 (none) to 10 (extreme)</p>
      </div>
      
      <div className="flex justify-center space-x-1">
        {Array.from({ length: 11 }).map((_, i) => (
          <button
            key={i}
            className={`rating-btn w-8 h-8 rounded-full text-sm font-medium focus:outline-none transition-all
              ${getRatingColor(i)}
              ${selectedRating === i ? 'rating-selected' : ''}
            `}
            onClick={() => setSelectedRating(i)}
          >
            {i}
          </button>
        ))}
      </div>
      
      <div className="mt-3 text-center">
        <Button
          className="bg-primary-600 text-white hover:bg-primary-700"
          onClick={handleSubmit}
          disabled={selectedRating === null}
        >
          Submit Rating
        </Button>
      </div>
    </div>
  );
}
