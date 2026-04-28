# Unified Search build

This document captures the planned homepage/search redesign for MN Recovery Hub.

Trigger phrase:

- `Unified Search build`

When the user says that phrase, implement the feature set below unless they explicitly narrow or change scope.

## Goal

Replace the current homepage's split navigation model with a single primary entry point:

- one unified search across resources, meetings, and events
- one browse mode for directory-specific navigation
- lighter homepage chrome with less top-level visual competition

## Product direction

### Homepage behavior

1. Remove the top navigation bar from the homepage only.
2. Keep top navigation on inner pages such as:
   - resources
   - meetings
   - events
   - support list
   - mission
   - admin
3. Make the homepage feel like a focused intake/search experience.

### Primary search mode

The `What are you looking for?` panel becomes a true unified search that queries:

- `resources`
- `meetings`
- `events`

The search should accept natural-language prompts such as:

- `food tonight`
- `women's AA meeting in St. Paul`
- `recovery event this weekend`
- `housing and job help near Minneapolis`

### Browse mode

Rename/rework `Browse by Category` into a directory-first mode:

- `Resources`
- `Meetings`
- `Events`

After the user chooses one of those, show directory-specific filters and navigation for that dataset.

## UX structure

### Homepage layout

1. Hero/header without top nav
2. Unified search as the primary interaction
3. Secondary tab or segmented control for:
   - `Search Everything`
   - `Browse by Directory`
4. Directory picker cards for:
   - Resources
   - Meetings
   - Events
5. Contextual filters appear only after a directory is selected

### Unified search results

Results should be grouped by type instead of mixed into one flat stream:

- `Resources`
- `Meetings`
- `Events`

Recommended default behavior:

- return top matches for each type
- show grouped sections with counts
- allow `View all` within each type

### Directory-specific filters

#### Resources

- category
- subcategory
- city/location
- pathway tags
- eligibility/population
- gender focus where applicable

#### Meetings

- pathway: `AA`, `NA`
- day
- time
- format
- keyword/location search

#### Events

- event category
- date or month
- virtual vs in-person
- city/location

## Technical implementation plan

### 1. Homepage shell

- make homepage render without the standard top nav
- preserve the existing nav on all inner routes
- likely implement with route-aware layout logic in:
  - `src/App.tsx`
  - or a shared layout wrapper

### 2. Unified search API

Create or extend a single API endpoint that can search all three datasets:

- resources
- meetings
- events

Recommended response shape:

```ts
type UnifiedSearchResponse = {
  query: string;
  sections: {
    resources: Resource[];
    meetings: Meeting[];
    events: RecoveryEvent[];
  };
  counts: {
    resources: number;
    meetings: number;
    events: number;
  };
};
```

Recommended endpoint:

- `POST /api/search/unified`

### 3. Unified ranking behavior

Search should not let one dataset swamp the others.

Use grouped ranking with per-type scoring:

- resources ranked by relevance to need + location + pathway fit
- meetings ranked by fellowship + day/time + keyword/location
- events ranked by title/category/date/location

Return grouped top results first rather than a single merged list.

### 4. Homepage UI state

Build a client-side mode switch:

- `searchEverything`
- `browseDirectory`

For `browseDirectory`, track:

- selected directory
- selected filters for that directory

### 5. Directory result views

Resources, meetings, and events should each use their own result cards and filters, not a forced universal card.

### 6. Reuse existing logic where possible

Prefer reusing:

- resource search extraction/ranking where useful
- existing meetings filter patterns
- existing events list patterns

Avoid duplicating large blocks of logic if the current code can be adapted.

## Suggested execution order

1. Remove homepage nav and adjust homepage layout
2. Build unified search API
3. Build homepage `Search Everything` UI
4. Rework `Browse by Category` into `Browse by Directory`
5. Add directory-specific filter panels
6. Build grouped results view
7. Verify behavior in browser locally
8. Push only after user approves or asks

## Acceptance criteria

The build is considered complete when:

1. Homepage has no standard top nav
2. Homepage primary search queries resources, meetings, and events together
3. Unified results are grouped by dataset
4. Browse mode starts with `Resources`, `Meetings`, and `Events`
5. Each directory shows its own relevant filters
6. Inner pages still keep the normal navigation
7. Mobile and desktop layouts remain clean and readable

## Notes

- This is a saved future build plan, not an automatically active feature.
- Only start implementation when the user explicitly says:
  - `Unified Search build`
