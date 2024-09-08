The base library + project templates for [Mewlix][1], a cat-themed esoteric programming language that compiles to vanilla Javascript, with templates for making little web applications and little HTML5 games.

**Note:** The Mewlix compiler's main repository already includes all templates as `.zip` files. If you're building from source, you do **not** need to build the templates yourself.

## Building

To build the base library and templates, run `npm run build`.

The build process includes compiling + minifying source files, constructing the templates and generating `.zip` files for each template.

**Note:** The build script is only meant to run on GNU/Linux, and depends on the [zip][2] utility.

![Looping animation of a cartoon cat playing with a ball of yarn.](https://github.com/kbmackenzie/mewlix/wiki/imgs/cat-yarnball.webp)

[1]: https://github.com/kbmackenzie/mewlix
[2]: https://man.archlinux.org/man/zip.1.en
