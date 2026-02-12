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
    cardIcon: '/option-icons/Protagonista.webp',
    options: [
      {
        id: 'luna-inventora',
        name: 'Luna, inventora de chicles elásticos',
        image: '/option-icons/heroes/Luna.webp',
      },
      {
        id: 'bruno-domador',
        name: 'Bruno, domador de nubes',
        image: '/option-icons/heroes/Bruno.webp',
      },
      {
        id: 'vera-detective',
        name: 'Vera, detective de huellas de purpurina',
        image: '/option-icons/heroes/Vera.webp',
      },
      {
        id: 'iris-jardinera',
        name: 'Iris, jardinera de plantas que cantan',
        image: '/option-icons/heroes/Iris.webp',
      },
      {
        id: 'elia-pintora',
        name: 'Elia, pintora que dibuja puertas',
        image: '/option-icons/heroes/Elia.webp',
      },
      {
        id: 'pablo-musico',
        name: 'Pablo, músico que afina el viento',
        image: '/option-icons/heroes/Pablo.webp',
      },
      {
        id: 'mara-guardiana',
        name: 'Mara, guardiana del reloj que atrasa',
        image: '/option-icons/heroes/Mara.webp',
      },
      {
        id: 'noa-cuidadora',
        name: 'Noa, cuidadora de monstruos tímidos',
        image: '/option-icons/heroes/Noa.webp',
      },
      {
        id: 'adri-coleccionista',
        name: 'Adri, coleccionista de sonidos',
        image: '/option-icons/heroes/Adri.webp',
      },
      {
        id: 'clara-bibliotecaria',
        name: 'Clara, bibliotecaria de cuentos que se mueven',
        image: '/option-icons/heroes/Clara.webp',
      },
      {
        id: 'leo-chef',
        name: 'Leo, chef de sopas con superpoderes',
        image: '/option-icons/heroes/Leo.webp',
      },
      {
        id: 'sam-corredor',
        name: 'Sam, corredor de mapas',
        image: '/option-icons/heroes/Sam.webp',
      },
      {
        id: 'carla-cientifica',
        name: 'Carla, científica de burbujas gigantes',
        image: '/option-icons/heroes/Carla.webp',
      },
      {
        id: 'martin-cartero',
        name: 'Martín, cartero de cartas sin destinatario',
        image: '/option-icons/heroes/Martín.webp',
      },
      {
        id: 'ariadna-entrenadora',
        name: 'Ariadna, entrenadora de dragones mini',
        image: '/option-icons/heroes/Ariadna.webp',
      },
      {
        id: 'iker-cuidador',
        name: 'Iker, cuidador de estrellas caídas',
        image: '/option-icons/heroes/Iker.webp',
      },
      {
        id: 'sofia-exploradora',
        name: 'Sofía, exploradora de cajones perdidos',
        image: '/option-icons/heroes/Sofia.webp',
      },
      {
        id: 'nico-nino',
        name: 'Nico, niño que entiende a los semáforos',
        image: '/option-icons/heroes/Nico.webp',
      },
      {
        id: 'ines-domadora',
        name: 'Inés, domadora de sombras traviesas',
        image: '/option-icons/heroes/Inés.webp',
      },
      {
        id: 'gael-guardabosques',
        name: 'Gael, guardabosques de hojas brillantes',
        image: '/option-icons/heroes/Gael.webp',
      },
      {
        id: 'custom',
        name: 'Mi propio protagonista',
        image: '/option-icons/misc/Inventado.webp',
      },
    ],
  },
  sidekick: {
    id: 'sidekick',
    title: 'El personaje secundario',
    required: false,
    needsName: false,
    cardIcon: '/option-icons/Secundario.webp',
    options: [
      {
        id: 'roco-robot',
        name: 'Roco, robot con corazón de cartón',
        image: '/option-icons/sidekicks/Roco.webp',
      },
      {
        id: 'coco-dragon',
        name: 'Coco, dragón que estornuda confeti',
        image: '/option-icons/sidekicks/Coco.webp',
      },
      {
        id: 'gus-fantasma',
        name: 'Gus, fantasma que da cosquillas',
        image: '/option-icons/sidekicks/Gus.webp',
      },
      {
        id: 'taro-duende',
        name: 'Taro, duende del calcetín perdido',
        image: '/option-icons/sidekicks/Taro.webp',
      },
      {
        id: 'don-buho',
        name: 'Don Búho, profe de preguntas difíciles',
        image: '/option-icons/sidekicks/Don%20Buho.webp',
      },
      {
        id: 'senor-nube',
        name: 'Señor Nube, llueve cuando ríe',
        image: '/option-icons/sidekicks/Se%C3%B1or%20Nube.webp',
      },
      {
        id: 'chispa-luciernaga',
        name: 'Chispa, luciérnaga linterna',
        image: '/option-icons/sidekicks/Chispa.webp',
      },
      {
        id: 'pelusa-monstruo',
        name: 'Pelusa, monstruo del polvo (educado)',
        image: '/option-icons/sidekicks/Pelusa.webp',
      },
      {
        id: 'mimi-gata',
        name: 'Mimi, gata astrónoma',
        image: '/option-icons/sidekicks/Mimi.webp',
      },
      {
        id: 'punk-erizo',
        name: 'Punk, erizo peluquero',
        image: '/option-icons/sidekicks/Punk.webp',
      },
      {
        id: 'zeta-extraterrestre',
        name: 'Zeta, extraterrestre turista',
        image: '/option-icons/sidekicks/Zeta.webp',
      },
      {
        id: 'fito-pez',
        name: 'Fito, pez que quiere volar',
        image: '/option-icons/sidekicks/Fito.webp',
      },
      {
        id: 'lola-abeja',
        name: 'Lola, abeja arquitecta',
        image: '/option-icons/sidekicks/Lola.webp',
      },
      {
        id: 'capitan-caracol',
        name: 'Capitán Caracol, experto en paciencia',
        image: '/option-icons/sidekicks/Capitan%20Caracol.webp',
      },
      {
        id: 'pipo-raton',
        name: 'Pipo, ratón con gafas de mermelada',
        image: '/option-icons/sidekicks/Pipo.webp',
      },
      {
        id: 'ras-camaleon',
        name: 'Ras, camaleón que cambia de humor',
        image: '/option-icons/sidekicks/Ras.webp',
      },
      {
        id: 'oli-pulpo',
        name: 'Oli, pulpo malabarista',
        image: '/option-icons/sidekicks/Oli.webp',
      },
      {
        id: 'nina-sirena',
        name: 'Nina, sirena que odia mojarse',
        image: '/option-icons/sidekicks/Nina.webp',
      },
      {
        id: 'rita-bruja',
        name: 'Rita, bruja de hechizos útiles',
        image: '/option-icons/sidekicks/Rita.webp',
      },
      {
        id: 'kiko-loro',
        name: 'Kiko, loro que se inventa palabras',
        image: '/option-icons/sidekicks/Kiko.webp',
      },
      {
        id: 'custom',
        name: 'Mi propio personaje',
        image: '/option-icons/misc/Inventado.webp',
      },
    ],
  },
  object: {
    id: 'object',
    title: 'El objeto',
    required: false,
    needsName: false,
    cardIcon: '/option-icons/Objeto.webp',
    options: [
      {
        id: 'brujula-deseos',
        name: 'Brújula que apunta a lo que deseas',
        image: '/option-icons/objects/Br%C3%BAjula.webp',
      },
      {
        id: 'tiza-puertas',
        name: 'Tiza que dibuja puertas',
        image: '/option-icons/objects/Tiza.webp',
      },
      {
        id: 'mapa-solo',
        name: 'Mapa que se dibuja solo',
        image: '/option-icons/objects/Mapa.webp',
      },
      {
        id: 'llave-problemas',
        name: 'Llave que abre cualquier problema',
        image: '/option-icons/objects/LLave.webp',
      },
      {
        id: 'reloj-minuto',
        name: 'Reloj que detiene un minuto',
        image: '/option-icons/objects/Reloj.webp',
      },
      {
        id: 'boton-pausa',
        name: 'Botón de pausa',
        image: '/option-icons/objects/Bot%C3%B3n.webp',
      },
      {
        id: 'linterna-secretos',
        name: 'Linterna que revela caminos secretos',
        image: '/option-icons/objects/Linterna.webp',
      },
      {
        id: 'iman-perdidas',
        name: 'Imán que atrae cosas perdidas',
        image: '/option-icons/objects/Im%C3%A1n.webp',
      },
      {
        id: 'lapiz-miedos',
        name: 'Lápiz que borra miedos',
        image: '/option-icons/objects/Lapiz.webp',
      },
      {
        id: 'mochila-sin-fondo',
        name: 'Mochila sin fondo',
        image: '/option-icons/objects/Mochila.webp',
      },
      {
        id: 'cuerda-nube',
        name: 'Cuerda de nube',
        image: '/option-icons/objects/Cuerda.webp',
      },
      {
        id: 'paraguas-tiempo',
        name: 'Paraguas que cambia el tiempo',
        image: '/option-icons/objects/Paraguas.webp',
      },
      {
        id: 'libro-responde',
        name: 'Libro en blanco que responde',
        image: '/option-icons/objects/Libro.webp',
      },
      {
        id: 'pegatinas-habilidades',
        name: 'Pegatinas que dan habilidades',
        image: '/option-icons/objects/Pegatinas.webp',
      },
      {
        id: 'catalejo-mananas',
        name: 'Catalejo para ver mañanas',
        image: '/option-icons/objects/Catalejo.webp',
      },
      {
        id: 'bote-risa',
        name: 'Bote de risa en spray',
        image: '/option-icons/objects/Bote%20risa.webp',
      },
      {
        id: 'caja-musica',
        name: 'Caja de música que calma',
        image: '/option-icons/objects/Caja%20m%C3%BAsica.webp',
      },
      {
        id: 'sombrero-ideas',
        name: 'Sombrero que guarda ideas',
        image: '/option-icons/objects/Sombrero.webp',
      },
      {
        id: 'guantes-seguros',
        name: 'Guantes que no dejan caer nada',
        image: '/option-icons/objects/Guantes.webp',
      },
      {
        id: 'botella-tormenta',
        name: 'Botella con una tormenta pequeña',
        image: '/option-icons/objects/Botella%20tormenta.webp',
      },
      {
        id: 'custom',
        name: 'Mi propio objeto',
        image: '/option-icons/objects/Mi%20propio%20objeto.webp',
      },
    ],
  },
  place: {
    id: 'place',
    title: 'El lugar*',
    required: true,
    needsName: false,
    cardIcon: '/option-icons/Lugar.webp',
    options: [
      {
        id: 'biblioteca-pasillos',
        name: 'Biblioteca de pasillos infinitos',
        image: '/option-icons/places/Biblioteca%20pasillos%20infinitos.png',
      },
      {
        id: 'museo-perdidas',
        name: 'Museo de cosas perdidas',
        image: '/option-icons/places/Museo%20de%20cosas%20perdidas.png',
      },
      {
        id: 'mercado-palabras',
        name: 'Mercado de palabras',
        image: '/option-icons/places/Mercado.png',
      },
      {
        id: 'callejon-puertas',
        name: 'Callejón de puertas mágicas',
        image: '/option-icons/places/Callejon%20de%20puertas%20magicas.png',
      },
      {
        id: 'fabrica-nubes',
        name: 'Fábrica de nubes',
        image: '/option-icons/places/Fabrica%20de%20nubes.png',
      },
      {
        id: 'isla-nubes',
        name: 'Isla de nubes',
        image: '/option-icons/places/Isla%20de%20nubes.png',
      },
      {
        id: 'tren-nocturno',
        name: 'Tren nocturno de los sueños',
        image: '/option-icons/places/Tren%20nocturno.png',
      },
      {
        id: 'lago-espejo',
        name: 'Lago espejo',
        image: '/option-icons/places/Lago%20Espejo.png',
      },
      {
        id: 'taller-juguetes',
        name: 'Taller secreto de juguetes',
        image: '/option-icons/places/Taller%20de%20juguetes.png',
      },
      {
        id: 'teatro-sombras',
        name: 'Teatro de sombras',
        image: '/option-icons/places/Teatro%20de%20sombras.png',
      },
      {
        id: 'castillo-inflable',
        name: 'Castillo inflable',
        image: '/option-icons/places/Castillo%20inflable.png',
      },
      {
        id: 'jardin-estacion',
        name: 'Jardín que cambia de estación',
        image: '/option-icons/places/Jard%C3%ADn%20estaci%C3%B3n.png',
      },
      {
        id: 'acuario-gigante',
        name: 'Acuario gigante (sin agua)',
        image: '/option-icons/places/Acuario.png',
      },
      {
        id: 'submarino-biblioteca',
        name: 'Submarino-biblioteca',
        image: '/option-icons/places/Submarino%20biblioteca.png',
      },
      {
        id: 'tejado-cometas',
        name: 'Tejado (club de las cometas)',
        image: '/option-icons/places/Tejado%20cometas.png',
      },
      {
        id: 'montana-helado',
        name: 'Montaña de helado',
        image: '/option-icons/places/Monta%C3%B1a%20helado.png',
      },
      {
        id: 'jungla-almohadas',
        name: 'Jungla de almohadas',
        image: '/option-icons/places/Jungla%20almohadas.png',
      },
      {
        id: 'planeta-bolsillo',
        name: 'Planeta pequeño de bolsillo',
        image: '/option-icons/places/Planeta%20peque%C3%B1o.png',
      },
      {
        id: 'cuevas-eco',
        name: 'Cuevas de eco amable',
        image: '/option-icons/places/Cuevas%20eco.png',
      },
      {
        id: 'bosque-luces',
        name: 'Bosque de árboles con luces',
        image: '/option-icons/places/Bosque%20%C3%A1rboles.png',
      },
      {
        id: 'custom',
        name: 'Mi propio lugar',
        image: '/option-icons/places/Mi%20propio%20lugar.png',
      },
    ],
  },
  moral: {
    id: 'moral',
    title: '¿Qué pasará?',
    required: false,
    needsName: false,
    cardIcon: '/option-icons/Que%20pasar%C3%A1.webp',
    inputType: 'text',
    placeholder: 'Ej: El héroe debe encontrar un mapa y ayudar a su amiga.',
    options: [],
  },
  language: {
    id: 'language',
    title: 'Idioma*',
    required: true,
    needsName: false,
    cardIcon: '/option-icons/Idioma.webp',
    options: [
      { id: 'es', name: 'Español', icon: '🇪🇸' },
    ],
  },
  narrator: {
    id: 'narrator',
    title: 'El narrador*',
    required: true,
    needsName: false,
    cardIcon: '/option-icons/Narrador.webp',
    options: [
      { id: 'tXgbXPnsMpKXkuTgvE3h', name: 'Elena', icon: '👩' },
      { id: 'erKgR0s8Y67t4iiHuA9R', name: 'Martin', icon: '👨' },
      { id: 'Ir1QNHvhaJXbAGhT50w3', name: 'Sara', icon: '👩' },
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

