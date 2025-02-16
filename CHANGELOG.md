# `mewlix-base` - Changelog

## 1.5.0

- Base library:
  - Add bitwise operation functions to `std`.
  - Improve clowders! 🐱
  - Fix innaccurate error messages.

## 1.4.0

- Base library:
    - Changed `std.repeat` function: it now returns a shelf with the collected values.
    - Added `std.sequence` function.
    - Fixed `std.all` function.
    - Fixed how *"nothing"* values are handled by `type of`.
    - Fixed serialization for boxes.
- Change template structure to make language extensions simpler to implement.
- Add 'blank' template.
- Graphic template:
    - Added better loading screen (+ with progress bar!).
    - Fixed broken methods in the `Vector2` clowder.
    - Added **text assets**, manageable through the `graphic.load_text` and `graphic.get_text` functions.
    - Fixed conversion from `Color` clowder to hexcode.
    - Removed `GridSlot` clowder (reason: largely unused).
