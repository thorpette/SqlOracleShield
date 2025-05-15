import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-[3px]",
    lg: "h-8 w-8 border-4"
  };

  return (
    <div
      className={cn(
        "inline-block text-primary animate-spin rounded-full border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Cargando"
      {...props}
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
}