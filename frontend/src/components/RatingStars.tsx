import { useState } from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';

interface RatingStarsProps {
  rating: number; // Current rating value
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export const RatingStars = ({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onChange
}: RatingStarsProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const handleClick = (starIdx: number) => {
    if (interactive && onChange) {
      onChange(starIdx);
    }
  };

  const handleMouseEnter = (starIdx: number) => {
    if (interactive) {
      setHoverRating(starIdx);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(null);
    }
  };

  return (
    <div className="flex gap-1 items-center" onMouseLeave={handleMouseLeave}>
      {Array.from({ length: maxStars }).map((_, i) => {
        const starIdx = i + 1;
        const isFilled = starIdx <= displayRating;
        const isHalf = !isFilled && starIdx - 0.5 <= displayRating; // Visual indicator for fractional ratings

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(starIdx)}
            onMouseEnter={() => handleMouseEnter(starIdx)}
            className={clsx(
              "transition-all duration-150 relative focus:outline-none",
              interactive ? "hover:scale-110 cursor-pointer" : "cursor-default"
            )}
          >
            <Star
              size={size}
              className={clsx(
                "transition-colors duration-150",
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : isHalf
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "text-gray-300 dark:text-background-borderDark fill-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default RatingStars;
