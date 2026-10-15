---
title: "The football field drawing"
version: "1.0"
status: final
created_by: "Claude"
created_at: "2026-10-15T01:00"
last_modified_by: "Claude"
last_modified_at: "2026-10-15T01:00"
contributors:
  - "Claude"
  - "Marcel Gavriliu"
tags:
  - "css551"
  - "assets"
  - "football"
related:
  - path: "../CREDITS.md"
    desc: "provenance of every model asset"
  - path: "../football/FOOTBALL.md"
    desc: "the ball thrown over it"
  - path: "../../../../tools/make-field-texture.py"
    desc: "the script that made huskies_field.jpg and measured the numbers below"
---

# The football field drawing

`huskies_field.jpg` (900 × 536 px) is a drawing of the Husky Stadium field at the University of Washington; its
logos and marks (the W, the Pac-12 shield, Alaska Airlines) belong to their owners. Marcel supplied the drawing
(`Washington-Huskies.jpeg`, kept in the course's private copy); its original source is not recorded. The white
background outside the field-level outline is filled with dark ground; everything else is as drawn.

## Where its lines are

| Line | In the drawing | Real |
| ---- | -------------- | ---- |
| End lines (the outer edges of the end zones) | x = 53.5 and 855.5 px | 109.73 m apart |
| Sidelines | y = 90.5 and 447.5 px | 48.77 m apart |

That is 7.309 px per meter along the field and 7.320 across. The field's center, pixel (454.5, 269), goes on the
field frame's (25, 0, 55), the middle of the coordinate box.

## The plane that carries it

One plane on the ground, **123.138 m along z by 73.223 m along x**: the drawing's long side on the field frame's
z, its "HUSKIES" end zone at the z = 0 end.

| Track | Center | Orientation |
| ----- | ------ | ----------- |
| WebGL (right-handed) | (25.137, 0, 54.384) | `PlaneGeometry(123.138, 73.223)`; matrix columns: its x on +z, its y on +x, its normal on +y |
| Unity (left-handed) | (24.863, 0, 54.384) | a Quad scaled (123.138, 73.223, 1), `Quaternion.LookRotation(Vector3.down, Vector3.left)` |

The drawing's top edge goes toward +x in WebGL and toward -x in Unity: the same numbers describe mirror-image
worlds in the two (right-handed against left-handed axes), and the turn chosen in each keeps the lettering readable
from above. At 7.3 px per meter the drawing is soft in close-ups.

## Making it again

```bash
python3 tools/make-field-texture.py     # writes huskies_field.jpg and prints the plane's size and centers
```

---

## Change Log

| Version | Date             | Author | Summary       |
| ------- | ---------------- | ------ | ------------- |
| 1.0     | 2026-10-15T01:00 | Claude | Initial: the field drawing Marcel supplied, measured and placed in both tracks |
