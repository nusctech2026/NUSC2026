import { HomeEffects } from '@/components/home-effects';
import { Nav } from '@/components/sections/Nav';
import { Hero } from '@/components/sections/Hero';
import { Club } from '@/components/sections/Club';
import { Journey } from '@/components/sections/Journey';
import { Honours } from '@/components/sections/Honours';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  return (
    <>
      <HomeEffects />
      <Nav />
      <main>
        <Hero />
        <Club />
        <Journey />
        <Honours />
      </main>
      <Footer />
    </>
  );
}
