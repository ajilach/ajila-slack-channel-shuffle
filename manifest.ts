import { Manifest } from "deno-slack-sdk/mod.ts";
import { ShuffleMembersDefinition } from "./functions/shuffle_members.ts";

export default Manifest({
  name: "Channel Shuffle",
  description: "Erstellt eine zufällige Rangliste aller Mitglieder eines Channels",
  icon: "assets/default_new_app_icon.png",
  functions: [ShuffleMembersDefinition],
  workflows: [],
  outgoingDomains: [],
  botScopes: [
    "channels:read",
    "groups:read",
    "users:read",
    "chat:write",
    "chat:write.public",
  ],
});
