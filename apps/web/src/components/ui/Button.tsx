import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
};

export function Button({ children, variant = "primary", className = "", ...props }: Props) {
  return (
    <button {...props} className={`btn btn-${variant} ${className}`.trim()}>
      {children}
    </button>
  );
}
