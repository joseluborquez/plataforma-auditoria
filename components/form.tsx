import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string };

export function Field({
  label, name, id, type = "text", defaultValue, required, placeholder, className, min, max, step,
}: {
  id?: string;
  label: string; name: string; type?: string; defaultValue?: string | number | null;
  required?: boolean; placeholder?: string; className?: string; min?: number; max?: number; step?: number | string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id ?? name}>{label}</Label>
      <Input id={id ?? name} name={name} type={type} defaultValue={defaultValue ?? ""} required={required}
        placeholder={placeholder} min={min} max={max} step={step} />
    </div>
  );
}

export function TextAreaField({
  label, name, defaultValue, rows = 3, placeholder, className,
}: { label: string; name: string; defaultValue?: string | null; rows?: number; placeholder?: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue ?? ""} rows={rows} placeholder={placeholder} />
    </div>
  );
}

export function SelectField({
  label, name, id, options, defaultValue, required, emptyLabel, className,
}: {
  id?: string;
  label: string; name: string; options: Opt[]; defaultValue?: string | null;
  required?: boolean; emptyLabel?: string; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id ?? name}>{label}</Label>
      <select
        id={id ?? name} name={name} defaultValue={defaultValue ?? ""} required={required}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export const opts = (rec: Record<string, string>): Opt[] =>
  Object.entries(rec).map(([value, label]) => ({ value, label }));

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4", className)}>
      {title && <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>;
}
