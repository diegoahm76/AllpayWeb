import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: any;
  darkMode?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ title, onClick, loading = false, disabled = false, className = "", icon, darkMode, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onClick();
    };

    // Determinar si title tiene una sola palabra
    const isSingleWord = title?.trim().split(/\s+/).length === 1;
    // Definir clases condicionalmente
    const buttonClasses = `
      ${isSingleWord ? "w-[100px] md:w-[120px]" : "px-6"} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
      hover:bg-[rgb(var(--green-80))] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
      flex items-center justify-center gap-2 ${className}
    `;

    return (
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={buttonClasses}
        ref={ref}
        {...props}
      >
        {icon && (
          <img
            src={icon}
            alt="icon"
            className="inline-block w-6 h-6"
          />
        )}
        {title}
        {loading && (
          <span
            className="loader"
            style={{ width: '20px', height: '20px' }}
          />
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
