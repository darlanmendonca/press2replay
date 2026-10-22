// Halo de círculos: o círculo da frente (children) tem atrás discos cheios cada vez
// MAIORES, com o centro ligeiramente deslocado na direção `dir` (baixo e direita por
// defeito), nas cores da marca. `tones` vai do mais perto ao mais fundo. O contentor
// ocupa a largura toda: o círculo da frente encolhe o suficiente para o halo caber.
export function DiscStack({
  tones,
  children,
  grow = 0.12, // quanto cada disco é maior que o anterior (fração do diâmetro da frente)
  shift = 0.035, // quanto o centro de cada disco se desloca (fração do diâmetro da frente)
  dir = [1, 1],
  className = "",
}: {
  tones: string[];
  children: React.ReactNode;
  grow?: number;
  shift?: number;
  dir?: [number, number];
  className?: string;
}) {
  // Em unidades do diâmetro da frente (frente = caixa 0..1, centro em 0.5).
  const discs = tones.map((tone, i) => {
    const k = i + 1;
    const r = 0.5 * (1 + grow * k);
    const cx = 0.5 + dir[0] * shift * k;
    const cy = 0.5 + dir[1] * shift * k;
    return { tone, k, left: cx - r, top: cy - r, size: 2 * r };
  });
  const minX = Math.min(0, ...discs.map((d) => d.left));
  const minY = Math.min(0, ...discs.map((d) => d.top));
  const maxX = Math.max(1, ...discs.map((d) => d.left + d.size));
  const maxY = Math.max(1, ...discs.map((d) => d.top + d.size));
  const total = Math.max(maxX - minX, maxY - minY);
  const front = 100 / total; // % do contentor

  return (
    <div className={`relative aspect-square ${className}`}>
      <div
        className="absolute isolate transition-[left,top] duration-500 ease-out"
        style={{
          width: `${front}%`,
          height: `${front}%`,
          left: `${-minX * front}%`,
          top: `${-minY * front}%`,
        }}
      >
        {discs.map((d) => (
          <div
            key={d.k}
            aria-hidden
            className={`fan absolute rounded-full transition-[left,top] duration-500 ease-out ${d.tone}`}
            style={{
              left: `${d.left * 100}%`,
              top: `${d.top * 100}%`,
              width: `${d.size * 100}%`,
              height: `${d.size * 100}%`,
              zIndex: -d.k,
              animationDelay: `${(d.k - 1) * 140}ms`,
            }}
          />
        ))}
        <div className="relative size-full">{children}</div>
      </div>
    </div>
  );
}
