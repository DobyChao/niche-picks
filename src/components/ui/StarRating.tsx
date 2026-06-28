import { cn } from '@/lib/cn';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md';
  className?: string;
}

export default function StarRating({ rating, size = 'sm', className }: StarRatingProps) {
  const starClass = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <span className={cn('inline-flex items-center text-warning', starClass, className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        if (rating >= i) {
          return <span key={i}>★</span>;
        }
        if (rating > i - 1) {
          return (
            <span key={i} className="relative inline-block">
              <span className="text-border">★</span>
              <span
                className="absolute top-0 left-0 text-warning"
                style={{ clipPath: `inset(0 ${(i - rating) * 100}% 0 0)` }}
              >
                ★
              </span>
            </span>
          );
        }
        return (
          <span key={i} className="text-border">
            ★
          </span>
        );
      })}
    </span>
  );
}
