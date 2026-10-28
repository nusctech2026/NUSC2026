'use client';

import React, { useEffect, useState } from 'react';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';
import {
  deleteCreatorChallengeEntry,
  getCreatorChallengeEntries,
  getCreatorChallengeSummary,
  type CreatorChallengeEntry,
  type CreatorChallengeSummary,
} from '../../../actions/creatorChallengeActions';

const categories = [
  { value: 'poster', label: 'Matchday Poster Challenge' },
  { value: 'football_edits', label: 'Football Edits Challenge' },
  { value: 'fan_voice', label: 'Fan Voice Challenge' },
];

const ageGroups: Record<string, string> = {
  under_18: 'Under 18',
  '18_24': '18–24',
  '25_34': '25–34',
  '35_44': '35–44',
  '45_plus': '45+',
};

const platforms: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  x: 'X',
  other: 'Other approved platform',
};

const declarationLabels: Array<[keyof CreatorChallengeEntry, string]> = [
  ['declaration_original_work', 'Original work'],
  ['declaration_rights_permissions', 'Rights and permissions'],
  ['declaration_rules_conduct', 'Rules and conduct'],
  ['declaration_content_licence', 'Content-use licence'],
  ['declaration_accuracy_respect', 'Accuracy and respect'],
  ['declaration_contact_verification', 'Contact and verification'],
];

function displayValue(value: string | null | undefined) {
  return value?.trim() || '—';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="creator-entry-field"><dt>{label}</dt><dd>{children}</dd></div>;
}

