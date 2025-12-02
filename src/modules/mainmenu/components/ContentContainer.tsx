import type { PropsWithChildren } from "react";

export default function ContentContainer({ children }: PropsWithChildren) {
  return (
    <main
      className="min-h-screen bg-background"
      style={{ maxWidth: "95vw" }}
    >
      <div className="mx-auto w-full max-w-[1600px] p-6">{children}</div>
    </main>
  );
}
