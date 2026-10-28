'use client';

import { useRef, useState } from 'react';
import {
  CREATOR_CHALLENGE_AGE_GROUPS,
  CREATOR_CHALLENGE_CATEGORIES,
  CREATOR_CHALLENGE_DECLARATIONS,
  CREATOR_CHALLENGE_PLATFORMS,
  creatorChallengeValuesFromFormData,
  validateCreatorChallengeSubmission,
} from './validation';
import { submitCreatorChallengeEntry } from './actions';
import styles from './creator-challenge.module.css';

const MATCHDAYS = Array.from({ length: 10 }, (_, index) => index + 1);

export default function CreatorChallengeForm() {
  const [ageGroup, setAgeGroup] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [entryNumber, setEntryNumber] = useState('');
  const messageRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setEntryNumber('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    const validation = validateCreatorChallengeSubmission(creatorChallengeValuesFromFormData(formData));
    if (!validation.success) {
      setError(validation.errors[0]);
      requestAnimationFrame(() => messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitCreatorChallengeEntry(formData);
      if (!result.success) {
        setError(result.error);
        requestAnimationFrame(() => messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        return;
      }
      form.reset();
      setAgeGroup('');
      setEntryNumber(result.entryNumber);
      requestAnimationFrame(() => messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } catch {
      setError('Your entry could not be submitted right now. Please try again shortly.');
      requestAnimationFrame(() => messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.contentGrid}>
      <section className={styles.formCard} aria-labelledby="entry-form-title">
        <div className={styles.formHeading}>
          <div>
            <h2 id="entry-form-title">Register &amp; submit your entry</h2>
            <p>Complete all required fields. Submit a separate entry for each category and matchday.</p>
          </div>
          <span className={styles.freeBadge}>Free entry</span>
        </div>

        <div ref={messageRef}>
          {error && <p className={styles.errorMessage} role="alert">{error}</p>}
          {entryNumber && (
            <div className={styles.successMessage} role="status" aria-live="polite">
              <strong>Your entry has been submitted.</strong>
              <span>Keep this reference number: <b>{entryNumber}</b></span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <fieldset className={styles.fieldset}>
            <legend className={styles.sectionTitle}><span>01</span> Your details</legend>
            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <label htmlFor="creator-full-name">Full name <b aria-hidden="true">*</b></label>
                <input id="creator-full-name" name="fullName" type="text" autoComplete="name" minLength={2} maxLength={160} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="creator-handle">Creator name / handle</label>
                <input id="creator-handle" name="creatorHandle" type="text" maxLength={100} placeholder="If different from your full name" />
              </div>
              <div className={styles.field}>
                <label htmlFor="creator-email">Email address <b aria-hidden="true">*</b></label>
                <input id="creator-email" name="email" type="email" autoComplete="email" maxLength={254} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="creator-phone">Phone / WhatsApp <b aria-hidden="true">*</b></label>
                <input id="creator-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={32} placeholder="Include country code if needed" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="creator-age-group">Age group <b aria-hidden="true">*</b></label>
                <select id="creator-age-group" name="ageGroup" value={ageGroup} onChange={event => setAgeGroup(event.target.value)} required>
                  <option value="">Select</option>
                  {CREATOR_CHALLENGE_AGE_GROUPS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="creator-location">Town / district / state <b aria-hidden="true">*</b></label>
                <input id="creator-location" name="location" type="text" autoComplete="address-level2" minLength={2} maxLength={160} required />
              </div>
            </div>
            {ageGroup === 'under_18' && (
              <label className={styles.guardianConsent}>
                <input name="guardianConsent" type="checkbox" value="true" required />
                <span>I confirm that my parent or guardian has consented to my participation.</span>
              </label>
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.sectionTitle}><span>02</span> Competition entry</legend>
            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <label htmlFor="creator-category">Choose challenge <b aria-hidden="true">*</b></label>
                <select id="creator-category" name="category" defaultValue="" required>
                  <option value="">Select category</option>
                  {CREATOR_CHALLENGE_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="creator-matchday">Matchday / fixture <b aria-hidden="true">*</b></label>
                <select id="creator-matchday" name="matchday" defaultValue="" required>
                  <option value="">Select matchday</option>
                  {MATCHDAYS.map(matchday => <option key={matchday} value={matchday}>NUSC Home Match {matchday}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="creator-platform">Publishing platform <b aria-hidden="true">*</b></label>
                <select id="creator-platform" name="publishingPlatform" defaultValue="" required>
                  <option value="">Select platform</option>
                  {CREATOR_CHALLENGE_PLATFORMS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="creator-profile-url">Public profile URL <b aria-hidden="true">*</b></label>
                <input id="creator-profile-url" name="publicProfileUrl" type="url" inputMode="url" maxLength={2048} placeholder="https://..." required />
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label htmlFor="creator-entry-description">Entry title / short description <b aria-hidden="true">*</b></label>
                <textarea id="creator-entry-description" name="entryTitleDescription" minLength={5} maxLength={300} rows={2} required />
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label htmlFor="creator-entry-url">Published entry URL <b aria-hidden="true">*</b></label>
                <input id="creator-entry-url" name="publishedEntryUrl" type="url" inputMode="url" maxLength={2048} placeholder="https://..." required />
                <small>Publish your entry, tag the official NUSC account and include the campaign hashtag before submitting.</small>
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label htmlFor="creator-hashtag">Campaign hashtag used <b aria-hidden="true">*</b></label>
                <input id="creator-hashtag" name="campaignHashtag" type="text" pattern="#[A-Za-z0-9_]{2,64}" maxLength={66} placeholder="Enter the official campaign hashtag" required />
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label htmlFor="creator-notes">Additional notes <span>(optional)</span></label>
                <textarea id="creator-notes" name="additionalNotes" maxLength={1000} rows={3} />
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.sectionTitle}><span>03</span> Self-declarations</legend>
            <div className={styles.declarations}>
              {CREATOR_CHALLENGE_DECLARATIONS.map((declaration, index) => (
                <label className={styles.declaration} key={declaration.name}>
                  <input name={`declaration${declaration.name[0].toUpperCase()}${declaration.name.slice(1)}`} type="checkbox" value="true" required />
                  <span><b>{index + 1}.</b> {declaration.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.sectionTitle}><span>04</span> Terms &amp; conditions</legend>
            <div className={styles.termsList}>
              <details open>
                <summary>Eligibility &amp; entries</summary>
                <ul>
                  <li>Participation is free and open to eligible creators from Nagaland, Northeast India and other permitted locations.</li>
                  <li>Participants under 18 require parent or guardian consent.</li>
                  <li>One entry per category per matchday. You may enter all three categories if each entry is distinct and compliant.</li>
                  <li>Creators may participate throughout the season and may win at multiple fixtures.</li>
                </ul>
              </details>
              <details>
                <summary>Category requirements</summary>
                <ul>
                  <li><b>Poster:</b> Original 4:5 portrait poster featuring NUSC and its opponent, with correct team names, date, kick-off time and venue, using approved NUSC assets.</li>
                  <li><b>Football Edits:</b> Original video, preferably 15–60 seconds in 9:16 vertical format. Use approved/licensed footage, music and imagery; do not use unauthorised footage from the upcoming match.</li>
                  <li><b>Fan Voice:</b> Original NUSC-related match previews, tactical analysis, podcasts, player discussions, commentary or supporter perspectives. Suggested length: 60–180 seconds for short videos or 5–15 minutes for podcasts/discussions.</li>
                  <li>Publish on an approved social platform, tag official NUSC, include the campaign hashtag and submit the live URL before the announced deadline.</li>
                </ul>
              </details>
              <details>
                <summary>Judging &amp; prizes</summary>
                <ul>
                  <li><b>Total season prize pool:</b> ₹1,20,000 across 10 NUSC home matches.</li>
                  <li><b>Matchday Poster Challenge:</b> ₹5,000 per match.</li>
                  <li><b>Football Edits Challenge:</b> ₹5,000 per match.</li>
                  <li><b>Fan Voice Challenge:</b> ₹2,000 per match.</li>
                  <li>Entries are judged on originality, creativity, quality, relevance and category-specific criteria. Likes and follower counts alone do not determine winners.</li>
                  <li>One winner per category will be selected for each home match, subject to valid entries meeting the published criteria.</li>
                  <li>Winners are subject to eligibility verification. Prize payments are targeted within seven business days, subject to banking and compliance requirements.</li>
                  <li>NUSC may reject late, incomplete, infringing or non-compliant entries.</li>
                </ul>
              </details>
              <details>
                <summary>Ownership &amp; use of submitted content</summary>
                <ul>
                  <li>Creators retain ownership of original work.</li>
                  <li>Creators grant NUSC a non-exclusive licence to use submitted content for club and campaign promotion under these rules. NUSC will provide reasonable attribution.</li>
                  <li>Commercial exploitation beyond the campaign requires separate permission where applicable. Entrants are responsible for securing rights to third-party content, music, footage, imagery and identifiable people where required.</li>
                </ul>
              </details>
              <details>
                <summary>Deadlines, disqualification &amp; access</summary>
                <ul>
                  <li>Submit before the deadline announced for the selected matchday. Late or incomplete entries may not be considered.</li>
                  <li>If a fixture is rescheduled, related submission and award dates may change.</li>
                  <li>Judging follows the published criteria and documented process. Conflicts of interest should be disclosed.</li>
                  <li>Stadium access, matchday experiences and player interactions are subject to safety, accreditation, operational permissions and availability.</li>
                  <li>If no valid entry meets the published minimum standards, the category prize may be carried forward to a later fixture, subject to a publicly disclosed procedure.</li>
                </ul>
              </details>
            </div>
          </fieldset>

          <label className={styles.termsAcceptance}>
            <input name="termsAccepted" type="checkbox" value="true" required />
            <span>I confirm the information provided is accurate and agree to the NUSC Creator Challenge rules and terms above. <b aria-hidden="true">*</b></span>
          </label>

          <button className={styles.submitButton} type="submit" disabled={submitting}>
            {submitting ? 'Submitting your entry…' : 'Submit creator entry'}
          </button>
        </form>
      </section>

      <aside className={styles.sidebar}>
        <section className={styles.sideCard}>
          <h2>How to participate</h2>
          <p>Five steps to enter.</p>
          <ol className={styles.steps}>
            <li><span>1</span><div><b>Create</b><small>Make original content for your chosen challenge.</small></div></li>
            <li><span>2</span><div><b>Publish</b><small>Post it on your social media account.</small></div></li>
            <li><span>3</span><div><b>Tag NUSC</b><small>Tag the official account and add the campaign hashtag.</small></div></li>
            <li><span>4</span><div><b>Copy the link</b><small>Paste the live post URL into the form.</small></div></li>
            <li><span>5</span><div><b>Submit on time</b><small>Complete the form before your selected matchday deadline.</small></div></li>
          </ol>
        </section>

        <section className={styles.sideCard}>
          <h2>Choose your challenge</h2>
          <div className={styles.challengeList}>
            <details open>
              <summary>Matchday Poster Challenge</summary>
              <p>Original matchday artwork featuring NUSC and its opponent.</p>
            </details>
            <details>
              <summary>Football Edits Challenge</summary>
              <p>Original short-form football videos using approved or licensed material.</p>
            </details>
            <details>
              <summary>Fan Voice Challenge</summary>
              <p>Original commentary, analysis, podcasts and supporter perspectives.</p>
            </details>
          </div>
        </section>
      </aside>
    </div>
  );
}
