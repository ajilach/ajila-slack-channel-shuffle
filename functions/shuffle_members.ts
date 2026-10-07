import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const ShuffleMembersDefinition = DefineFunction({
  callback_id: "shuffle_members",
  title: "Channel mischen",
  description: "Zufällige Rangliste aller (menschlichen) Mitglieder eines Channels und postet sie",
  source_file: "functions/shuffle_members.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id, title: "Channel" },
    },
    required: ["channel_id"],
  },
  output_parameters: {
    properties: {
      ranking: { type: Schema.types.string, title: "Rangliste (Namen)" },
    },
    required: ["ranking"],
  },
});

export default SlackFunction(
  ShuffleMembersDefinition,
  async ({ inputs, client }) => {
    // 1. Alle Mitglieder holen (mit Pagination)
    const memberIds: string[] = [];
    let cursor: string | undefined = undefined;
    do {
      const res = await client.conversations.members({
        channel: inputs.channel_id,
        limit: 200,
        cursor,
      });
      if (!res.ok) {
        return { error: `conversations.members fehlgeschlagen: ${res.error}` };
      }
      memberIds.push(...res.members);
      cursor = res.response_metadata?.next_cursor || undefined;
    } while (cursor);

    // 2. Bots, Apps und deaktivierte Accounts entfernen
    const humans: { id: string; name: string }[] = [];
    for (const id of memberIds) {
      const u = await client.users.info({ user: id });
      if (u.ok && !u.user.is_bot && !u.user.deleted && id !== "USLACKBOT") {
        const name = u.user.profile?.display_name || u.user.real_name || u.user.name;
        humans.push({ id, name });
      }
    }

    // 3. Fisher-Yates-Shuffle
    for (let i = humans.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [humans[i], humans[j]] = [humans[j], humans[i]];
    }

    // 4. Nachricht mit Namen (ohne @-Mention, also ohne Benachrichtigung) posten
    const ranking = humans.map((h, i) => `${i + 1}. ${h.name}`).join("\n");
    const post = await client.chat.postMessage({
      channel: inputs.channel_id,
      text: humans.length
        ? `*Reihenfolge heute:*\n${ranking}`
        : "Keine Mitglieder gefunden.",
    });
    if (!post.ok) {
      return { error: `chat.postMessage fehlgeschlagen: ${post.error}` };
    }

    return { outputs: { ranking: ranking || "Keine Mitglieder gefunden." } };
  },
);
