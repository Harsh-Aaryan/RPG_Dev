export const KENNEY = {
  ghost: "/assets/kenney/graveyard/character-ghost.glb",
  keeper: "/assets/kenney/graveyard/character-keeper.glb",
  skeleton: "/assets/kenney/graveyard/character-skeleton.glb",
  zombie: "/assets/kenney/graveyard/character-zombie.glb",
  rocks: "/assets/kenney/graveyard/rocks.glb",
  rocksTall: "/assets/kenney/graveyard/rocks-tall.glb",
  obelisk: "/assets/kenney/graveyard/pillar-obelisk.glb",
  pillar: "/assets/kenney/graveyard/pillar-large.glb",
  pine: "/assets/kenney/graveyard/pine.glb",
  lantern: "/assets/kenney/graveyard/lantern-glass.glb",
  crypt: "/assets/kenney/graveyard/crypt-small.glb",
  altar: "/assets/kenney/graveyard/altar-stone.glb",
  pumpkin: "/assets/kenney/graveyard/pumpkin.glb",
} as const;

export interface Placement {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  height: number;
}

export const ARENA_PROPS: Placement[] = [
  { url: KENNEY.crypt, position: [-3.15, 0, -1.7], rotation: [0, 0.4, 0], height: 1.25 },
  { url: KENNEY.altar, position: [2.85, 0, -1.55], rotation: [0, -0.35, 0], height: 0.62 },
  { url: KENNEY.pine, position: [-3.7, 0, -2.55], rotation: [0, 0.2, 0], height: 1.85 },
  { url: KENNEY.pine, position: [3.85, 0, -2.15], rotation: [0, 1.1, 0], height: 1.65 },
  { url: KENNEY.obelisk, position: [-1.55, 0, -3.15], rotation: [0, 0.2, 0], height: 1.7 },
  { url: KENNEY.obelisk, position: [1.7, 0, -3.25], rotation: [0, -0.3, 0], height: 1.5 },
  { url: KENNEY.pillar, position: [0.1, 0, -3.55], rotation: [0, 0.6, 0], height: 1.35 },
  { url: KENNEY.rocks, position: [-3.55, 0, 1.55], rotation: [0, 0.8, 0], height: 0.48 },
  { url: KENNEY.rocks, position: [3.6, 0, 1.45], rotation: [0, 0.2, 0], height: 0.42 },
  { url: KENNEY.rocksTall, position: [3.15, 0, -3.05], rotation: [0, 1.4, 0], height: 0.72 },
  { url: KENNEY.lantern, position: [-2.85, 0, 0.35], rotation: [0, 0.9, 0], height: 0.78 },
  { url: KENNEY.lantern, position: [2.9, 0, 0.45], rotation: [0, -0.6, 0], height: 0.74 },
  { url: KENNEY.pumpkin, position: [1.15, 0, 2.85], rotation: [0, 0.4, 0], height: 0.32 },
  { url: KENNEY.pumpkin, position: [-1.25, 0, 2.95], rotation: [0, 1.2, 0], height: 0.28 },
];

export const ARENA_CHARACTERS: Placement[] = [
  { url: KENNEY.keeper, position: [0.15, 0, 3.35], rotation: [0, Math.PI, 0], height: 1.35 },
  { url: KENNEY.skeleton, position: [-2.15, 0, 2.85], rotation: [0, Math.PI * 0.78, 0], height: 1.28 },
  { url: KENNEY.zombie, position: [2.2, 0, 2.75], rotation: [0, -Math.PI * 0.78, 0], height: 1.26 },
];
