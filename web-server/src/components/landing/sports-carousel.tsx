import Image from "next/image";

type Sport = {
  name: string;
  src: string;
  alt: string;
  w: number;
  h: number;
  pos: string;
};

const SPORTS: Sport[] = [
  {
    name: "Padel",
    src: "/photos/padel-jogo-quadras.jpg",
    alt: "Quadras de padel azuis rodeadas de árvores, com jogadores a disputar um jogo",
    w: 1920,
    h: 1280,
    pos: "50% 50%",
  },
  {
    name: "Futsal",
    src: "/photos/futsal-torneio.jpg",
    alt: "Jogadores num torneio de futsal num pavilhão",
    w: 1920,
    h: 2880,
    pos: "50% 50%",
  },
  {
    name: "Futebol 7",
    src: "/photos/futebol-amador.webp",
    alt: "Raparigas a jogar futebol num relvado, num jogo amador",
    w: 1024,
    h: 685,
    pos: "50% 50%",
  },
  {
    name: "Basquetebol",
    src: "/photos/basquetebol.webp",
    alt: "Dois jogadores disputam a bola num jogo de basquetebol ao ar livre",
    w: 1024,
    h: 684,
    pos: "28% 40%",
  },
  {
    name: "Ténis",
    src: "/photos/tenis-amador.webp",
    alt: "Tenista a jogar num court de terra batida",
    w: 1024,
    h: 576,
    pos: "50% 50%",
  },
  {
    name: "Ténis de praia",
    src: "/photos/beachtenis-na-kapitolu.jpg",
    alt: "Campo de ténis de praia visto de cima, com vários jogadores",
    w: 1920,
    h: 1280,
    pos: "60% 55%",
  },
  {
    name: "Pickleball",
    src: "/photos/pickleball-jogo.jpg",
    alt: "Jogadores de pickleball num jogo num pavilhão, com raquetes na mão",
    w: 1920,
    h: 1282,
    pos: "55% 50%",
  },
  {
    name: "Voleibol",
    src: "/photos/voleibol-bloco-amador.jpg",
    alt: "Jogadoras de voleibol a bloquear a bola junto à rede",
    w: 1920,
    h: 1276,
    pos: "50% 40%",
  },
  {
    name: "Andebol",
    src: "/photos/andebol-amador.jpg",
    alt: "Jogo de andebol entre equipas de clubes amadores, num pavilhão",
    w: 1920,
    h: 1268,
    pos: "50% 50%",
  },
  {
    name: "Hóquei em patins",
    src: "/photos/hoquei-patins-jogo.jpg",
    alt: "Jogadores de hóquei em patins disputam a bola num pavilhão",
    w: 1920,
    h: 1280,
    pos: "45% 50%",
  },
  {
    name: "Badminton",
    src: "/photos/badminton-jogo.jpg",
    alt: "Jogador de badminton a preparar o serviço com a raquete",
    w: 1920,
    h: 1193,
    pos: "50% 50%",
  },
];

// Cores dos chips com o nome, em rotação.
const CHIPS = ["bg-brand text-bg", "bg-mint text-bg", "bg-leaf text-fg", "bg-fg text-bg"];

function Card({ sport, chip }: { sport: Sport; chip: string }) {
  return (
    <li className="relative h-[440px] w-[330px] shrink-0 overflow-hidden rounded-[32px] bg-surface lg:h-[500px] lg:w-[400px]">
      <Image
        src={sport.src}
        alt={sport.alt}
        fill
        sizes="400px"
        style={{ objectPosition: sport.pos }}
        className="object-cover"
      />
      <h3 className={`${chip} absolute bottom-5 left-5 rounded-full px-5 py-2.5 text-lg font-bold`}>{sport.name}</h3>
    </li>
  );
}

// Carrossel contínuo: a fila passa sozinha, em ciclo, sem parar (nem ao passar o rato). A fila está
// duplicada (a segunda cópia é só para o ciclo fechar sem salto) e o movimento é só
// transform. Com "reduzir movimento" fica parada e dá para deslizar com o dedo/rato.
export function SportsCarousel() {
  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label="Desportos"
      className="overflow-hidden motion-reduce:overflow-x-auto"
    >
      <div className="sports-track flex w-max motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-3 pr-3">
            {SPORTS.map((sport, i) => (
              <Card key={sport.name} sport={sport} chip={CHIPS[i % CHIPS.length]} />
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