export const CreatorChallengeEntriesView: React.FC = () => {
  const [entries, setEntries] = useState<CreatorChallengeEntry[]>([]);
  const [category, setCategory] = useState('all');
  const [matchday, setMatchday] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<CreatorChallengeSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteNotice, setDeleteNotice] = useState('');
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setSummaryLoading(true);
    setSummaryError('');
    getCreatorChallengeSummary().then(result => {
      if (active) setSummary(result);
    }).catch(cause => {
      if (active) setSummaryError(cause instanceof Error ? cause.message : 'Unable to load the Creator Challenge summary.');
    }).finally(() => {
      if (active) setSummaryLoading(false);
    });
    return () => { active = false; };
  }, [refreshVersion]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCreatorChallengeEntries({
      category,
      matchday: matchday === 'all' ? undefined : Number(matchday),
      search,
      page,
    }).then(result => {
      if (!active) return;
      setEntries(result.entries);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setError('');
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load Creator Challenge entries.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [category, matchday, search, page, refreshVersion]);

  function applySearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const exportParams = new URLSearchParams();
  if (category !== 'all') exportParams.set('category', category);
  if (matchday !== 'all') exportParams.set('matchday', matchday);
  if (search) exportParams.set('search', search);
  const exportQuery = exportParams.toString();
  const exportHref = `/admin/campaign/creator-challenge/export${exportQuery ? `?${exportQuery}` : ''}`;

  async function deleteEntry(entry: CreatorChallengeEntry) {
    if (deletingEntryId) return;
    const confirmed = window.confirm(
      `Permanently delete ${entry.entry_number} for ${entry.full_name}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingEntryId(entry.id);
    setDeleteError('');
    setDeleteNotice('');
    try {
      await deleteCreatorChallengeEntry(entry.id);
      setDeleteNotice(`${entry.entry_number} was permanently deleted.`);
      if (entries.length === 1 && page > 1) {
        setPage(current => Math.max(1, current - 1));
      }
      setRefreshVersion(current => current + 1);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Unable to delete this entry. Please try again.');
    } finally {
      setDeletingEntryId(null);
    }
  }

  return (
    <div className="campaign-page creator-challenge-admin">
      <CampaignWorkspaceNav />
      <div className="creator-entries-heading">
        <div>
          <p className="campaign-eyebrow">Campaign Operations</p>
          <h1>NUSC Creator Challenge entries</h1>
          <p className="campaign-page-intro">Review each published submission and the exact details and declarations provided by the creator.</p>
        </div>
        <span className="creator-entry-count">{totalCount} {totalCount === 1 ? 'entry' : 'entries'}</span>
      </div>

      <section className="creator-challenge-summary" aria-labelledby="creator-challenge-summary-title">
        <div className="creator-challenge-summary-heading">
          <div>
            <h2 id="creator-challenge-summary-title">Season summary</h2>
            <p>All submitted entries across the season.</p>
          </div>
          {summaryLoading && <span role="status">Updating summary…</span>}
        </div>
        {summaryError && <p className="creator-entry-error" role="alert">{summaryError}</p>}
        <div className="creator-challenge-stat-grid">
          <article><span>Total entries</span><strong>{summary?.total ?? '—'}</strong></article>
          <article><span>Matchday posters</span><strong>{summary?.categories.poster ?? '—'}</strong></article>
          <article><span>Football edits</span><strong>{summary?.categories.football_edits ?? '—'}</strong></article>
          <article><span>Fan voice</span><strong>{summary?.categories.fan_voice ?? '—'}</strong></article>
        </div>
        <div className="creator-challenge-matchday-summary">
          <h3>Entries by matchday</h3>
          <ol>
            {Array.from({ length: 10 }, (_, index) => (
              <li key={index + 1}><span>Match {index + 1}</span><strong>{summary?.matchdays[index] ?? '—'}</strong></li>
            ))}
          </ol>
        </div>
      </section>

      <div className="creator-entry-filters">
        <form onSubmit={applySearch} role="search">
          <input aria-label="Search creator name or email" type="search" maxLength={120} placeholder="Search creator name or email" value={searchInput} onChange={event => setSearchInput(event.target.value)} />
          <button type="submit">Search</button>
        </form>
        <label>
          <span>Challenge</span>
          <select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}>
            <option value="all">All challenges</option>
            {categories.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span>Matchday</span>
          <select value={matchday} onChange={event => { setMatchday(event.target.value); setPage(1); }}>
            <option value="all">All matchdays</option>
            {Array.from({ length: 10 }, (_, index) => index + 1).map(number => <option key={number} value={number}>Home Match {number}</option>)}
          </select>
        </label>
        <a className="creator-entry-export" href={exportHref} title="Download every entry matching the current filters, including all submitted fields and declarations.">Export CSV</a>
      </div>

      {error && <p className="creator-entry-error" role="alert">{error}</p>}
      {deleteError && <p className="creator-entry-error" role="alert">{deleteError}</p>}
      {deleteNotice && <p className="creator-entry-state" role="status">{deleteNotice}</p>}
      {loading && <p className="creator-entry-state" role="status">Loading entries…</p>}
      {!loading && !error && entries.length === 0 && <p className="creator-entry-state">No Creator Challenge entries match these filters.</p>}

      {!loading && entries.length > 0 && (
        <div className="creator-entries-list">
          {entries.map(entry => (
            <article className="creator-entry-card" key={entry.id}>
              <div className="creator-entry-summary">
                <div>
                  <span className="creator-entry-reference">{entry.entry_number}</span>
                  <h2>{entry.full_name}</h2>
                  <p>{categories.find(item => item.value === entry.category)?.label || entry.category} · NUSC Home Match {entry.matchday_number}</p>
                </div>
                <div className="creator-entry-summary-side">
                  <span>{formatDate(entry.submitted_at)}</span>
                  <a href={entry.published_entry_url} target="_blank" rel="noreferrer">Open submitted entry ↗</a>
                  {summary?.canDeleteEntries && (
                    <button
                      className="creator-entry-delete"
                      type="button"
                      disabled={deletingEntryId !== null}
                      aria-label={`Delete entry ${entry.entry_number}`}
                      onClick={() => void deleteEntry(entry)}
                    >
                      {deletingEntryId === entry.id ? 'Deleting...' : 'Delete entry'}
                    </button>
                  )}
                </div>
              </div>
              <details className="creator-entry-details">
                <summary>View all submitted details</summary>
                <div className="creator-entry-detail-section">
                  <h3>Creator details</h3>
                  <dl>
                    <Field label="Full name">{entry.full_name}</Field>
                    <Field label="Creator name / handle">{displayValue(entry.creator_handle)}</Field>
                    <Field label="Email address"><a href={`mailto:${entry.email}`}>{entry.email}</a></Field>
                    <Field label="Phone / WhatsApp"><a href={`tel:${entry.phone}`}>{entry.phone}</a></Field>
                    <Field label="Age group">{ageGroups[entry.age_group] || entry.age_group}</Field>
                    <Field label="Town / district / state">{entry.location}</Field>
                    {entry.age_group === 'under_18' && <Field label="Parent / guardian consent">{entry.guardian_consent ? 'Confirmed' : 'Not confirmed'}</Field>}
                  </dl>
                </div>
                <div className="creator-entry-detail-section">
                  <h3>Competition entry</h3>
                  <dl>
                    <Field label="Challenge category">{categories.find(item => item.value === entry.category)?.label || entry.category}</Field>
                    <Field label="Matchday / fixture">NUSC Home Match {entry.matchday_number}</Field>
                    <Field label="Publishing platform">{platforms[entry.publishing_platform] || entry.publishing_platform}</Field>
                    <Field label="Public profile URL"><a href={entry.public_profile_url} target="_blank" rel="noreferrer">{entry.public_profile_url}</a></Field>
                    <Field label="Entry title / short description">{entry.entry_title_description}</Field>
                    <Field label="Published entry URL"><a href={entry.published_entry_url} target="_blank" rel="noreferrer">{entry.published_entry_url}</a></Field>
                    <Field label="Campaign hashtag used">{entry.campaign_hashtag}</Field>
                    <Field label="Additional notes">{displayValue(entry.additional_notes)}</Field>
                  </dl>
                </div>
                <div className="creator-entry-detail-section">
                  <h3>Self-declarations</h3>
                  <ul className="creator-entry-declarations">
                    {declarationLabels.map(([field, label]) => (
                      <li key={field}>
                        <span aria-hidden="true">{entry[field] ? '✓' : '×'}</span>
                        <b>{label}:</b> {entry[field] ? 'Confirmed' : 'Not confirmed'}
                      </li>
                    ))}
                    <li><span aria-hidden="true">{entry.terms_accepted_at ? '✓' : '×'}</span><b>Challenge terms:</b> {entry.terms_accepted_at ? `Accepted ${formatDate(entry.terms_accepted_at)}` : 'Not confirmed'}</li>
                  </ul>
                </div>
              </details>
            </article>
          ))}
        </div>
      )}

      {!loading && totalCount > 0 && (
        <div className="creator-entry-pagination">
          <span>Page {page} of {totalPages}</span>
          <div>
            <button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};
