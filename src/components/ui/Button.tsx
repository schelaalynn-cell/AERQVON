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
  primary: 'bg-nova-accent text-white hover:bg-nova-accent/90 active:scale-[0.97] shadow-glow',
  secondary: 'bg-nova-surface-2 text-nova-text border border-nova-border hover:bg-nova-surface-3 active:scale-[0.97]',
  ghost: 'bg-transparent text-nova-accent hover:bg-nova-surface-2 active:scale-[0.97]',
  danger: 'bg-nova-error/15 text-nova-error border border-nova-error/30 hover:bg-nova-error/25 active:scale-[0.97]',
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
