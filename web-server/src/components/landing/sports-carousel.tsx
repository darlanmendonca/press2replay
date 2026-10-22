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
    src: "/photos/padel-court-nsambya.jpg",
    alt: "Campo de padel coberto, com dois jogadores",
    w: 1920,
    h: 1272,
    pos: "62% 50%",
  },
  {
    name: "Futsal",
    src: "/photos/futsal-indoor.jpg",
    alt: "Jogadora de futsal a conduzir a bola num pavilhão",
    w: 1920,
    h: 2400,
    pos: "50% 40%",
  },
  {
    name: "Futebol 7",
    src: "/photos/futebol-7.jpg",
    alt: "Equipa de futebol sete feminino alinhada antes do jogo",
    w: 1920,
    h: 1080,
    pos: "78% 40%",
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
    src: "/photos/tenis.jpg",
    alt: "Jogador de ténis a completar um batimento num court",
    w: 1280,
    h: 914,
    pos: "62% 40%",
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
    src: "/photos/pickleball.jpg",
    alt: "Dois jogadores de pickleball num campo, junto à rede",
    w: 1920,
    h: 1280,
    pos: "60% 62%",
  },
  {
    name: "Voleibol",
    src: "/photos/voleibol.jpg",
    alt: "Jogadora de voleibol de praia a andar junto à rede, sob chuva",
    w: 1920,
    h: 1280,
    pos: "58% 38%",
  },
  {
    name: "Andebol",
    src: "/photos/andebol.jpg",
    alt: "Jogadores de andebol disputam a bola num lance de ataque",
    w: 1920,
    h: 1280,
    pos: "58% 40%",
  },
  {
    name: "Hóquei em patins",
    src: "/photos/hoquei-em-patins.jpg",
    alt: "Dois jogadores de hóquei em patins disputam a bola",
    w: 1920,
    h: 1280,
    pos: "58% 50%",
  },
  {
    name: "Badminton",
    src: "/photos/badminton.jpg",
    alt: "Jogador de badminton atento ao volante, junto à rede",
    w: 1920,
    h: 1280,
    pos: "62% 45%",
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
