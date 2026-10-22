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
    src: "/photos/futsal-jogo.jpg",
    alt: "Dois jogadores de futsal disputam a bola num pavilhão",
    w: 1920,
    h: 1276,
    pos: "55% 50%",
  },
  {
    name: "Futebol 7",
    src: "/photos/futebol-7-amador.jpg",
    alt: "Dois jogadores amadores disputam a bola num relvado, com o árbitro ao lado",
    w: 1920,
    h: 1280,
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
    src: "/photos/tenis-servico.jpg",
    alt: "Tenista a preparar o serviço num court de terra batida",
    w: 1920,
    h: 1280,
    pos: "30% 50%",
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
    src: "/photos/pickleball-jogador.jpg",
    alt: "Jogador de pickleball a bater na bola junto à rede",
    w: 1920,
    h: 2880,
    pos: "45% 62%",
  },
  {
    name: "Voleibol",
    src: "/photos/voleibol-bloco.jpg",
    alt: "Jogadoras de voleibol num bloco junto à rede",
    w: 1920,
    h: 1280,
    pos: "60% 50%",
  },
  {
    name: "Andebol",
    src: "/photos/andebol-remate.jpg",
    alt: "Jogadora de andebol em suspensão a lançar a bola",
    w: 1920,
    h: 1280,
    pos: "62% 45%",
  },
  {
    name: "Hóquei em patins",
    src: "/photos/hoquei-patins-jogador.jpg",
    alt: "Jogador de hóquei em patins com stick e patins no pavilhão",
    w: 1920,
    h: 1280,
    pos: "50% 50%",
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
