import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function Table({ children }: Props) {
  return (
    <div className="table-wrap">
      <table className="table">{children}</table>
    </div>
  );
}
