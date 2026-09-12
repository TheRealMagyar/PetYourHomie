# Pet Your Homie

A Vencord / Equicord userplugin for marking people as homies, scheduling per-person message suggestions, and quickly preparing kind, flirty, or **Happy Femboy Friday** DM drafts.

This repository is the plugin folder itself. Clone it directly as `src/userplugins/petYourHomie`; do not copy the repository into another nested plugin directory.

## Features

- Add a homie from a user's right-click menu or by Discord ID.
- Create, rename, edit, or delete any event, including all bundled defaults.
- Configure each event's templates and default schedule.
- Add any number of Tenor GIF URLs to an event and append one randomly to each generated draft.
- Configure separate days and times for every homie and event.
- Replace `{name}` with the homie's nickname or Discord display name.
- Click a scheduled notification to open the correct DM and insert a draft.
- Use the heart button displayed directly on a homie's DM row to choose an event without right-clicking.
- Prepare any custom event draft from the user context menu at any time.
- Never send automatically: every draft remains editable and requires you to press Send.

## Folder layout

The valid installation layout is:

```text
Equicord/
└── src/
    └── userplugins/
        └── petYourHomie/
            ├── index.tsx
            ├── settings.tsx
            ├── styles.css
            └── types.ts
```

`index.tsx` must be directly inside `petYourHomie`. A nested `src/userplugins/petYourHomie/src/userplugins/petYourHomie` layout is invalid.

## Install

You must already have an Equicord or Vencord source tree. Userplugins are bundled during the client build and cannot be added to the prebuilt installer `.asar`.

### Windows — Command Prompt

```bat
cd /d "%USERPROFILE%\Documents\Equicord"
if not exist src\userplugins mkdir src\userplugins
git clone https://github.com/TheRealMagyar/PetYourHomie.git src\userplugins\petYourHomie
pnpm build
```

### Windows — PowerShell

```powershell
Set-Location "$env:USERPROFILE\Documents\Equicord"
New-Item -ItemType Directory -Path "src\userplugins" -Force | Out-Null
git clone https://github.com/TheRealMagyar/PetYourHomie.git "src\userplugins\petYourHomie"
pnpm build
```

### macOS / Linux

```sh
cd "$HOME/Documents/Equicord"
mkdir -p src/userplugins
git clone https://github.com/TheRealMagyar/PetYourHomie.git src/userplugins/petYourHomie
pnpm build
```

Use your Vencord source directory instead of `Equicord` if applicable. Fully restart Discord after the build, then open **Settings → Plugins → PetYourHomie** and enable it.

## venpm

After a release containing `plugins.json` is published:

```bat
npm.cmd install -g @kamaras/venpm
venpm config set vencord.path %USERPROFILE%\Documents\Equicord
venpm repo add https://github.com/TheRealMagyar/PetYourHomie/releases/latest/download/plugins.json --name pet-your-homie
venpm install petYourHomie
```

## Usage

1. Right-click a Discord user and open **Pet Your Homie 💛**.
2. Choose **Make this person a homie**.
3. Open the plugin settings to create or edit events, add optional Tenor GIF URLs, and configure days and times for that person.
4. Click the heart button on the homie's DM row for an immediate draft, use the right-click menu, or wait for a scheduled suggestion.

Scheduling uses the computer's local timezone. If Discord is not running at the scheduled time, the suggestion can still appear within the configured grace period. Use flirty or spicy templates only between consenting adults.

## Development

Place or clone this repository at `src/userplugins/petYourHomie` inside a current Vencord or Equicord source tree, then run:

```sh
pnpm exec eslint src/userplugins/petYourHomie
pnpm testTsc
pnpm build
```

The plugin is a client-side suggestion helper. It does not automate sending and does not call Discord API endpoints directly.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
