> 🎶 I use nothing but-uh hee-doc
>
> 🎵 Writing all the time
>
> – Elvis

(And yes I named this package only for the Elvis pun).

This package extracts your JSDoc comments and renders them in a certain way.
You can also provide your own renderers, see [below](#custom-renderers).

## Installation

```sh
npm install -D heedoc
```

## Usage

Hee doc, shee doc, we all doc but we need an output.

### CLI

```sh
npx markdown-reference ./reference.md \
  --entry src/builder/main-barrel.ts \
  # optional
  --watch \
  # optional
  --pick-exports variable1,func2,myClass,etc
  # or
  --omit-exports variable1,func2,myClass,etc
```

### Programmatic

### Custom renderers
