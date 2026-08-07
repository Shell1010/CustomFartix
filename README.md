

# Custom SWF Build thingy
A custom Artix Game Launcher asar that allows you to replace SWFs with your own. Has dev tools enabled so you can access the networking tab (Ctrl + I) to view Asset URLs pulled by the client. 


https://github.com/user-attachments/assets/f7ff889e-6b88-4661-b993-2fea8f5b33f3

## Setup
Ignore the 3000 build scripts for some reason AE packaged that with their asar.

Find the Artix Game Launcher path, it should be somewhere in %AppData% for Windows users. For Linux users it's in `~/.config`. Replace the existing `app.asar` with this. If you want, rename the old asar as something like `backup.asar`.

For Windows users, this will create a config folder in `C:\Users\<YourUsername>\AppData\Roaming\CustomFartix` here you create a `rules.json` file where you input what URLs to replace, and point it to a local file on your machine to replace it with. For example:

```json
{
    "https://game.aq.com/game/gamefiles/items/pets/ArchFishPet.swf": "/home/amin/Pictures/swf-replace/ArchFishPet.swf",
    "https://game.aq.com/game/gamefiles/items/helms/NulgathArchfish.swf": "/home/amin/Pictures/swf-replace/NulgathArchfish.swf",
    "https://game.aq.com/game/gamefiles/items/capes/SturdySerpentSurprise.swf": "/home/amin/Pictures/swf-replace/SturdySerpentSurprise.swf",
    "https://game.aq.com/game/gamefiles/mon/monster-UltraMalg.swf": "/home/amin/Pictures/swf-replace/monster-UltraMalg.swf"
}
```
Example above I've specified Linux paths, but anyway you need to specify the full path for this to work. Also file name can be anything as long as its an SWF.

For linux users, the config folder is in `~/.config/CustomFartix`. Same setup.

## Editing SWFs
I have no idea how to edit flash things, I barely know what I'm doing. I use JPEXs Flash Decompiler to tweak Shapes from individual SWFs, use transformation tools on Sprites, and half assed my way to make it work. I'm sure someone can figure out how to animate things properly. While I myself do goofy things with this, you can potentially create your own custom weapons, armours, helms, etc, though this is entirely client sided.

Thinking of a way to get this working similar to Usrbg eventually, so that everyone with this asar can view others changes. Effectively making it so people can see each others custom assets. Though it'd still be client sided only for the majority playerbase without this asar. 


## Disclaimer
All this does is intercept request and does an in-place replacement of the response content, currently client sided so only you can see your own changes. All I added was this extra code, the rest is AE's slop so you can see the state of their code fr.

