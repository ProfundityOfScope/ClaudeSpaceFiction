# The ship view

How the ship is meant to look when it is managed: a description thorough enough to rebuild the view from, written for whoever builds it in the iOS app.

The owner's verdict on the schematic described here: "this is basically how I want the game to look." The final ship will differ in looks and in what it can do. The way of seeing it is settled.

| File | What it is |
|---|---|
| `ship-view.html` | The working schematic. Open it in a browser. It is one file with no dependencies beyond two web fonts. |
| `ship-view.png` | The view at rest |
| `ship-view-page.png` | The view with a district picked, beside the end-on key and the readout |
| `ship-view-turning.png` | Part-way through a turn, with one face fading |

The schematic is also a private Artifact, "Spine and Slices": https://claude.ai/artifact/PdZb9FH3UHpGHwkq382oE8

![A long grey ship seen from above at an angle. Coloured blocks are stacked outward to the left and right of a central spine, with more blocks showing beneath. An engine bell is at the lower left, a pale disc at the upper right, a green planet below and a small yellow star at the upper left.](ship-view.png)

## The idea

The ship is a city built round a spine. You never see all of it at once. The ship is cut along a plane through the spine and you look down on the cut from above, at the angle isometric games use. The districts lying in the cut spread out to the left and right of the spine. The districts beneath it show past them. Everything above the cut is taken away. A button turns the ship about its spine, which brings the next part of the city into the cut.

Below the ship is the body it is parked at. Behind it is the star.

## The ship

Lengths are in stations: one unit is one station along the spine. The axis runs from the stern at low x to the bow at high x. The schematic has nine stations, numbered from the stern.

**The spine** is a prism with as many sides as the ship has faces. The schematic offers four, six or eight, and opens on six. The distance from the axis to a side is 0.5. It runs from 1.3 behind the first station to 0.7 past the last.

**Fixed structure**, all of it centred on the axis:

| Part | Along the spine | Radius | Sides |
|---|---|---|---|
| Engine block | 2.0 to 0.35 behind the first station | 1.25 | as the spine |
| Engine bell | 3.0 to 2.0 behind | 1.75 at the stern, narrowing to 0.8 | 12 |
| Ice shield at the bow | 0.7 to 1.05 past the last station | 2.5, narrowing to 2.1 | 12 |

**Districts** are boxes. Each stands on one face of the spine and points straight out from it. A district is placed by three things:

- **Station**: where along the spine, and how many stations it spans (one to three).
- **Face**: which side of the spine it is built on. Face k points at an angle of k × 360° / faces round the axis.
- **Tier**: how far out it stands. Tier 1 is on the spine itself. Tier 2 is built on a tier 1 district, and tier 3 on a tier 2.

The stacking is what gives the ship its stepped outline, and the owner asked for it by name:

- Tiers are about 1.05, 0.85 and 0.7 tall, each varied by 15% either way.
- Each tier is narrower across the face than the one beneath: 1, 0.86 and 0.72 of the full width.
- The full width is a little more than the face of the spine: `2 × (0.5 + 0.5) × tan(180° / faces) × 0.9`. Districts therefore overhang the spine's edges and nearly meet their neighbours.
- An upper tier on a block longer than one station is set back half a station at one end.
- Boxes stop 0.06 short of each station boundary, so neighbours along the spine show a gap.

Which districts exist, and of what kind, is random in the schematic. That part is filler, not design.

## The cut, and what is drawn

The cut is a plane that contains the axis. With six faces there are three such planes. Each can be seen from either side, so a full turn has six views. In view v, face v lies in the cut to the left of the spine (looking toward the bow) and the opposite face lies in it to the right.

Take a face's angle `a` measured round the axis from "lying in the cut, to the left", positive toward the viewer's side of the plane.

- **In the cut or beneath it** (`sin a ≤ 0`): drawn solid. Faces beneath are hidden in part by those in the cut, which is simply what the depth buffer does.
- **Above the cut**: not drawn.
- **Crossing the cut during a turn**: a face rising out of the cut fades out, and the one coming down into it fades in. Its strength is `1 − smoothstep(d / step)`, where `d` is its angle above the plane (`min(a, 180° − a)`) and `step` is the angle between faces.

Three things the owner decided here, each after seeing the alternative:

- **The plane is not drawn.** No deck, no ground.
- **No ghosts.** Showing the hidden faces at 90% transparent was tried, at the owner's request, and dropped.
- **Districts do not stand on the cut.** A version that treated the cut as a deck with buildings on it was not what was meant.

One thing decided without asking, which the owner has seen and not objected to: the districts lying in the cut are drawn whole. Half of each is above the plane. Slicing them at it would give every one a flat top at the same level.

## The camera

An orthographic camera, 30° above the plane of the cut and 45° round from the spine. This is the common pixel-art isometric: lines along the spine and across the cut both run at a slope of 2 across to 1 up.

In view space, x is along the spine, y is across the cut (positive to the left, looking toward the bow) and z is up out of the cut. With `mid` the middle station:

```
screen x = ox + ((x − mid) − y) × 0.7071 × unit
screen y = oy − (((x − mid) + y) × 0.3536 + z × 0.8660) × unit
nearness =     −((x − mid) + y) × 0.6124 + z × 0.5
```

So the spine runs from lower left to upper right, the left-hand face spreads to the upper left, the right-hand face to the lower right, and "up out of the cut" is straight up the screen. `nearness` is the depth: larger is nearer.

A face of the ship is turned into view space by its angle `a`: a point `u` out from the axis and `w` across the face sits at `y = u cos a − w sin a`, `z = u sin a + w cos a`.

