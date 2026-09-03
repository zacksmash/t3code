# Talking heads

On web and desktop, T3 Code can float a pixel-art portrait in the upper-right corner of a
conversation. Select **Show talking head** in the conversation toolbar to show it, or use the same
button to hide it again.

The portrait keeps its mouth closed while the agent is idle or using tools. With legacy token
streaming enabled, its mouth follows assistant text streaming and stops as soon as the stream
finishes. With token streaming disabled, T3 Code receives the completed text block at once and the
mouth animates for roughly two to ten seconds based on the response length. A new User Question
prompt triggers a three-second animation. If your system requests reduced motion, the portrait
stays on its closed-mouth frame. Reloading the client always starts the portrait in its idle frame,
even if the last saved provider state still says a response was streaming. Switching conversations
also stops the previous conversation's portrait and sound immediately; the selected conversation
starts idle until it receives new output.

Talking heads also play quiet, class-specific retro dialogue blips while their mouth is moving. The
Archer and Healer speak in a higher register, the Knight and Rogue are deeper, the Wizard has a low
ominous tone, and the Robot and Slime use metallic and bubbly effects. Blips cluster within words,
pause at spaces, and pause longer at punctuation. You can mute the sound independently under
**Settings → Appearance → Talking head**. Browsers may wait for your first click or key press before
allowing dialogue sounds.

Open **Settings → Appearance → Talking head** to enable or disable the portrait and choose Robot,
Wizard, Knight, Rogue, Slime, Archer, or Healer. The Archer and Healer are female characters. These
preferences are stored on the current client, so browser and desktop installations can use different
choices. Talking heads are not currently available in the native iOS or Android apps.
