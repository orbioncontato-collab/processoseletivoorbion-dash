import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Rótulo, campo e mensagens de erro, com ligação acessível entre eles. */
export function Field({
  id,
  label,
  errors,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  hint?: string;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const errorId = `${id}-erro`;
  const hintId = `${id}-dica`;
  const describedBy = [errors?.length ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, {
        id,
        "aria-invalid": errors?.length ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && !errors?.length ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={errorId} className="text-xs text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
