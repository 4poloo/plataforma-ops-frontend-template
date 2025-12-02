import type { ElementType, ReactNode } from "react";

type Props = {
  title: string;
  icon: ElementType;
  children?: ReactNode;
  className?: string;
  headerRight?: ReactNode;
};

export default function WidgetCard({
  title,
  icon: Icon,
  children,
  className = "",
  headerRight,
}: Props) {
  return (
    <section
      className={`rounded-2xl border border-secondary bg-white p-5 shadow-sm ${className} hover:shadow-secondary`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {headerRight ? (
          <div className="text-xs text-foreground/60">{headerRight}</div>
        ) : null}
      </div>

      {/* Área de contenido centrada */}
      <div className="text-sm text-foreground/80">
        <div className="min-h-36 flex w-full items-center justify-center">
          {/* Limita el ancho para que el contenido no se estire demasiado */}
          <div className="w-full max-w-[640px] text-center">{children}</div>
        </div>
      </div>
    </section>
  );
}
