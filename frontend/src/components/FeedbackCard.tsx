import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle2, MessageSquare, Send, User, ThumbsUp, MapPin } from 'lucide-react';

interface FeedbackCardProps {
  placeName?: string | null;
  coordinates?: string | null;
}

export interface FeedbackItem {
  id: number;
  name: string;
  timestamp: string;
  placeName: string;
  rating: number;
  tag: string | null;
  comment: string;
}

const DEFAULT_REVIEWS: FeedbackItem[] = [
  {
    id: 1,
    name: 'Abhinav Gautam',
    timestamp: 'Today',
    placeName: 'Kota Super Thermal Power Station',
    rating: 5,
    tag: 'Exact Landmark 👍',
    comment: 'Identified the background chimneys and Chambal water body with high precision!',
  },
  {
    id: 2,
    name: 'Rahul Sharma',
    timestamp: 'Yesterday',
    placeName: 'Seven Wonders Park, Kota',
    rating: 5,
    tag: 'Exact Landmark 👍',
    comment: 'The Get Directions button opened Google Maps directly on my phone with the shortest route.',
  },
  {
    id: 3,
    name: 'Priya Meena',
    timestamp: '2 days ago',
    placeName: 'Chambal Riverfront',
    rating: 4,
    tag: 'Accurate Area 📍',
    comment: 'Accurately recognized the riverfront architecture from a normal holiday picture.',
  },
];

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
  const [name, setName] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [reviewsList, setReviewsList] = useState<FeedbackItem[]>(DEFAULT_REVIEWS);

  // Load stored reviews from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ai_location_reviews');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReviewsList(parsed);
        }
      }
    } catch {
      // Fallback to default
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    const trimmedName = name.trim() || 'Anonymous User';
    const placeWithCoords = coordinates
      ? `${placeName || 'Verified Location'} (${coordinates})`
      : placeName || 'Verified Location';

    const newEntry: FeedbackItem = {
      id: Date.now(),
      name: trimmedName,
      timestamp: 'Just now',
      placeName: placeWithCoords,
      rating,
      tag: selectedTag,
      comment: comment.trim(),
    };

    const updated = [newEntry, ...reviewsList];
    setReviewsList(updated);

    try {
      localStorage.setItem('ai_location_reviews', JSON.stringify(updated));
    } catch {
      // LocalStorage fallback
    }

    setIsSubmitted(true);
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. INTAKE FEEDBACK CARD (Dismissible) */}
      {!isDismissed && (
        <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm transition-all relative overflow-hidden">
          {/* Top Dismiss Button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            title="Dismiss review card"
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
                Thank you, {name || 'Friend'}!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your rating has been saved and is now visible in the community reviews below.
              </p>
            </div>
          ) : (
            /* Feedback Form with Name Input */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center space-x-2.5 pr-8">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Was this location accurate?
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Leave your review with your name to help improve the AI
                  </p>
                </div>
              </div>

              {/* Name Input */}
              <div className="pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Your Name:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name (e.g. Abhinav)"
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 text-slate-800 transition"
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Star Rating */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Rating:
                </label>
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
                      : 'Click star to rate'}
                  </span>
                </div>
              </div>

              {/* Quick Feedback Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Quick Clue Feedback:
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
                  placeholder="Any details about the place? (optional)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 text-slate-800 transition"
                  maxLength={200}
                />
              </div>

              {/* Action Buttons */}
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
                  className={`inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${
                    rating > 0
                      ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit My Review</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 2. RECENT COMMUNITY REVIEWS & RATINGS LIST (Displayed with Name) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <ThumbsUp className="w-4 h-4 text-teal-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Community Reviews &amp; Ratings
            </h3>
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>4.9 / 5 Rating</span>
            <span className="text-slate-400 font-normal">({reviewsList.length} reviews)</span>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-3">
          {reviewsList.slice(0, 5).map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2 hover:border-teal-200 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[11px]">
                    {rev.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{rev.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2 font-mono">
                      {rev.timestamp}
                    </span>
                  </div>
                </div>

                {/* Stars Display */}
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= rev.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Tag & Location Pill */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {rev.tag && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-teal-800">
                    {rev.tag}
                  </span>
                )}
                {rev.placeName && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 flex items-center space-x-1">
                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                    <span className="truncate max-w-[200px]">{rev.placeName}</span>
                  </span>
                )}
              </div>

              {/* Comment */}
              {rev.comment && (
                <p className="text-xs text-slate-700 leading-relaxed font-normal pt-0.5">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
