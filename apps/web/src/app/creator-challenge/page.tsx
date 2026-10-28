import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import CreatorChallengeForm from './CreatorChallengeForm';
import styles from './creator-challenge.module.css';

export const metadata: Metadata = {
  title: 'NUSC Creator Challenge | Nagaland United Sports Club',
  description: 'Create, publish and submit your original NUSC matchday content.',
};

export default function CreatorChallengePage() {
  return (
    <>
      <Nav forceScrolled />
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>NUSC Creator Community</p>
            <h1>
              Make your work.<br />
              <span>Make your mark.</span>
            </h1>
            <p className={styles.heroCopy}>
              Enter the NUSC Matchday Challenge for designers, video editors, football podcasters and storytellers.
              Publish original content, tag NUSC and submit before the deadline.
            </p>
            <div className={styles.heroPills} aria-label="Challenge highlights">
              <span>Total season prize pool · ₹1,20,000</span>
              <span>10 home matches</span>
              <span>Free to enter</span>
            </div>
          </div>
        </header>
        <CreatorChallengeForm />
      </main>
      <Footer />
    </>
  );
}
