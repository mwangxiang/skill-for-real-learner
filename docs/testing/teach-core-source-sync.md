# teach-core Source Sync and Rollback Contract

> Date: 2026-08-24  
> Matt source: `0ab1b63a410a03d3627979a109c8695de27af954` / plugin `1.2.3`  
> Transformation policy: version `1`

## Result

`skills/teach-core` now matches the locked Matt `skills/productivity/teach`
source after exactly these allowed transformations:

1. `SKILL.md` frontmatter `name: teach` → `name: teach-core`.
2. Remove `disable-model-invocation: true` from `SKILL.md`.
3. `agents/openai.yaml` display name `Teach` → `Teach Core`.
4. Remove `policy.allow_implicit_invocation: false` from
   `agents/openai.yaml`.

The four format files are byte-identical to the locked source. No local
teaching behavior is allowed in `teach-core`; product additions remain in
`teach-me` or a separately named wrapper.

## Deterministic command

```powershell
node scripts/sync-teach-core.mjs --source <matt-teach-dir>
node scripts/sync-teach-core.mjs --source <matt-teach-dir> --check
```

The script first validates every source SHA-256 in `SOURCE_LOCK.json`. It then
applies only the four transformations above. `--check` performs no writes and
fails if either the source hash, expected transformed hash, or target bytes do
not match.

## Verified hashes

| File | Upstream SHA-256 | Transformed SHA-256 |
|---|---|---|
| `SKILL.md` | `3377485cbb1d62782122c1cc8cab4ceb37d5457c0543889784f3d7d9ca359e04` | `feae173cfbf53597e283b349f0eb5372f3b86e22114e946e597e45d5b1b6bd5b` |
| `MISSION-FORMAT.md` | `44ea82d5f57a626086bde99c70cd229cdef67998e8502c1cbcd50504f57f989a` | same |
| `RESOURCES-FORMAT.md` | `377e70f83d41fdc2623037410600194655a2f7df41000925c24cc437da074ab5` | same |
| `GLOSSARY-FORMAT.md` | `22f851b265a3bec5a333937cc7ff1250136c9b6512787ae2eb51a2a14e35c341` | same |
| `LEARNING-RECORD-FORMAT.md` | `d49c754ea416a075534d0ba1428a0beba1327ae527c2d1af0333908d08e25d05` | same |
| `agents/openai.yaml` | `80e96a4d492ad8538e609672361e8543b69e7b22ce83be0efc2e5532472ede69` | `9fd8c132fbe5966f1bc55f354ef38cd1b74aaa5061c5a28510e7ad094756d3e2` |

## Update gate

1. Refresh Matt into an immutable staging directory and verify its manifest.
2. Update the locked Matt commit and raw upstream hashes on a dedicated branch.
3. Run the sync script. Any unmatched transformation pattern fails loud.
4. Review the old-upstream → new-upstream diff and the transformed target diff.
5. Run `--check`, `pnpm run test:pure-skills`, the official DSH Skill unit
   tests, and the keyless explicit-invocation Web E2E.
6. Only then set `packaging_allowed: true`, build a new tarball, and record its
   SHA-256.

## Rollback

Rollback selects the previous Git commit, `SOURCE_LOCK.json`, and already
verified tarball. It never reverse-patches or deletes the user's learning
workspace. After checkout, rerun `--check` against the corresponding immutable
Matt source and verify the tarball checksum before reinstalling it.
