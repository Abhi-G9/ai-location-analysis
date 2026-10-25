import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle2, MessageSquare, Send } from 'lucide-react';

interface FeedbackCardProps {
  placeName?: string | null;
  coordinates?: string | null;
}

interface StoredFeedback {
  id: number;
  timestamp: string;
  placeName: string;
  coordinates: string;
  rating: number;
  tag: string | null;
  comment: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor / Wrong Location',
  2: 'Slightly Off',
  3: 'Close Match',
  4: 'Accurate Area',
  5: 'Exact Spot On!',
};

const QUICK_TAGS = [
  'Exact Landmark 👍',
  'Correct City, Wrong Spot 📍',
  'Partially Correct 🔍',
  'Wrong Location ❌',
];

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ placeName, coordinates }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Check if feedback was already submitted for this specific session
  useEffect(() => {
    setRating(0);
    setHoverRating(0);
    setSelectedTag(null);
    setComment('');
    setIsSubmitted(false);
    setIsDismissed(false);
  }, [placeName, coordinates]);

  if (isDismissed) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    const feedbackEntry: StoredFeedback = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      placeName: placeName || 'Unknown',
      coordinates: coordinates || '',
      rating,
      tag: selectedTag,
      comment: comment.trim(),
    };

    try {
      const existing = localStorage.getItem('geolens_feedback_list');
      const list: StoredFeedback[] = existing ? JSON.parse(existing) : [];
      list.push(feedbackEntry);
      localStorage.setItem('geolens_feedback_list', JSON.stringify(list));
    } catch {
      // LocalStorage fallback
    }

    setIsSubmitted(true);
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm transition-all relative overflow-hidden">
      {/* Top Dismiss Button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        title="Dismiss feedback"
      >
        <X className="w-4 h-4" />
      </button>

      {isSubmitted ? (
        /* Thank You Confirmation */
        <div className="py-4 text-center space-y-2 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h4 className="font-extrabold text-base text-slate-900">
            Thank you for your feedback!
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your review helps make GeoLens AI more accurate for everyone.
          </p>
        </div>
      ) : (
        /* Feedback Intake Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2.5 pr-8">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Was this location accurate?
              </h4>
              <p className="text-[11px] text-slate-500">
                Rate your detection result to help improve the AI
              </p>
            </div>
          </div>

          {/* Interactive Stars */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'fill-transparent text-slate-300 hover:text-amber-300'
                      }`}
                    />
                  </button>
                );
              })}

              <span className="text-xs font-semibold text-slate-600 ml-2">
                {hoverRating > 0
                  ? RATING_LABELS[hoverRating]
                  : rating > 0
                  ? RATING_LABELS[rating]
                  : 'Click to rate'}
              </span>
            </div>
          </div>

          {/* Quick Feedback Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Tags:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition border ${
                      isSelected
                        ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Comment Input */}
          <div className="pt-1">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any details or actual place name? (optional)"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 text-slate-800 transition"
              maxLength={200}
            />
          </div>

          {/* Submit and Dismiss Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Skip
            </button>

            <button
              type="submit"
              disabled={rating === 0}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${
                rating > 0
                  ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Review</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
