'use client';

import React, { useCallback } from 'react';
import { useField, useFormFields } from '@payloadcms/ui';

export interface ZoneDefinition {
  id: string;
  label: string;
  badge: string;
  desc: string;
  icon: string;
}

export const ACCESS_ZONE_DEFINITIONS: ZoneDefinition[] = [
  {
    id: 'media_seating',
    label: 'Media / Press Seating',
    badge: 'Press Seating',
    desc: 'Covered press bench with desk space & power outlet',
    icon: '🪑',
  },
  {
    id: 'photography_area',
    label: 'Photography Area (Pitchside)',
    badge: 'Pitchside Photo',
    desc: 'Designated photographer bib zones behind goal lines',
    icon: '📷',
  },
  {
    id: 'press_conference',
    label: 'Press Conference Area',
    badge: 'Press Conf.',
    desc: 'Post-match press briefing room with head coach & captain',
    icon: '🎙️',
  },
  {
    id: 'mixed_zone',
    label: 'Mixed Zone / Post-Match Interviews',
    badge: 'Mixed Zone',
    desc: 'Player walkthrough tunnel interview mixed zone',
    icon: '🚶',
  },
  {
    id: 'broadcast_area',
    label: 'Broadcast / Video Coverage Area',
    badge: 'Broadcast',
    desc: 'Gantry & camera platforms for approved broadcast units',
    icon: '📹',
  },
];

export interface EquipmentDefinition {
  id: string;
  label: string;
  desc: string;
  icon: string;
}

export const EQUIPMENT_DEFINITIONS: EquipmentDefinition[] = [
  {
    id: 'dslr_mirrorless',
    label: 'DSLR / Mirrorless Camera',
    desc: 'Professional photography camera bodies & lenses',
    icon: '📸',
  },
  {
    id: 'video_camera',
    label: 'Video Camera',
    desc: 'Broadcast or video capture equipment',
    icon: '📹',
  },
  {
    id: 'tripod_monopod',
    label: 'Tripod / Monopod',
    desc: 'Stabilisation mounts and stands',
    icon: '🔭',
  },
  {
    id: 'audio_equipment',
    label: 'Audio Recording Equipment',
    desc: 'Microphones, field recorders, wireless kits',
    icon: '🎙️',
  },
  {
    id: 'laptop',
    label: 'Laptop / Workstation',
    desc: 'Portable computer for live writing and filing',
    icon: '💻',
  },
  {
    id: 'other_equipment',
    label: 'Other Equipment',
    desc: 'Custom or additional declared equipment',
    icon: '📦',
  },
];

function normalizeArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(Boolean).map(String);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map(String);
      }
      return [raw.trim()].filter(Boolean);
    } catch {
      return [raw.trim()].filter(Boolean);
    }
  }
  return [];
}

/**
 * Access Areas Requested by Applicant
 * Displays the applicant's requested zones cleanly as interactive badges / cards
 */
export const PressRequestedAccessField: React.FC<{ path?: string; field?: any; readOnly?: boolean }> = ({
  path = 'accessRequired',
  field,
  readOnly,
}) => {
  const { value, setValue, disabled } = useField<any>({ path });
  const selectedKeys = normalizeArray(value);
  const isEditable = !readOnly && !disabled;

  const toggleZone = useCallback(
    (id: string) => {
      if (!isEditable) return;
      const next = selectedKeys.includes(id)
        ? selectedKeys.filter((k) => k !== id)
        : [...selectedKeys, id];
      setValue(next);
    },
    [isEditable, selectedKeys, setValue]
  );

  // Find any unknown custom values that applicant may have submitted
  const knownIds = new Set(ACCESS_ZONE_DEFINITIONS.map((z) => z.id));
  const customItems = selectedKeys.filter((k) => !knownIds.has(k));

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--theme-elevation-800, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Access Areas Requested by Applicant</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '999px',
              background: selectedKeys.length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'var(--theme-elevation-150, #334155)',
              color: selectedKeys.length > 0 ? '#60a5fa' : 'var(--theme-elevation-400, #94a3b8)',
              border: selectedKeys.length > 0 ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            }}
          >
            {selectedKeys.length} {selectedKeys.length === 1 ? 'zone' : 'zones'} requested
          </span>
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '8px',
          padding: '12px',
          background: 'var(--theme-elevation-50, #131518)',
          borderRadius: '8px',
          border: '1px solid var(--theme-elevation-150, #27272a)',
        }}
      >
        {ACCESS_ZONE_DEFINITIONS.map((zone) => {
          const isSelected = selectedKeys.includes(zone.id);
          return (
            <div
              key={zone.id}
              onClick={() => toggleZone(zone.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '6px',
                background: isSelected
                  ? 'rgba(59, 130, 246, 0.12)'
                  : 'var(--theme-elevation-100, #1c1e22)',
                border: isSelected
                  ? '1px solid #3b82f6'
                  : '1px solid var(--theme-elevation-150, #2a2e35)',
                cursor: isEditable ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '18px', lineHeight: 1, marginTop: '2px' }}>{zone.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? '#93c5fd' : 'var(--theme-elevation-800, #e2e8f0)',
                    }}
                  >
                    {zone.label}
                  </span>
                  {isSelected ? (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#2563eb',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Requested
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: isSelected ? 'rgba(147, 197, 253, 0.8)' : 'var(--theme-elevation-400, #8590a2)',
                    marginTop: '2px',
                    lineHeight: 1.3,
                  }}
                >
                  {zone.desc}
                </div>
              </div>
            </div>
          );
        })}

        {/* Display custom items if any were submitted */}
        {customItems.map((custom) => (
          <div
            key={custom}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid #3b82f6',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#93c5fd' }}>
              📍 {custom}
            </span>
            <button
              type="button"
              onClick={() => toggleZone(custom)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px',
              }}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--theme-elevation-400, #8590a2)' }}>
        {field?.admin?.description || 'Stadium access areas requested by the media applicant during registration.'}
      </div>
    </div>
  );
};

