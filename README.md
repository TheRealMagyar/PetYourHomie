# Pet Your Homie

Pet Your Homie is a Vencord and Equicord userplugin for creating personal interaction reminders for your Discord friends.

Mark someone as a homie, create custom events, choose when each event should be suggested, and prepare an editable DM draft with an optional Tenor GIF. The plugin never sends messages automatically.

## Features

- Mark Discord users as homies from their context menu.
- Display a heart button directly on every configured homie's DM row.
- Create an unlimited number of custom events.
- Rename, edit, or delete every event, including the bundled defaults.
- Store multiple message templates for each event.
- Add multiple Tenor GIF URLs to an event.
- Configure different days and times for every homie and event.
- Show clickable scheduled notifications.
- Open the correct DM and insert an editable message draft.
- Replace `{name}` and `{id}` variables automatically.
- Keep all settings locally inside Vencord or Equicord.

## Default events

The first launch creates three example events:

- Happy Femboy Friday
- Kind message
- Flirty message

These are normal custom events. You can change their names, templates, GIFs, schedules, or delete them completely.

## Custom events

Open **Settings → Plugins → PetYourHomie → Settings**.

Each event contains:

- **Event name:** The label shown in the DM heart menu and user context menu.
- **Message templates:** One possible message per line. A random non-empty line is selected when creating a draft.
- **Tenor GIF URLs:** One optional HTTPS Tenor URL per line. A random valid GIF is appended to the draft.
- **Default schedule:** Determines how the event is configured when it becomes available to a homie.

Supported template variables:

| Variable | Replacement |
| --- | --- |
| `{name}` | The configured nickname, Discord display name, or username |
| `{id}` | The homie's Discord user ID |

Example templates:

```text
Happy Femboy Friday, {name}! 💖
I hope you are having a great day, {name}! 🫶
You crossed my mind, so here is a virtual hug. 🤗
```

## Tenor GIFs

Paste normal Tenor share links or direct Tenor media links into an event's **Tenor GIF URLs** field:

```text
https://tenor.com/view/example-gif-123456
https://media.tenor.com/example/tenor.gif
```

Only HTTPS links hosted on `tenor.com` or a `*.tenor.com` subdomain are accepted. Invalid and empty lines are ignored. If an event has several GIFs, one is selected randomly and inserted below the message.

## Using the plugin

### Add a homie

1. Right-click a Discord user.
2. Open **Pet Your Homie 💛**.
3. Select **Make this person a homie**.

You can also add a user by Discord ID in the plugin settings.

### Prepare an interaction immediately

1. Find the homie in the Direct Messages list.
2. Click the heart button displayed on their DM row.
3. Select one of your custom events.
4. Review the inserted message and optional GIF.
5. Press Send yourself when the draft is ready.

The same event menu remains available from the user's right-click context menu.

### Schedule suggestions

Every homie has an individual schedule for every event. Enable the event, select one or more weekdays, and choose a local time.

When the event becomes due, Pet Your Homie displays a notification. Clicking it opens the correct DM and inserts the generated draft. The notification is shown once per homie and event each day.

Scheduling uses the computer's local timezone. The configurable reminder window determines how long an event remains due after its scheduled time. Discord must be running during that window.

## Requirements

- Equicord or Vencord built from source
- Discord Desktop, Vesktop, or another supported desktop client
- A build with userplugin support

Prebuilt installer `.asar` files cannot load source userplugins directly.

## Correct folder layout

This repository is the plugin folder itself. Clone it directly into `src/userplugins/petYourHomie`:

```text
Equicord/
└── src/
    └── userplugins/
        ├── aiPlugin/
        └── petYourHomie/
            ├── index.tsx
            ├── settings.tsx
            ├── styles.css
            └── types.ts
```

Do not create another nested `src/userplugins/petYourHomie` directory inside the cloned repository.

## Manual installation

You must already have a working Equicord or Vencord source tree.

### Windows Command Prompt

```bat
cd /d "%USERPROFILE%\Equicord"
if not exist src\userplugins mkdir src\userplugins
git clone https://github.com/TheRealMagyar/PetYourHomie.git src\userplugins\petYourHomie
pnpm install
pnpm build
```

### Windows PowerShell

```powershell
Set-Location "$env:USERPROFILE\Equicord"
New-Item -ItemType Directory -Path "src\userplugins" -Force | Out-Null
git clone https://github.com/TheRealMagyar/PetYourHomie.git "src\userplugins\petYourHomie"
pnpm install
pnpm build
```

### macOS and Linux

```sh
cd "$HOME/Equicord"
mkdir -p src/userplugins
git clone https://github.com/TheRealMagyar/PetYourHomie.git src/userplugins/petYourHomie
pnpm install
pnpm build
```

Use the path to your Vencord source tree instead if you are using Vencord. Fully quit Discord, including its tray process, and restart it after the build. Then enable **PetYourHomie** under **Settings → Plugins**.

## Installation with venpm

```bat
npm.cmd install -g @kamaras/venpm
venpm config set vencord.path %USERPROFILE%\Equicord
venpm repo add https://github.com/TheRealMagyar/PetYourHomie/releases/latest/download/plugins.json --name pet-your-homie
venpm install petYourHomie
```

Point `vencord.path` at your actual Equicord or Vencord source directory if it is stored elsewhere.

## Updating

### Manual Git installation

From the Equicord or Vencord source root:

```sh
git -C src/userplugins/petYourHomie pull
pnpm build
```

### venpm installation

```sh
venpm update petYourHomie
```

Restart Discord after rebuilding or updating.

## Development

Place this repository at `src/userplugins/petYourHomie` inside a current Vencord or Equicord source tree, then run:

```sh
pnpm exec eslint src/userplugins/petYourHomie
pnpm testTsc
pnpm build
```

The standalone plugin index can be validated with:

```sh
npx --yes @kamaras/venpm validate plugins.json --strict
```

## Privacy and safety

- Pet Your Homie does not send messages automatically.
- It does not call private Discord API endpoints.
- Homies, events, schedules, and templates are stored in local plugin settings.
- Tenor URLs are inserted as text for Discord to embed; the plugin does not contact Tenor itself.
- Use flirty or spicy events only between consenting adults.

## License

Pet Your Homie is licensed under GPL-3.0-or-later. See [LICENSE](LICENSE).
