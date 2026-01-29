export interface StoryOption {
  id: string;
  name: string;
  icon?: string;
  image?: string;
}

export interface StoryField {
  id: string;
  title: string;
  required: boolean;
  needsName: boolean;
  cardIcon?: string;
  inputType?: 'select' | 'text';
  placeholder?: string;
  options: StoryOption[];
}

export const storyFields: Record<string, StoryField> = {
  hero: {
    id: 'hero',
    title: 'Protagonista*',
    required: true,
    needsName: false,
    cardIcon: '🦸',
    options: [
      {
        id: 'luna-inventora',
        name: 'Luna, inventora de chicles elásticos',
        image: '/option-icons/heroes/luna-inventora.svg',
      },
      {
        id: 'bruno-domador',
        name: 'Bruno, domador de nubes',
        image: '/option-icons/heroes/bruno-domador.svg',
      },
      {
        id: 'vera-detective',
        name: 'Vera, detective de huellas de purpurina',
        image: '/option-icons/heroes/vera-detective.svg',
      },
      {
        id: 'iris-jardinera',
        name: 'Iris, jardinera de plantas que cantan',
        image: '/option-icons/heroes/iris-jardinera.svg',
      },
      {
        id: 'elia-pintora',
        name: 'Elia, pintora que dibuja puertas',
        image: '/option-icons/heroes/elia-pintora.svg',
      },
      {
        id: 'pablo-musico',
        name: 'Pablo, músico que afina el viento',
        image: '/option-icons/heroes/pablo-musico.svg',
      },
      {
        id: 'mara-guardiana',
        name: 'Mara, guardiana del reloj que atrasa',
        image: '/option-icons/heroes/mara-guardiana.svg',
      },
      {
        id: 'noa-cuidadora',
        name: 'Noa, cuidadora de monstruos tímidos',
        image: '/option-icons/heroes/noa-cuidadora.svg',
      },
      {
        id: 'adri-coleccionista',
        name: 'Adri, coleccionista de sonidos',
        image: '/option-icons/heroes/adri-coleccionista.svg',
      },
      {
        id: 'clara-bibliotecaria',
        name: 'Clara, bibliotecaria de cuentos que se mueven',
        image: '/option-icons/heroes/clara-bibliotecaria.svg',
      },
      {
        id: 'leo-chef',
        name: 'Leo, chef de sopas con superpoderes',
        image: '/option-icons/heroes/leo-chef.svg',
      },
      {
        id: 'sam-corredor',
        name: 'Sam, corredor de mapas',
        image: '/option-icons/heroes/sam-corredor.svg',
      },
      {
        id: 'carla-cientifica',
        name: 'Carla, científica de burbujas gigantes',
        image: '/option-icons/heroes/carla-cientifica.svg',
      },
      {
        id: 'martin-cartero',
        name: 'Martín, cartero de cartas sin destinatario',
        image: '/option-icons/heroes/martin-cartero.svg',
      },
      {
        id: 'ariadna-entrenadora',
        name: 'Ariadna, entrenadora de dragones mini',
        image: '/option-icons/heroes/ariadna-entrenadora.svg',
      },
      {
        id: 'iker-cuidador',
        name: 'Iker, cuidador de estrellas caídas',
        image: '/option-icons/heroes/iker-cuidador.svg',
      },
      {
        id: 'sofia-exploradora',
        name: 'Sofía, exploradora de cajones perdidos',
        image: '/option-icons/heroes/sofia-exploradora.svg',
      },
      {
        id: 'nico-nino',
        name: 'Nico, niño que entiende a los semáforos',
        image: '/option-icons/heroes/nico-nino.svg',
      },
      {
        id: 'ines-domadora',
        name: 'Inés, domadora de sombras traviesas',
        image: '/option-icons/heroes/ines-domadora.svg',
      },
      {
        id: 'gael-guardabosques',
        name: 'Gael, guardabosques de hojas brillantes',
        image: '/option-icons/heroes/gael-guardabosques.svg',
      },
      {
        id: 'custom',
        name: 'Mi propio protagonista',
        image: '/option-icons/misc/custom.svg',
      },
    ],
  },
  sidekick: {
    id: 'sidekick',
    title: 'El personaje secundario',
    required: false,
    needsName: false,
    cardIcon: '🧩',
    options: [
      {
        id: 'roco-robot',
        name: 'Roco, robot con corazón de cartón',
        image: '/option-icons/sidekicks/roco-robot.svg',
      },
      {
        id: 'coco-dragon',
        name: 'Coco, dragón que estornuda confeti',
        image: '/option-icons/sidekicks/coco-dragon.svg',
      },
      {
        id: 'gus-fantasma',
        name: 'Gus, fantasma que da cosquillas',
        image: '/option-icons/sidekicks/gus-fantasma.svg',
      },
      {
        id: 'taro-duende',
        name: 'Taro, duende del calcetín perdido',
        image: '/option-icons/sidekicks/taro-duende.svg',
      },
      {
        id: 'don-buho',
        name: 'Don Búho, profe de preguntas difíciles',
        image: '/option-icons/sidekicks/don-buho.svg',
      },
      {
        id: 'senor-nube',
        name: 'Señor Nube, llueve cuando ríe',
        image: '/option-icons/sidekicks/senor-nube.svg',
      },
      {
        id: 'chispa-luciernaga',
        name: 'Chispa, luciérnaga linterna',
        image: '/option-icons/sidekicks/chispa-luciernaga.svg',
      },
      {
        id: 'pelusa-monstruo',
        name: 'Pelusa, monstruo del polvo (educado)',
        image: '/option-icons/sidekicks/pelusa-monstruo.svg',
      },
      {
        id: 'mimi-gata',
        name: 'Mimi, gata astrónoma',
        image: '/option-icons/sidekicks/mimi-gata.svg',
      },
      {
        id: 'punk-erizo',
        name: 'Punk, erizo peluquero',
        image: '/option-icons/sidekicks/punk-erizo.svg',
      },
      {
        id: 'zeta-extraterrestre',
        name: 'Zeta, extraterrestre turista',
        image: '/option-icons/sidekicks/zeta-extraterrestre.svg',
      },
      {
        id: 'fito-pez',
        name: 'Fito, pez que quiere volar',
        image: '/option-icons/sidekicks/fito-pez.svg',
      },
      {
        id: 'lola-abeja',
        name: 'Lola, abeja arquitecta',
        image: '/option-icons/sidekicks/lola-abeja.svg',
      },
      {
        id: 'capitan-caracol',
        name: 'Capitán Caracol, experto en paciencia',
        image: '/option-icons/sidekicks/capitan-caracol.svg',
      },
      {
        id: 'pipo-raton',
        name: 'Pipo, ratón con gafas de mermelada',
        image: '/option-icons/sidekicks/pipo-raton.svg',
      },
      {
        id: 'ras-camaleon',
        name: 'Ras, camaleón que cambia de humor',
        image: '/option-icons/sidekicks/ras-camaleon.svg',
      },
      {
        id: 'oli-pulpo',
        name: 'Oli, pulpo malabarista',
        image: '/option-icons/sidekicks/oli-pulpo.svg',
      },
      {
        id: 'nina-sirena',
        name: 'Nina, sirena que odia mojarse',
        image: '/option-icons/sidekicks/nina-sirena.svg',
      },
      {
        id: 'rita-bruja',
        name: 'Rita, bruja de hechizos útiles',
        image: '/option-icons/sidekicks/rita-bruja.svg',
      },
      {
        id: 'kiko-loro',
        name: 'Kiko, loro que se inventa palabras',
        image: '/option-icons/sidekicks/kiko-loro.svg',
      },
      {
        id: 'custom',
        name: 'Mi propio personaje',
        image: '/option-icons/misc/custom.svg',
      },
    ],
  },
  object: {
    id: 'object',
    title: 'El objeto',
    required: false,
    needsName: false,
    cardIcon: '🧰',
    options: [
      {
        id: 'brujula-deseos',
        name: 'Brújula que apunta a lo que deseas',
        image: '/option-icons/objects/brujula-deseos.svg',
      },
      {
        id: 'tiza-puertas',
        name: 'Tiza que dibuja puertas',
        image: '/option-icons/objects/tiza-puertas.svg',
      },
      {
        id: 'mapa-solo',
        name: 'Mapa que se dibuja solo',
        image: '/option-icons/objects/mapa-solo.svg',
      },
      {
        id: 'llave-problemas',
        name: 'Llave que abre cualquier problema',
        image: '/option-icons/objects/llave-problemas.svg',
      },
      {
        id: 'reloj-minuto',
        name: 'Reloj que detiene un minuto',
        image: '/option-icons/objects/reloj-minuto.svg',
      },
      {
        id: 'boton-pausa',
        name: 'Botón de pausa',
        image: '/option-icons/objects/boton-pausa.svg',
      },
      {
        id: 'linterna-secretos',
        name: 'Linterna que revela caminos secretos',
        image: '/option-icons/objects/linterna-secretos.svg',
      },
      {
        id: 'iman-perdidas',
        name: 'Imán que atrae cosas perdidas',
        image: '/option-icons/objects/iman-perdidas.svg',
      },
      {
        id: 'lapiz-miedos',
        name: 'Lápiz que borra miedos',
        image: '/option-icons/objects/lapiz-miedos.svg',
      },
      {
        id: 'mochila-sin-fondo',
        name: 'Mochila sin fondo',
        image: '/option-icons/objects/mochila-sin-fondo.svg',
      },
      {
        id: 'cuerda-nube',
        name: 'Cuerda de nube',
        image: '/option-icons/objects/cuerda-nube.svg',
      },
      {
        id: 'paraguas-tiempo',
        name: 'Paraguas que cambia el tiempo',
        image: '/option-icons/objects/paraguas-tiempo.svg',
      },
      {
        id: 'libro-responde',
        name: 'Libro en blanco que responde',
        image: '/option-icons/objects/libro-responde.svg',
      },
      {
        id: 'pegatinas-habilidades',
        name: 'Pegatinas que dan habilidades',
        image: '/option-icons/objects/pegatinas-habilidades.svg',
      },
      {
        id: 'catalejo-mananas',
        name: 'Catalejo para ver mañanas',
        image: '/option-icons/objects/catalejo-mananas.svg',
      },
      {
        id: 'bote-risa',
        name: 'Bote de risa en spray',
        image: '/option-icons/objects/bote-risa.svg',
      },
      {
        id: 'caja-musica',
        name: 'Caja de música que calma',
        image: '/option-icons/objects/caja-musica.svg',
      },
      {
        id: 'sombrero-ideas',
        name: 'Sombrero que guarda ideas',
        image: '/option-icons/objects/sombrero-ideas.svg',
      },
      {
        id: 'guantes-seguros',
        name: 'Guantes que no dejan caer nada',
        image: '/option-icons/objects/guantes-seguros.svg',
      },
      {
        id: 'botella-tormenta',
        name: 'Botella con una tormenta pequeña',
        image: '/option-icons/objects/botella-tormenta.svg',
      },
      {
        id: 'custom',
        name: 'Mi propio objeto',
        image: '/option-icons/misc/custom.svg',
      },
    ],
  },
  place: {
    id: 'place',
    title: 'El lugar*',
    required: true,
    needsName: false,
    cardIcon: '🗺️',
    options: [
      {
        id: 'biblioteca-pasillos',
        name: 'Biblioteca de pasillos infinitos',
        image: '/option-icons/places/biblioteca-pasillos.svg',
      },
      {
        id: 'museo-perdidas',
        name: 'Museo de cosas perdidas',
        image: '/option-icons/places/museo-perdidas.svg',
      },
      {
        id: 'mercado-palabras',
        name: 'Mercado de palabras',
        image: '/option-icons/places/mercado-palabras.svg',
      },
      {
        id: 'callejon-puertas',
        name: 'Callejón de puertas mágicas',
        image: '/option-icons/places/callejon-puertas.svg',
      },
      {
        id: 'fabrica-nubes',
        name: 'Fábrica de nubes',
        image: '/option-icons/places/fabrica-nubes.svg',
      },
      {
        id: 'isla-nubes',
        name: 'Isla de nubes',
        image: '/option-icons/places/isla-nubes.svg',
      },
      {
        id: 'tren-nocturno',
        name: 'Tren nocturno de los sueños',
        image: '/option-icons/places/tren-nocturno.svg',
      },
      {
        id: 'lago-espejo',
        name: 'Lago espejo',
        image: '/option-icons/places/lago-espejo.svg',
      },
      {
        id: 'taller-juguetes',
        name: 'Taller secreto de juguetes',
        image: '/option-icons/places/taller-juguetes.svg',
      },
      {
        id: 'teatro-sombras',
        name: 'Teatro de sombras',
        image: '/option-icons/places/teatro-sombras.svg',
      },
      {
        id: 'castillo-inflable',
        name: 'Castillo inflable',
        image: '/option-icons/places/castillo-inflable.svg',
      },
      {
        id: 'jardin-estacion',
        name: 'Jardín que cambia de estación',
        image: '/option-icons/places/jardin-estacion.svg',
      },
      {
        id: 'acuario-gigante',
        name: 'Acuario gigante (sin agua)',
        image: '/option-icons/places/acuario-gigante.svg',
      },
      {
        id: 'submarino-biblioteca',
        name: 'Submarino-biblioteca',
        image: '/option-icons/places/submarino-biblioteca.svg',
      },
      {
        id: 'tejado-cometas',
        name: 'Tejado (club de las cometas)',
        image: '/option-icons/places/tejado-cometas.svg',
      },
      {
        id: 'montana-helado',
        name: 'Montaña de helado',
        image: '/option-icons/places/montana-helado.svg',
      },
      {
        id: 'jungla-almohadas',
        name: 'Jungla de almohadas',
        image: '/option-icons/places/jungla-almohadas.svg',
      },
      {
        id: 'planeta-bolsillo',
        name: 'Planeta pequeño de bolsillo',
        image: '/option-icons/places/planeta-bolsillo.svg',
      },
      {
        id: 'cuevas-eco',
        name: 'Cuevas de eco amable',
        image: '/option-icons/places/cuevas-eco.svg',
      },
      {
        id: 'bosque-luces',
        name: 'Bosque de árboles con luces',
        image: '/option-icons/places/bosque-luces.svg',
      },
      {
        id: 'custom',
        name: 'Mi propio lugar',
        image: '/option-icons/misc/custom.svg',
      },
    ],
  },
  moral: {
    id: 'moral',
    title: '¿Qué pasará?',
    required: false,
    needsName: false,
    cardIcon: '📝',
    inputType: 'text',
    placeholder: 'Ej: El héroe debe encontrar un mapa y ayudar a su amiga.',
    options: [],
  },
  language: {
    id: 'language',
    title: 'Idioma*',
    required: true,
    needsName: false,
    cardIcon: '🌍',
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
    cardIcon: '🎙️',
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
  image?: string;
}

export type StoryState = Record<string, StorySelection>;
