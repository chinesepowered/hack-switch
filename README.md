<div align="center">

<img src="art/mascot.png" alt="Yuzu the capybara" width="260">

# CapyTales

**A bedtime-story studio in your family chat.** Four capybara agents and your family share one
[Switch](https://github.com/sandbox-quantum/switch) room: a kid asks for a story, Mochi writes it,
Pebble draws every page, a grown-up approves, Yuzu reads it aloud, and Tofu binds a storybook and
remembers it for tomorrow night.

<img src="art/avatars/yuzu.png" width="96" alt="Yuzu"> <img src="art/avatars/mochi.png" width="96" alt="Mochi"> <img src="art/avatars/pebble.png" width="96" alt="Pebble"> <img src="art/avatars/tofu.png" width="96" alt="Tofu">

*Yuzu reads · Mochi writes · Pebble draws · Tofu binds*

</div>

> Built for the Flip the Switch hackathon (Track 02: personal or creative workflow).

## What happens in the room

1. **Mia (6)** asks `@capy-mochi` for a story: "a capybara who's scared of the hot spring".
2. **Mochi** reads the room's *Story bible* (characters, places, what Mia loves, what to avoid),
   writes 6 to 8 short pages and hands them to `@capy-pebble` with the story attached.
3. **Pebble** draws every page from the CapyTales art kit and posts the pictures in the room.
4. **A grown-up** reads it. If it's right for tonight, they ask `@capy-yuzu` to read it.
   Only a grown-up can: Yuzu's addressing policy admits her owner and nobody else.
5. **Yuzu** narrates it with ElevenLabs (a warm, young female voice) and passes the recording to `@capy-tofu`.
6. **Tofu** binds a read-along storybook (words light up as Yuzu reads), a PDF and a story video,
   posts them, and updates the Story bible so tomorrow's story remembers tonight's.

Grandma Nana is in the room too, on her own account. She can add a memory ("tell the one about our
trip to the lake") and Mochi weaves it in.

## How Switch is used

CapyTales is a Switch room, and every step depends on that room:

| Need | Switch feature |
| --- | --- |
| A family and four agents in one conversation, in the chat app the family already uses | A Switch **room** bridged to Mattermost here (Slack, Discord, Telegram and Teams work the same way) |
| Kids can ask for stories, only grown-ups can approve reading | Per-agent **addressing policies**: Mochi and Tofu take `anyone`, Pebble `owner-agents`, Yuzu `owner` |
| Capybaras hand work to each other | Agents **address each other** in the room; the family sees every hand-off |
| Story files move between agents | Room **attachments** (`send_attachment` / `download_attachment`) |
| Tomorrow's story remembers tonight's | The **Story bible**, a room **document** Tofu maintains |
| Any family can set it up in one step | One **template** (`templates/capytales.template.yaml`) creates the four agents, the room, the bible and the kickoff |
| Swap the model behind a capybara without losing the story world | Context lives in the room, not in the agent |

## Run it

You need Docker, Node 20+, a Claude Code (or Codex or OpenCode) login on the machine that runs the
agents, and an [ElevenLabs](https://elevenlabs.io) API key for Yuzu.

```bash
./stack/up.sh        # Switch 0.31.0 + Mattermost + the Switch dashboard, in Docker
./stack/family.sh    # demo family accounts: Sam (parent), Mia, Nana
```

Then create the room from `templates/capytales.template.yaml`, from Switch Console (Templates)
or by asking switch-buddy to run it. Give the machine that runs Yuzu `ELEVENLABS_API_KEY`.

### Try the tools on their own

```bash
cd tools && npm install && cd ..
echo "ELEVENLABS_API_KEY=..." > .env              # never commit this file
node tools/capytales.mjs elements                 # what a scene can contain
node tools/capytales.mjs scene spec.json p1.png   # draw a page
node tools/capytales.mjs narrate stories/demo     # read story.json aloud
node tools/capytales.mjs bind stories/demo        # storybook.html, .pdf, cover.png, story.mp4
```

## What's in here

| Path | What |
| --- | --- |
| `templates/capytales.template.yaml` | The Switch template: four capybaras, the room, the Story bible, the kickoff |
| `tools/` | `capytales` CLI: scene drawing (SVG art kit), ElevenLabs narration with word timings, storybook binding |
| `art/` | Original capybara mascot, avatars and fonts (Nunito and Baloo 2, SIL OFL) |
| `stack/` | Scripts that run a local Switch server with Mattermost |

## Credits

Built on [Switch](https://github.com/sandbox-quantum/switch) (Apache 2.0 with Commons Clause).
Narration by [ElevenLabs](https://elevenlabs.io). Fonts: Nunito and Baloo 2 (SIL Open Font License).
All capybara art is original, drawn in code with `tools/lib/capykit.mjs`.
