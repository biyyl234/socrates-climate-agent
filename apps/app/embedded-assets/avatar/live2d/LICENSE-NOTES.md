# Asset license notes — apps/avatar

## 1. Live2D sample model: Haru (Cubism 3/4 compatible)

- **Source (repository):** Live2D official `CubismWebSamples`, `Samples/Resources/Haru/`
  - https://github.com/Live2D/CubismWebSamples/tree/develop/Samples/Resources/Haru
- **Sample page:** https://www.live2d.com/en/learn/sample/haru-receptionist/
- **License type:** Live2D Free Material License Agreement (sample character data).
  - https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html
- **Scope allowed for a qualifying user:** General User / Small-Scale Enterprise
  (most recent fiscal year sales below 10,000,000 JPY) may use the material for
  commercial and non-commercial purposes under the agreement. Users outside
  that definition must obtain Live2D's prior written approval before use.
- **What was kept:** model definition (`.model3.json`), moc3 binary, physics,
  pose, expression `.exp3.json`, motion `.motion3.json`, textures, parameter
  groups and hit areas under `public/live2d/Haru/`.
- **What was deliberately excluded:** bundled sample `.wav` voice files. The
  Free Character License restricts redistribution of sound data, so the
  `Sound` fields were removed from `Haru.model3.json`. Motion playback does not
  rely on those local voices; TTS audio arrives separately over the protocol.

## 2. Cubism runtime core: `live2dcubismcore.min.js`

- **Local copy:** `public/vendor/live2dcubismcore.min.js`
- **Official runtime download:** https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js
- **License:** Live2D Proprietary Software License Agreement. The core may be
  bundled unchanged with the application under the same qualifying-user terms;
  do not modify, reverse-engineer or redistribute it separately.
  - https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html

## 3. License restrictions to respect at demo / distribution time

Per the free material and proprietary EULAs, the material must not be used to:

- compete with or be used as middleware competing with Live2D's products;
- remove, alter or obscure trademark, copyright, ownership or agreement notices;
- produce illegal, obscene, violent, insulting, discriminatory, grotesque,
  political or religious expressions;
- infringe third-party rights, harm creator reputation, or mislead users into
  confusing this work with an official Live2D product;
- sell or redistribute user-created 2D/3D models, illustrations or figures that
  deform/use the material.

## 4. Character-fit caveat

Haru is an official free sample and does not match the target "older male
scholar" look. This is a sanctioned MVP fallback per report §2.8.2; a purchased
or custom scholar model can replace the contents of `public/live2d/Haru/`
without changing any code or protocol.

## 5. Rendering engine (third-party, not Live2D)

- `@jannchie/pixi-live2d-display@1.4.0` — community fork of
  `pixi-live2d-display`, PixiJS v8 compatible, MIT-style plugin license; see its
  npm page: https://www.npmjs.com/package/@jannchie/pixi-live2d-display
- Engine and adapter are isolated inside `apps/avatar` so the renderer stack can
  be swapped without touching the app shell or the frozen postMessage protocol.
