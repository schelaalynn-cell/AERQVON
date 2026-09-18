import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-aerqvon-accent text-white hover:bg-aerqvon-accent/90 active:scale-[0.97] shadow-glow',
  secondary: 'bg-aerqvon-surface-2 text-aerqvon-text border border-aerqvon-border hover:bg-aerqvon-surface-3 active:scale-[0.97]',
  ghost: 'bg-transparent text-aerqvon-accent hover:bg-aerqvon-surface-2 active:scale-[0.97]',
  danger: 'bg-aerqvon-error/15 text-aerqvon-error border border-aerqvon-error/30 hover:bg-aerqvon-error/25 active:scale-[0.97]',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm rounded-xl',
  md: 'px-4 py-3 text-sm rounded-xl',
  lg: 'px-5 py-4 text-base rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-semibold transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none select-none ${
        variants[variant]
      } ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
