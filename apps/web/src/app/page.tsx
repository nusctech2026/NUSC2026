import { Suspense } from 'react';
import { HomeEffects } from '@/components/home-effects';
import { Nav } from '@/components/sections/Nav';
import { Hero } from '@/components/sections/Hero';
import { HomepageFixturesTable } from '@/components/sections/HomepageFixturesTable';
import { InstagramFeedFallback, InstagramFeedSection } from '@/components/sections/InstagramFeedSection';
import { YoutubeHighlightsSection } from '@/components/sections/YoutubeHighlightsSection';
import { Club } from '@/components/sections/Club';
import { Sponsors } from '@/components/sections/Sponsors';
import { Footer } from '@/components/sections/Footer';
import { getHomepageContent } from '@/lib/homepage-content';

async function AdminManagedHomepage() {
  const homepageContent = await getHomepageContent();
  return (
    <>
      <Hero
        heroSlides={homepageContent.heroSlides}
        latestMatch={homepageContent.latestMatch}
        nextMatch={homepageContent.nextMatch}
      />
      <HomepageFixturesTable fixtures={homepageContent.homeFixtures} />
      <InstagramFeedSection
        posts={homepageContent.instagramPosts}
        reels={homepageContent.instagramReels}
      />
      <YoutubeHighlightsSection highlights={homepageContent.youtubeHighlights} />
    </>
  );
}

export default function Home() {
  const homepageFallback = (
    <>
      <Hero heroSlides={[]} latestMatch={null} nextMatch={null} />
      <InstagramFeedFallback />
      <YoutubeHighlightsSection highlights={[]} />
    </>
  );

  return (
    <>
      <HomeEffects />
      <Nav />
      <main>
        <Suspense fallback={homepageFallback}>
          <AdminManagedHomepage />
        </Suspense>
        <Club />
        <Sponsors />
      </main>
      <Footer />
    </>
  );
}
