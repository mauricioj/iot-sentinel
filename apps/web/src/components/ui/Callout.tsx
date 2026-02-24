import { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function Callout({ title, children }: Props) {
  return (
    <section className="callout">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}
