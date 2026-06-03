import { memo } from 'react';
import { clsx } from 'clsx';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface ElephantLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullscreen?: boolean;
}

export const ElephantLoader = memo(({ size = 'md', text, fullscreen = false }: ElephantLoaderProps) => {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32 sm:w-36 sm:h-36',
    lg: 'w-48 h-48 sm:w-56 sm:h-56',
  };

  const containerClasses = clsx(
    'flex flex-col items-center justify-center font-body text-[#2C2518] dark:text-[#EFECE6]',
    fullscreen ? 'min-h-screen w-full bg-[#F5F0E8] dark:bg-[#1E1B15]' : 'py-8'
  );

  return (
    <div className={containerClasses}>
      <div className={clsx('relative flex items-center justify-center', sizeClasses[size])}>
        <DotLottieReact
          src="/animation.lottie"
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {text && (
        <span className="text-xs sm:text-sm font-semibold tracking-wide mt-3 text-[#8C8270] dark:text-[#A09685] animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
});

export default ElephantLoader;
