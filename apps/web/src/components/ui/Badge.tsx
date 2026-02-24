import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function Badge({ children }: Props) {
  return <span className="badge">{children}</span>;
}
