import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { Honours } from "@/components/sections/Honours";
import { Representation } from "@/components/sections/Representation";

export const metadata: Metadata = {
  title: pages.honours.label,
  description: pages.honours.description,
};

export default function Page() {
  return (
    <>
      <PageHeader {...pages.honours} />
      <Honours />
      <Representation />
    </>
  );
}
