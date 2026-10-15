---
title: "The stadium model"
version: "1.0"
status: final
created_by: "Claude"
created_at: "2026-10-14T23:50"
last_modified_by: "Claude"
last_modified_at: "2026-10-14T23:50"
contributors:
  - "Claude"
  - "Marcel Gavriliu"
tags:
  - "css551"
  - "assets"
  - "models"
related:
  - path: "../CREDITS.md"
    desc: "provenance of every model asset"
  - path: "../football/FOOTBALL.md"
    desc: "the ball that is thrown in it"
  - path: "../../../../tools/convert-stadium-blend.py"
    desc: "the Blender script that made the GLB, OBJ and textures from the original"
---

# The stadium model

**Credit:** "Soccer and American football stadium" by **ericchip1983**, from BlendSwap
(<http://www.blendswap.com/blends/view/74526>), licensed **Creative Commons Attribution 3.0**. Any use must credit
ericchip1983; `74526 - Soccer and American football stadium  - License.html` is the license page as it came with the
model. Changes for this course: the American-football layer only (the soccer pitch, goals, corner flags and end-line
boards dropped, and the handrails), the array and curve modifiers applied, the benches, roof and stands lightened to
about 108,000 faces, the materials rebuilt for today's renderers, the field texture laid on a plane at the real field
size, scaled to meters, and the GLB compressed with meshopt.

**Its frame:** origin at the center of the field, long axis on **z**, y up, meters. The field is 109.73 m between the
end lines and 48.77 m between the sidelines; the goalposts stand on the end lines. In the course's field frame (the
coordinate box: x 0 to 50, z 0 to 110) it is placed by one translation, `T(25, 0, 55)`.

| File | What it is | Use it in |
| ---- | ---------- | --------- |
| `stadium.glb` | glTF 2.0 binary, meshopt-compressed (2.3 MB), textures inside | three.js: `GLTFLoader` with `setMeshoptDecoder(MeshoptDecoder)` (both in `lib/vendor/`) |
| `stadium.obj` + `stadium.mtl` | the same mesh as text, 19 materials | Unity (native import) |
| `stadium_*.jpg` | the field, concrete, signs, flags, screen and ad textures | both, through the MTL |

The original `.blend` (91 MB) and the downloaded archive stay in the course's private copy.

## WebGL (three.js)

```javascript
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../../../vendor/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('../../../assets/models/stadium/stadium.glb', onStadiumLoaded);
```

## Unity

Drag `stadium.obj`, `stadium.mtl` and the `stadium_*.jpg` files into `Assets` together; drop the imported model on
PassScene's Stadium Prefab. Glass (the suites) comes in opaque; set its material's Surface Type to Transparent if
you want to see through it.

## Making it again

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b "lib/assets/models/stadium/Soccer stadium.blend" \
    --python tools/convert-stadium-blend.py
npx gltfpack@0.24.0 -i lib/assets/models/stadium/stadium.glb -o lib/assets/models/stadium/stadium.glb -cc -kn -km
```

---

## Change Log

| Version | Date             | Author | Summary       |
| ------- | ---------------- | ------ | ------------- |
| 1.0     | 2026-10-14T23:50 | Claude | Initial: converted from ericchip1983's BlendSwap stadium, which Marcel found |