/**
 * Approved Access Zones (Granted by Club)
 * Interactive, high-visibility permission granting tool for NUSC Club Staff
 */
export const PressApprovedAccessField: React.FC<{ path?: string; field?: any; readOnly?: boolean }> = ({
  path = 'approvedAccessAreas',
  field,
  readOnly,
}) => {
  const { value, setValue, disabled } = useField<any>({ path });
  const approvedKeys = normalizeArray(value);

  // Watch applicant's requested access zones from form state
  const rawRequested = useFormFields(([fields]) => fields.accessRequired?.value);
  const requestedKeys = normalizeArray(rawRequested);

  const isEditable = !readOnly && !disabled;

  const toggleZone = useCallback(
    (id: string) => {
      if (!isEditable) return;
      const next = approvedKeys.includes(id)
        ? approvedKeys.filter((k) => k !== id)
        : [...approvedKeys, id];
      setValue(next);
    },
    [isEditable, approvedKeys, setValue]
  );

  const approveAllRequested = useCallback(() => {
    if (!isEditable) return;
    const combined = Array.from(new Set([...approvedKeys, ...requestedKeys]));
    setValue(combined);
  }, [isEditable, approvedKeys, requestedKeys, setValue]);

  const selectAll = useCallback(() => {
    if (!isEditable) return;
    setValue(ACCESS_ZONE_DEFINITIONS.map((z) => z.id));
  }, [isEditable, setValue]);

  const clearAll = useCallback(() => {
    if (!isEditable) return;
    setValue([]);
  }, [isEditable, setValue]);

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--theme-elevation-800, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Approved Access Zones (Granted by Club)</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              background: approvedKeys.length > 0 ? 'rgba(34, 197, 94, 0.15)' : 'var(--theme-elevation-150, #334155)',
              color: approvedKeys.length > 0 ? '#4ade80' : 'var(--theme-elevation-400, #94a3b8)',
              border: approvedKeys.length > 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
            }}
          >
            {approvedKeys.length > 0 ? `✓ ${approvedKeys.length} Authorized` : '0 Granted'}
          </span>
        </label>

        {isEditable && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {requestedKeys.length > 0 && (
              <button
                type="button"
                onClick={approveAllRequested}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Authorize all zones the applicant requested"
              >
                ⚡ Approve All Requested ({requestedKeys.length})
              </button>
            )}
            <button
              type="button"
              onClick={selectAll}
              style={{
                fontSize: '11px',
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--theme-elevation-100, #1e293b)',
                color: 'var(--theme-elevation-700, #cbd5e1)',
                border: '1px solid var(--theme-elevation-200, #475569)',
                cursor: 'pointer',
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              style={{
                fontSize: '11px',
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--theme-elevation-100, #1e293b)',
                color: 'var(--theme-elevation-700, #cbd5e1)',
                border: '1px solid var(--theme-elevation-200, #475569)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '8px',
          padding: '12px',
          background: 'var(--theme-elevation-50, #131518)',
          borderRadius: '8px',
          border: '1px solid var(--theme-elevation-150, #27272a)',
        }}
      >
        {ACCESS_ZONE_DEFINITIONS.map((zone) => {
          const isApproved = approvedKeys.includes(zone.id);
          const wasRequested = requestedKeys.includes(zone.id);
          return (
            <div
              key={zone.id}
              onClick={() => toggleZone(zone.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '6px',
                background: isApproved
                  ? 'rgba(34, 197, 94, 0.12)'
                  : 'var(--theme-elevation-100, #1c1e22)',
                border: isApproved
                  ? '1px solid #22c55e'
                  : '1px solid var(--theme-elevation-150, #2a2e35)',
                cursor: isEditable ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  marginTop: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isApproved ? '#22c55e' : 'var(--theme-elevation-150, #27272a)',
                  border: isApproved ? 'none' : '1px solid var(--theme-elevation-300, #52525b)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                {isApproved ? '✓' : ''}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: isApproved ? 600 : 500,
                      color: isApproved ? '#86efac' : 'var(--theme-elevation-800, #e2e8f0)',
                    }}
                  >
                    {zone.icon} {zone.label}
                  </span>
                  {wasRequested && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        letterSpacing: '0.02em',
                      }}
                      title="The applicant asked for this zone"
                    >
                      Applicant Asked
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: isApproved ? 'rgba(134, 239, 172, 0.8)' : 'var(--theme-elevation-400, #8590a2)',
                    marginTop: '2px',
                    lineHeight: 1.3,
                  }}
                >
                  {zone.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--theme-elevation-400, #8590a2)' }}>
        {field?.admin?.description || 'Official stadium access zones authorised by NUSC Club Staff for this pass holder.'}
      </div>
    </div>
  );
};

/**
 * Equipment Declared by Applicant
 * Displays declared equipment clearly with human-readable tags & icons
 */
export const PressEquipmentField: React.FC<{ path?: string; field?: any; readOnly?: boolean }> = ({
  path = 'equipmentCarried',
  field,
  readOnly,
}) => {
  const { value, setValue, disabled } = useField<any>({ path });
  const selectedKeys = normalizeArray(value);
  const isEditable = !readOnly && !disabled;

  // Read applicant equipment other notes if available
  const equipmentOtherNote = useFormFields(([fields]) => fields.equipmentOther?.value as string | undefined);

  const toggleEquipment = useCallback(
    (id: string) => {
      if (!isEditable) return;
      const next = selectedKeys.includes(id)
        ? selectedKeys.filter((k) => k !== id)
        : [...selectedKeys, id];
      setValue(next);
    },
    [isEditable, selectedKeys, setValue]
  );

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--theme-elevation-800, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Equipment Declared by Applicant</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '999px',
              background: selectedKeys.length > 0 ? 'rgba(234, 179, 8, 0.15)' : 'var(--theme-elevation-150, #334155)',
              color: selectedKeys.length > 0 ? '#facc15' : 'var(--theme-elevation-400, #94a3b8)',
              border: selectedKeys.length > 0 ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid transparent',
            }}
          >
            {selectedKeys.length} {selectedKeys.length === 1 ? 'item' : 'items'} declared
          </span>
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '8px',
          padding: '12px',
          background: 'var(--theme-elevation-50, #131518)',
          borderRadius: '8px',
          border: '1px solid var(--theme-elevation-150, #27272a)',
        }}
      >
        {EQUIPMENT_DEFINITIONS.map((eq) => {
          const isSelected = selectedKeys.includes(eq.id);
          return (
            <div
              key={eq.id}
              onClick={() => toggleEquipment(eq.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: isSelected
                  ? 'rgba(234, 179, 8, 0.12)'
                  : 'var(--theme-elevation-100, #1c1e22)',
                border: isSelected
                  ? '1px solid #eab308'
                  : '1px solid var(--theme-elevation-150, #2a2e35)',
                cursor: isEditable ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '16px' }}>{eq.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#fef08a' : 'var(--theme-elevation-800, #e2e8f0)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {eq.label}
                </div>
              </div>
              {isSelected && (
                <span style={{ fontSize: '11px', color: '#facc15', fontWeight: 'bold' }}>✓</span>
              )}
            </div>
          );
        })}

        {/* Display custom equipment items entered by applicant */}
        {selectedKeys
          .filter((k) => !new Set(EQUIPMENT_DEFINITIONS.map((e) => e.id)).has(k))
          .map((custom) => (
            <div
              key={custom}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid #eab308',
              }}
            >
              <div style={{ fontSize: '16px' }}>📦</div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#fef08a',
                  wordBreak: 'break-word',
                }}
              >
                {custom}
              </div>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => toggleEquipment(custom)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '0 4px',
                  }}
                  title="Remove item"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
      </div>

      {equipmentOtherNote && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'var(--theme-elevation-100, #1c1e22)',
            border: '1px dashed var(--theme-elevation-200, #3f3f46)',
            fontSize: '12px',
            color: 'var(--theme-elevation-700, #cbd5e1)',
          }}
        >
          <strong style={{ color: 'var(--theme-elevation-900, #f8fafc)' }}>Other Equipment Note: </strong>
          {equipmentOtherNote}
        </div>
      )}

      <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--theme-elevation-400, #8590a2)' }}>
        {field?.admin?.description || 'Cameras, lenses, laptops, audio recorders, tripods.'}
      </div>
    </div>
  );
};
