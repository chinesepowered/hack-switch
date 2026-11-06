# Four capybaras and a bedtime story: building CapyTales on Switch

*Draft for the Flip the Switch blog prize. Edit freely before publishing.*

🎬 Watch the 2-minute demo: https://www.youtube.com/watch?v=3CRI8Lrd6ck

Every parent knows the 8 pm request: "one more story, a new one, with the turtle from the lake."
CapyTales answers it with a family chat room where four capybara agents write, illustrate,
narrate and bind a brand-new bedtime story, and where a grown-up always has the last word.

It runs on [Switch](https://github.com/sandbox-quantum/switch), an open-source platform that puts AI
agents into the chat apps people already use. This post walks through how it fits together, what
Switch gave us for free, and the snags a first-time Switch builder is likely to hit.

## The idea in one room

Switch turns a chat channel into a **room** that holds people and agents. Ours is `capy-bedtime`:

- **People:** Sam (a parent), Mia (6) and Nana (grandma), each on their own chat account.
- **Agents:** four Claude Code agents, each with one job.
  - **Mochi** writes the story.
  - **Pebble** draws every page.
  - **Yuzu** reads it aloud with an ElevenLabs voice.
  - **Tofu** binds a read-along storybook, a PDF and a story video.

A story moves through the room like this:

1. Nana drops a memory: "Mia still talks about the littlest turtle at the lake."
2. Mia asks `@capy-mochi` for a story about a baby capybara who's scared of the hot spring.
3. Mochi writes a short story (7 or 8 pages) and hands it to `@capy-pebble`, with `story.json` attached.
4. Pebble draws every page and tells the grown-ups the story is ready.
5. Sam reads it and asks `@capy-yuzu` to read it to Mia.
6. Yuzu narrates it and passes the recording to `@capy-tofu`.
7. Tofu posts the story video and the books, and writes the story into the family's **Story bible**.

The next night, Mochi already knows Bean and Little Turtle.

## What Switch does for us

We wrote almost no glue. Switch already provides each piece the workflow needs:

**A room in the family's chat app.** We used Mattermost, which Switch's local stack starts for you.
The same room works on Slack, Discord, Telegram or Teams. The agents appear as separate chat members
with their own names and avatars, so the room reads like a conversation, not a bot log.

**Addressing policies: the parental gate.** Every agent has a rule for who may make it act:

| Agent | Addressing | Why |
| --- | --- | --- |
| Mochi | `anyone` | Kids should be able to ask for a story |
| Pebble | `owner-agents` | Only Mochi (or a parent) hands it work |
| Yuzu | `owner` | Only a parent can say "read it": that's the approval |
| Tofu | `anyone` | Anyone can ask for a book again |

When Mia tries `@capy-yuzu read it now!!`, Switch answers for Yuzu that it only takes instructions
from its owner, and nothing is read. The policy lives in Switch, not in a prompt the agent might
talk itself out of.

**Hand-offs by mention.** Agents address each other in the room the same way people do. The family
can see every step: "Mochi asked Pebble to illustrate", and Switch's activity cards show each agent
working in real time.

**Files as attachments.** `story.json`, the page pictures, the narration and the finished video
travel between agents as room attachments (`send_attachment` / `download_attachment`). No shared
disk, so each capybara could run on a different machine.

**Room documents as memory.** The Story bible (characters, places, what Mia loves, what to avoid,
stories so far) is a Switch room document. Mochi and Pebble read it before they start, and Tofu
updates it after every story. Because the context lives in the room rather than inside one agent,
you could swap the model behind Mochi and the story world would carry on.

**One template.** `templates/capytales.template.yaml` creates the four agents, the room with the
family in it, and a kickoff message that wakes the capybaras up. Any family can set up their own
room in one step.

## Running it without a desktop

Switch Console, the desktop app, is the friendly way to run agents. We built and recorded
everything on a headless Linux box instead, using pieces Switch ships:

- **The standalone Docker stack** (`deploy/local/standalone-docker-compose.yml`): Postgres,
  switch-core, the operator gateway and Mattermost. Our `stack/up.sh` pins it to a release and
  generates the secrets.
- **The headless agent controller** (`switch-agent-controller`): enrol the machine with a one-time
  code, and it runs the agents the server assigns to it, as Claude Code sessions.
- **`POST /gateway/rooms/from-template-document`**: the same request Switch Console sends to run a
  template. It checks everything (machine online, provider signed in, names free) before creating
  anything.

## Snags a first-time builder will hit

None of these were Switch bugs. They were our own assumptions, and each cost us a run:

1. **Agents start with a minimal environment.** Variables in the controller's `--env-file` are for
   the provider's own login, not for the agent's tools. Our tools couldn't find Playwright, its
   browsers or the ElevenLabs key until they learned to look for them on their own (`.env` in the
   repo, or `~/.config/capytales/env`).
2. **A document belongs to whoever created it.** We first seeded the Story bible from the
   template. Tofu then couldn't update it, because only a room document's creator can change it.
   Tofu explained this politely in the chat. Now Tofu creates the bible at kickoff, so it owns it.
3. **`{agent}` only resolves in a single-agent template.** In a team template, all four capybaras
   briefly shared a working folder literally named `{agent}`. Give each agent its own `directory:`.
4. **Agents tell you when they're stuck.** When narration failed, Yuzu said so in the room ("the
   ElevenLabs key isn't set up on my machine") instead of pretending. We put "never pretend it
   worked" in every agent's instructions, and it paid off.

## The capybaras' toolbox

The agents share one small command-line tool, `capytales`:

- `capytales scene spec.json p1.png`: Pebble describes a page as JSON (sky, moon, onsen, capybaras
  with moods and hats, ducklings, turtles), and an SVG art kit draws it. The characters stay
  consistent from page to page because they come from one kit, not from a model's imagination.
- `capytales narrate <story>`: Yuzu reads each page with ElevenLabs, using the endpoint that
  returns word-level timings.
- `capytales bind <story>`: Tofu builds a read-along storybook where each word lights up as Yuzu
  reads it, plus a PDF and an MP4 with captions over the sky.

## Try it

```bash
git clone https://github.com/chinesepowered/hack-switch && cd hack-switch
./stack/start.sh        # Switch + Mattermost + the agent controller
./stack/create-room.sh  # the capybaras and Mia's room, from the template
```

Then open Mattermost at http://localhost:8065, sign in as the parent, and ask `@capy-mochi` for a story.

Sweet capybara dreams. 🌙
