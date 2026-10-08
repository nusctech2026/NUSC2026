import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { Careers } from "@/components/sections/Careers";

export const metadata: Metadata = {
  title: pages.careers.label,
  description: pages.careers.description,
};

export default function Page() {
  return (
    <>
      <Nav />
      <main>
      <PageHeader {...pages.careers} />
      <Careers />
          </main>
      <Footer />
    </>
  );
}
