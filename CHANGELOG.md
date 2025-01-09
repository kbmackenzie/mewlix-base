# `mewlix-base` - Changelog

## 1.4.0

- Base library:
    - Changed [`std.repeat`](kbmackenzie.xyz/projects/mewlix/std#std-repeat) function: it now returns a shelf with the collected values.
    - Added [`std.sequence`](kbmackenzie.xyz/projects/mewlix/std#std-sequence) function.
    - Fixed `std.all` function.
    - Fixed how *"nothing"* values are handled by `type of`.
    - Fixed serialization for boxes.
- Graphic template:
    - Added better loading screen (+ with progress bar!).
    - Fixed broken methods in the `Vector2` clowder.
    - Fixed conversion from `Color` clowder to hexcode.
    - Removed `GridSlot` clowder (reason: largely unused).
