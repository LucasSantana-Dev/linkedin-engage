---
name: area-preset-authoring
description: Add new area presets (professional verticals) to LinkedIn Engage for Connect, Companies, and Jobs modes. Use when adding or updating presets in connect-config.js, search-templates.js, or search-language.js.
metadata:
  owner: linkedin-engage
  tier: project
---

# Area Preset Authoring

Use this skill whenever you add, rename, or remove professional area presets (verticals) across the extension.

## Files to edit (always all three)

| File | What to change |
|---|---|
| `extension/lib/connect-config.js` | AREA_PRESETS, AREA_PRESET_VALUES, COMPANY_AREA_PRESETS, COMPANY_AREA_PRESET_VALUES, ROLE_PRIORITY, AREA_LABELS, STATE_TAG_VERSION |
| `extension/lib/search-templates.js` | AREA_FAMILY_MAP, SEARCH_TEMPLATES (Connect + Companies + Jobs entries) |
| `extension/lib/search-language.js` | TERM_VARIANTS, TERM_ALIASES |
| `tests/connect-config.test.js` | Update STATE_TAG_VERSION assertion, add preset coverage tests |

## Preset key naming conventions

- Single-word verticals: `tech`, `finance`, `marketing`, `sales`
- Hyphenated sub-presets within a family: `tech-frontend`, `tech-devops`, `tech-ml-ai`
- Creative family: `graphic-design`, `art-direction`, `ui-ux`, `motion-design`
- Regulated family: `environmental-engineering`, `sanitary-engineering`

## Preset family assignments (AREA_FAMILY_MAP)

| Family | Members |
|---|---|
| `tech` | tech, tech-frontend, tech-backend, tech-fullstack, tech-devops, tech-data, tech-cloud, tech-security, tech-mobile, tech-ml-ai |
| `business` | finance, real-estate, marketing, sales |
| `talent` | headhunting |
| `regulated` | legal-judicial-media, environmental-engineering, sanitary-engineering, healthcare, education |
| `creative` | graphic-design, art-direction, branding, ui-ux, motion-design, video-editing, videomaker |
| `custom` | custom |

When adding a new preset, assign it to an existing family OR define a new one (requires adding a `connect.<family>.*` fallback template too).

## Checklist: adding a new preset `my-preset`

### connect-config.js

1. **AREA_PRESETS** — Add `'my-preset': { role: [...], industry: [...] }` after the parent family's last entry.
   - role: 4–6 quoted strings using LinkedIn search-friendly quoted phrases
   - industry: 4–6 terms covering the discipline's industry context

2. **AREA_PRESET_VALUES** — Append `'my-preset'` after its parent preset key.

3. **COMPANY_AREA_PRESETS** — Add `'my-preset': { defaultQuery: '...', defaultTargetCompanies: [...] }` after `videomaker` (or last tech sub-preset if in tech family).
   - defaultQuery: OR-chain of 3–4 key search phrases for company search
   - defaultTargetCompanies: 12–20 companies (global leaders + Brazil-focused scale-ups)

4. **COMPANY_AREA_PRESET_VALUES** — Append `'my-preset'`.

5. **ROLE_PRIORITY** — Add primary roles after the family's last role entry. Higher = preferred when role list is trimmed.

6. **AREA_LABELS** — Add `'my-preset': { en: '...', pt: '...' }` for connection message templates.

7. **STATE_TAG_VERSION** — Bump by 1 (triggers migration for existing users).

### search-templates.js

8. **AREA_FAMILY_MAP** — Add `'my-preset': 'family-name'`.

9. **SEARCH_TEMPLATES (Connect)** — Add at least:
   - `connect.my-preset.peer_networking.balanced`
   - Optionally `connect.my-preset.recruiter_outreach.precise`

10. **SEARCH_TEMPLATES (Companies)** — Add:
    - `companies.my-preset.talent_watchlist.balanced`

11. **SEARCH_TEMPLATES (Jobs)** — Add:
    - `jobs.my-preset.high_fit_easy_apply.precise`

### search-language.js

12. **TERM_VARIANTS** — Add EN/PT-BR variants for every unique role and industry term used in the new preset that isn't already covered.

13. **TERM_ALIASES** — Add reverse PT-BR → EN mappings for each PT-BR variant added.

## Template schema reference

### Connect template
```js
{
    id: 'connect.my-preset.peer_networking.balanced',
    mode: 'connect',
    areaPreset: 'my-preset',
    usageGoal: 'peer_networking',           // recruiter_outreach | peer_networking | decision_makers | brazil_focus
    expectedResultsBucket: 'balanced',      // precise | balanced | broad
    querySpec: {
        role: ['role one', 'role two'],     // unquoted, lowercase — compiler quotes multi-word
        industry: ['industry one'],
        market: ['latam'],                  // brazil | latam | global | nearshore
        level: ['mid-level', 'senior']      // precise | mid-level | senior | lead
    },
    filterSpec: {
        degree2nd: true,
        degree3rd: true,
        activelyHiring: false
    },
    defaults: { roleLimit: 6 }
}
```

### Companies template
```js
{
    id: 'companies.my-preset.talent_watchlist.balanced',
    mode: 'companies',
    areaPreset: 'my-preset',
    usageGoal: 'talent_watchlist',          // talent_watchlist | brand_watchlist | competitor_watch
    expectedResultsBucket: 'balanced',
    querySpec: {
        keywords: ['keyword one', 'keyword two']
    },
    filterSpec: { batchSize: 10 },
    defaults: {
        targetCompanies: ['Company A', 'Company B']
    }
}
```

### Jobs template
```js
{
    id: 'jobs.my-preset.high_fit_easy_apply.precise',
    mode: 'jobs',
    areaPreset: 'my-preset',
    usageGoal: 'high_fit_easy_apply',       // high_fit_easy_apply | market_scan | target_company_roles
    expectedResultsBucket: 'precise',
    querySpec: {
        roleTerms: ['role one', 'role two'],
        locationTerms: ['remote', 'brazil'],
        keywords: ['easy apply']
    },
    filterSpec: {
        easyApplyOnly: true,
        workType: '2',                      // 1=onsite 2=remote 3=hybrid
        experienceLevel: '4'                // 1=internship 2=entry 3=assoc 4=mid-senior 5=director
    },
    defaults: {
        preferredCompanies: ['...'],
        excludedCompanies: []
    }
}
```

## Template resolution order

When no exact match exists for a preset, the engine falls back:
1. Exact `areaPreset` match
2. Family match (`AREA_FAMILY_MAP[preset]`)
3. `any` match
4. `custom` default

This means every new sub-preset inherits its family's fallback templates automatically. Add dedicated templates only where the fallback is too generic.

## Validation

Run before committing:

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
```

Manual checks:
- Popup area preset selector shows the new preset label in EN and PT
- Companies preset selector shows the new preset and fills defaultQuery + defaultTargetCompanies
- Jobs preset selector loads role terms from the new preset
- Search query generated matches expected structure for each mode
