# Admitted alpha.23 desktop evidence

Alpha.23 passed the focused Electron desktop matrix against the local Pilot
runtime integration.

## Results

- 1280×720: panel 320px; nav 319px and contained.
- 1600×900: panel 320px; nav 319px and contained.
- 1920×1080: panel 320px; nav 319px and contained.
- Pointer drag: panel widened to 444px.
- Keyboard: 16px and Shift+64px steps; final measured width 492px.
- 200% zoom: frame `clientWidth=960`, `scrollWidth=960`.
- New blank session: panel count became 0.
- Final desktop: no renderer errors and no frame overflow.

## Primary evidence

- `runtime.json`
- `08-alpha23-final-desktop.png` — SHA-256 `F626686D480DB6F5F72C2ED33FB5F8E750D632AE3BE0D04836B841AD63411C69`
- `05-alpha23-pointer-resized.png` — SHA-256 `379EFDC9916F491F73A94C98559C8E7818F1368CEFA1CC4D9375A436465AF5E8`
- `07-alpha23-blank-session-closed.png` — SHA-256 `91106C4C0C8B0DD103DE662B8CC7E06B9AB64C69FD8CFBA5294412141C253E17`

The install tarball is
`release/mwangxiang-dsh-visual-learner-0.1.0-alpha.23.tgz`, SHA-256
`80E7C414B746E831F7F31CF75B188C97003433B6BF69D64DAC7B6248ADF9B386`.
