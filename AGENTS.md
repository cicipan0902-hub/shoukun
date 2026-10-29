# Agent instructions

Check the working tree and remotes before editing. Preserve existing files and uncommitted work.

This is an existing interactive virtual phone framework. Users usually want to add a story, not rebuild the phone. Read docs/ARCHITECTURE.md, docs/PROGRESS.md, docs/AI_STORY_GUIDE.md and docs/STORY_SCHEMA.md.

Prefer editing stories/template/story.json. stories/blank/story.json remains a blank starting point. Keep story data separate from UI code and player saves. Accept natural language, chat records, images and event requirements as author input; convert them to validated structured story data. Ask about missing major plot decisions and use reasonable defaults for minor details.

Reuse the Phone Runtime, App registry and event engine. Do not rewrite App UI or shared engines merely to add content. For a new App follow docs/APP_DEVELOPMENT.md. Keep stable IDs and versioned schemas. Reject arbitrary scripts, HTML and executable imports. Never copy private account data into a story.

Run npm run story:validate, npm run story:test and npm run build after story changes. Add passing paths for every new ending, including passwords, hidden content, calls and cross-App events. Preview the result and check saves. For engine changes also run typecheck, lint, unit and relevant browser tests. Report unverified device behavior honestly; App registration is not complete app-specific fidelity.

Preserve MIT, dependency licenses and source copyright notices. Do not automatically Fork, Star, Push or publish. Inspect existing remotes before proposing a target repository. Forking is a user workflow, not an MIT requirement. Confirm public release scope before upload. Exclude local backups, private media, credentials, caches and development-only image assets.

## Campus V0.2 authoring workflow

This fork also has docs/AUTHORING_ZH.md and docs/FEATURE_AUDIT_V02.md. Read them for future campus content edits. Canonical cast: stories/foundation/characters.json (id is the existing AI ID, storyId is the existing contact ID). Media manifest: assets.json. Additive content: extensions.json. Chapters, media bindings and whitelisted minigames: project.json. Preserve existing stories/foundation/story.json unless the user explicitly asks to change those records.

Use npm run author:check, npm run foundation:validate, npm run foundation:test and npm run author:build. Run npm run test:assets for asset importer changes. Never manually edit work/campus/story.json, public/work.json or dist; these are generated. Author notes and development tools must not appear in production bundles. Keep age, grade, birthday and school placeholders null until the author confirms them.

Do not change stable story/contact IDs or silently migrate/delete browser saves. Same-revision additions merge variable defaults; revision changes keep upstream restart behavior. The current source snapshot has no .git history; do not pretend it is a Git clone or push remote changes. Preserve licenses and use only authorized local media.

## Campus V0.3 active chapter

Default project.json now selects chapter-01.json + chapter-01.extensions.json, with a separate work ID shoukun-good-weather and revision 1. Do not mix the old five-person demo into this chapter or migrate/reset its saves. The original source story.json and extensions.json remain intact, and project-demo.json selects them for regression tests. CAMPUS_PROJECT can select a project file. author-reserve.json is author only and must never be bundled: the four-boy group excludes owner, and moment-zeyu-05 is private. Current timeline uses story.dayLabel instead of inventing a formal date. The uploaded .webp files are actually JPEG bytes: preserve originals; assets.json points at byte-identical .jpg copies. Keep 15 initial Moments, nine hidden future posts, three genuine choice nodes and no early Zhu private messages.

## V0.4 choice chat and chapter 2

Default project keeps the first chapter files unchanged and adds chapter-02.json through additionalExtensionsFiles. interactions.json is the reusable flow/choice/friendship configuration. Read docs/CHAPTER02_AUTHORING_ZH.md. Keep main Work ID and revision unchanged for existing saves. New chapter entry is after chapter-01 completion, not an injected start state. No free input in the active campus WeChat; only scripted choices, ordered/delayed NPC messages, and read-only archives of older free messages.

Initial friends are brother and zuohang. star and junhao remain controlled nonfriends until validated story events. Do not derive WeChat friends from public posts or group speakers. Temporary culture-festival group is separate from the original author-only four-boy group. Zhu application is optional via ch02.addZhuAtEnd, false by default. Keep physical photos unchanged; shared portraits resolve from original contact cards at display time. Preserve message unlock order, friend status, pending timers and prior chapter completions when restoring.

## V0.4.1 user clarification

Friendship gates authors of Moments as well as private chats and contacts. Preserve the original 15 posts in data but hide six nonfriend posts in new saves. A new brother-forwarded weather post provides the chapter 1 read trigger; keep the original weather gate for old saves. Initial player-visible feed has 10 posts. Newly unlocked posts appear first; plot-post titles and direct Moments guidance must be visible.

## Third chapter and private diary

Default project additionally loads chapter-03.json. Reuse activity documents in interactions.json for roster/scene UI; source is src/authoring/documents.ts. Keep previous flow arrays and generated IDs unchanged. New controls must guard chapter stage and required review flags. Read docs/CHAPTER03_AUTHORING_ZH.md and docs/MEMO_WRITING_ZH.md. memo-plan.json is author-only and must not be bundled. Formal chapters require a substantial, event-linked player memo. First chapter memo has an explicitly authorized prose expansion with the same ID and unlock chain.

NPC story IDs lifei and jiaqi start as nonfriends and are only met in the seven-person owner-inclusive work group. Do not expose the four-boy private group, silently accept Zhu as a friend, fabricate recordings or treat a text Demo note as playable audio. Chapter 3 keeps the existing Work/revision, accepts chapter 2 completed saves, and reserves chapter-04-pending on completion.

## Chapter four and media review

Default project additionally loads chapter-04.json. Read docs/CHAPTER04_AUTHORING_ZH.md. Preserve the original 12 third-chapter paths and its flow arrays; chapter 3 only adds a black-pen handoff sentence. Row profiles now expand in place and submitted review remains read-only. Chapter 4 has three equally valid Demo responses and mutually exclusive memos. Reuse audio-junhao-demo; without a real file show the explicit text-review fallback, never fake a duration or playback. media-review document items must bind audio, not an image.

chapter04-author-notes.json and memo-plan.json remain author-only. Zhu's private observation is not player knowledge, the four-boy group stays private, and chapter 4 does not add Zhu as a friend. Chapter 5 is only chapter-05-pending with actual/declared duration fields unconfirmed; do not create its story before the author asks.