`unit`, `ox` and `oy` are chosen so that the whole ship fits the frame however it is turned: 95% of the width or 93% of the height, whichever binds. The frame is 0.72 as tall as it is wide.

## Light and colour

Three flat tones per surface and no gradients. The light comes from the star: upper left and somewhat above.

- A surface's light is `−0.5 nx + 0.25 ny + 0.83 nz` for its normal in view space.
- Above 0.62 it is drawn at 1.14 of its colour. Above 0.2, at 0.88. Otherwise at 0.6.
- In practice: tops are bright, ends facing the stern are mid, and sides facing the near edge are dark.

Every edge between two things is a one-pixel line of near-black (16, 18, 24). A picked district is brightened by 34 and outlined in the game's pale teal (143, 211, 200).

Colours in the schematic, all placeholders:

| Thing | RGB |
|---|---|
| Habitat | 198, 180, 142 |
| Farms | 134, 166, 96 |
| Yards | 192, 124, 86 |
| Tanks | 112, 138, 176 |
| Hold | 152, 130, 114 |
| Hangars | 98, 164, 160 |
| Optics | 154, 134, 190 |
| Spine | 122, 126, 138 |
| Engine block | 92, 96, 110 |
| Engine bell | 70, 73, 86 |
| Ice shield | 196, 222, 234 |

The kinds were chosen to echo the prototype's refit tracks, on the thought that each track becomes a place on the ship.

## The backdrop

Painted once and never redrawn. Positions are fractions of the frame's width W and height H.

- **Space**: near-black (4, 6, 11), with about one pixel in 300 a dim grey star.
- **The star**: a flat yellow disc (255, 214, 10) at (0.115 W, 0.15 H), radius 0.016 W. Round it, out to 2.6 radii, a halo of scattered darker pixels that thins with distance.
- **The parent body**: a disc centred at (0.76 W, 1.10 H) with radius 0.72 H, so that only its upper left shows, rising behind the ship from the bottom right. Four greens from dark to light, chosen per pixel from how well the star lights that point of the sphere, broken up by a speckle and a 4×4 ordered dither. A one-pixel rim of the brightest green on the lit limb.

In the game the body is whatever the ship is parked at, and the star takes the colour of its kind. The owner's sketch had a green planet and a yellow star, and the schematic copies it.

## Pixels

The picture is drawn small and shown large, with hard edges.

- The drawing is a few hundred pixels wide whatever the screen: the frame's width divided by the whole number that brings it nearest to 360.
- It is shown at that whole-number scale with nearest-neighbour sampling. Nothing is smoothed.
- Fills are flat and edges are not anti-aliased.

## How the schematic draws it

It is a small software renderer. The order matters more than the code:

1. Copy the backdrop.
2. Draw everything solid with a depth buffer: the fixed structure, and every face in or beneath the cut. Alongside the colour, keep an id for each pixel saying what was drawn there.
3. Draw outlines: any pixel whose id differs from the pixel to its right or below becomes a line.
4. For each face crossing the cut (there are at most two, and only during a turn): draw it on a sheet of its own, hidden wherever something solid is nearer, then lay the sheet over the picture at the face's strength, outlines included.
5. The id buffer is also what a tap is looked up in. A tap takes the nearest thing within two pixels.

For the app this suggests: a depth attachment, an id attachment for outlines and picking, and outlines as a pass that reads the ids. Whether districts are true boxes with pixel textures, or sprites drawn per view, is not decided. Boxes are what make the turn animate for free.

## Turning

- One press turns the ship by one face. Arrow keys do the same.
- 560 ms for one face, and 140 ms more for each further face (up to three) when a tap asks for a turn of several. Ease in and out.
- With reduced motion set, it jumps.
- The picture is only redrawn while turning or when something changes. At rest it costs nothing.

## The end-on key

Beside the main view is the same ship seen along the spine, as a cross-section at one station. It is what makes the cut understandable, and the owner asked for it to be kept as first drawn.

![The schematic with a sand-coloured district picked and outlined. To its right a diagram of six wedges round a grey disc, in three rings, with a dashed vertical line through the middle and the left half hatched. Beneath, a readout: Habitat, station 5 to 6, face A, tier 1.](ship-view-page.png)

- Each face is a wedge round a disc for the spine, split into three rings for the tiers. A ring is filled with the district's colour where one exists at that station.
- It turns with the ship. A face at angle `a` is drawn toward `(−sin a, −cos a)` on the page, so the face lying in the cut to the left is at the top.
- The cut is a dashed vertical line. The half to its left is what has been cut away, and is hatched. Wedges there are drawn faintly.
- A small eye at the lower left marks where the picture is seen from: above the cut, toward its near edge.
- Face letters sit round the rim. Tapping a face turns the ship to bring it to the top.
- A stepper moves the station. A pale band round the spine in the main view marks the same station.

## What a tap gives

Picking a district shows its kind, its station or span of stations, its face and where that face is in the current view (in the cut to the left or right, beneath it, or above it), and its tier with what it is built on. Picking the spine, the engine or the shield names the part.

## Still open

- **How many faces.** The owner said four to six "slice angles". The schematic reads that as faces: six faces, three planes, six views a turn. If it meant planes, the ship has twelve faces.
- **The final ship.** The owner expects changes to its looks and to what it does. Earlier descriptions ask for sectors that are swapped in and out, people moving about as tiny dots, things to tap, and refits that show.
- **Where the panels go.** The two-screen concept in this folder puts a glass pane over a map. How that pane sits over this view has not been drawn.
