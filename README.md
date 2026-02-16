# Quantum Simultion

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![For-Dummies-Approved](https://img.shields.io/badge/skill%20level-professional%20dumbass-green.svg)
![Shiny-Things](https://img.shields.io/badge/contains-shiny%20things-yes.svg)

## What is this? 🤔

Okay, so you know how in school they told you atoms look like tiny solar systems with **`balls`** spinning around other **`balls`**? **They lied!**

Real atoms are weird, fuzzy clouds of probability where electrons are just... _vibing_ in random places until you look at them. This tool draws those fuzzy clouds using math that is way too hard to understand, but it looks **really cool**.

TLDR; It makes pretty glowing clouds that are actually scientifically accurate atoms.

## Cool Stuff It Does

- **No Fake News:** It doesn't use the lazy "Core" shortcuts. It draws _every single electron_ cloud, even the ones deep inside that usually get ignored.
- **3D Spinny Thing:** You can spin the atom around and fly through it like a tiny spaceship.
- **2D Circle Thing:** There's also a classic "Solar System" view in the corner because old habits die hard (and it helps you see which shell is which).
- **Pretty Colors:** You can change the colors! Want a "Matrix" green atom? A "Cyberpunk" neon atom? Go for it.
- **Smart Nucleus:** The middle part (nucleus) actually has the right number of protons and neutrons packed together like a gumball machine.

## How to Make It work?

You need a computer and a thing called `Node.js` installed. If you don't know what that is, ask a nerd friend or Google "install nodejs".

### Installation

Download the libraries needed to run this app.

```bash
git clone #this current git repo
cd quantum-simulation
npm install
npm run dev
```

Then look at your terminal. It will say something like Local: http://localhost:5173.
Control-click that link (or copy it into Chrome). BOOM. ATOMS. PRETTY.

## How to Add New Atoms

Want to see something cool like Lithium? You can add it yourself!

- Go to the flder `src/atoms/`
- Make a new file called `lithium.json`
- Copy-paste this and change the numbers ("Google lithium electron configuration" if you are stuck!)

```json
{
  "name": "Lithium",
  "symbol": "Li",
  "atomicNumber": 3,
  "description": "It's in batteries. Don't eat it.",
  "nucleus": { "protons": 3, "neutrons": 4, "color": "#ff6b6b" },
  "orbitals": [
    {
      "name": "1s",
      "n": 1,
      "l": 0,
      "m": 0,
      "maxElectrons": 2,
      "currentElectrons": 2,
      "color": "#4ecdc4",
      "opacity": 0.2
    },
    {
      "name": "2s",
      "n": 2,
      "l": 0,
      "m": 0,
      "maxElectrons": 2,
      "currentElectrons": 1,
      "color": "#95e1d3",
      "opacity": 0.3
    }
  ]
}
```

- Save the file. The website will magically update itself. You don't even have to refresh.

## Controls

- Left Click + Drag: Spin the atom around
- Scroll Wheel: Zoom in to see the nucleus, Zoom out to see the whole cloud
- Right Click + Drag: Move the camera sideways
- The Menu: Click the dropdowns to change atoms or colors. It's pretty intuitive

## Quick note

I am not sure if all the example configs in `src/Atoms` are correct. It was late at night and I didn't want to double check them..

## License

MIT License. (This means you can steal this code and I won't sue you, just be nice).
