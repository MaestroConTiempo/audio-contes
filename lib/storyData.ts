export interface StoryOption {
  id: string;
  name: string;
  icon?: string;
}

export interface StoryField {
  id: string;
  title: string;
  required: boolean;
  needsName: boolean;
  inputType?: 'select' | 'text';
  placeholder?: string;
  options: StoryOption[];
}

export const storyFields: Record<string, StoryField> = {
  hero: {
    id: 'hero',
    title: 'Tu héroe*',
    required: true,
    needsName: true,
    options: [
      { id: 'girl', name: 'Una niña', icon: '👧' },
      { id: 'boy', name: 'Un niño', icon: '👦' },
      { id: 'mom', name: 'Una mamá', icon: '👩' },
      { id: 'dad', name: 'Un papá', icon: '👨' },
      { id: 'grandma', name: 'Una abuela', icon: '👵' },
      { id: 'grandpa', name: 'Un abuelo', icon: '👴' },
      { id: 'custom', name: 'Mi propio héroe', icon: '🦸' },
    ],
  },
  sidekick: {
    id: 'sidekick',
    title: 'El personaje secundario',
    required: false,
    needsName: true,
    options: [
      { id: 'monster', name: 'Un monstruo', icon: '👹' },
      { id: 'fox', name: 'Un zorro', icon: '🦊' },
      { id: 'bear', name: 'Un oso', icon: '🐻' },
      { id: 'snake', name: 'Una serpiente', icon: '🐍' },
      { id: 'rabbit', name: 'Un conejo', icon: '🐰' },
      { id: 'bird', name: 'Un pájaro', icon: '🐦' },
      { id: 'custom', name: 'Mi propio personaje', icon: '✨' },
    ],
  },
  object: {
    id: 'object',
    title: 'El objeto',
    required: false,
    needsName: false,
    options: [
      { id: 'coat', name: 'Un abrigo', icon: '🧥' },
      { id: 'wand', name: 'Una varita', icon: '🪄' },
      { id: 'map', name: 'Un mapa', icon: '🗺️' },
      { id: 'flashlight', name: 'Una linterna', icon: '🔦' },
      { id: 'key', name: 'Una llave', icon: '🔑' },
      { id: 'book', name: 'Un libro', icon: '📖' },
      { id: 'custom', name: 'Mi propio objeto', icon: '🧰' },
    ],
  },
  place: {
    id: 'place',
    title: 'El lugar*',
    required: true,
    needsName: false,
    options: [
      { id: 'attic', name: 'Un desván', icon: '🏚️' },
      { id: 'forest', name: 'Un bosque', icon: '🌲' },
      { id: 'cave', name: 'Una cueva', icon: '🕳️' },
      { id: 'beach', name: 'Una playa', icon: '🏖️' },
      { id: 'mountain', name: 'Una montaña', icon: '⛰️' },
      { id: 'castle', name: 'Un castillo', icon: '🏰' },
      { id: 'custom', name: 'Mi propio lugar', icon: '🧭' },
    ],
  },
  moral: {
    id: 'moral',
    title: '¿Qué pasará?',
    required: false,
    needsName: false,
    inputType: 'text',
    placeholder: 'Ej: El héroe debe encontrar un mapa y ayudar a su amiga.',
    options: [],
  },
  language: {
    id: 'language',
    title: 'Idioma*',
    required: true,
    needsName: false,
    options: [
      { id: 'es', name: 'Español', icon: '🇪🇸' },
      { id: 'ca', name: 'Català', icon: '🏴' },
      { id: 'en', name: 'English', icon: '🇺🇸' },
    ],
  },
  narrator: {
    id: 'narrator',
    title: 'El narrador*',
    required: true,
    needsName: false,
    options: [
      { id: 'OPFGXzbjTxC8s9nJbglQ', name: 'Rubén', icon: '🧔' },
      { id: 'tXgbXPnsMpKXkuTgvE3h', name: 'Elena', icon: '👩' },
      { id: '6Kc26SMEaG6swH53OgIE', name: 'Una ratita', icon: '🐭' },
    ],
  },
};

export interface StorySelection {
  optionId?: string;
  optionName?: string;
  customName?: string;
  freeText?: string;
  icon?: string;
}

export type StoryState = Record<string, StorySelection>;
