import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalculatorView } from "@/components/CalculatorView";
import { CALCS, getCalc } from "@/lib/calcs";

export function generateStaticParams() {
  return CALCS.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getCalc(slug);
  return c ? { title: `${c.num} ${c.name}`, description: c.desc } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getCalc(slug)) notFound();
  return <CalculatorView key={slug} slug={slug} />;
}
