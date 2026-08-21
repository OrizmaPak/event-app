const matrixSize = 29;
const finderOrigins = [
  [0, 0],
  [matrixSize - 7, 0],
  [0, matrixSize - 7],
];

function inFinder(row: number, column: number) {
  return finderOrigins.some(([x, y]) => column >= x && column < x + 7 && row >= y && row < y + 7);
}

function isFilled(row: number, column: number) {
  if (inFinder(row, column)) return false;
  if (row === 8 || column === 8) return (row + column) % 2 === 0;
  return ((row * 17 + column * 31 + row * column) % 7 < 3) || ((row + column * 3) % 11 === 0);
}

export function DemoQr({ size = 132 }: { size?: number }) {
  return (
    <svg className="demo-qr demo-qr--svg" style={{ width: size, height: size }} viewBox="-.75 -.75 30.5 30.5" role="img" aria-label="Demo QR event pass">
      <rect x="-.75" y="-.75" width="30.5" height="30.5" rx="1.2" fill="#fff" />
      {finderOrigins.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" rx=".5" fill="#17131f" />
          <rect x={x + 1} y={y + 1} width="5" height="5" rx=".35" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" rx=".25" fill="#17131f" />
        </g>
      ))}
      {Array.from({ length: matrixSize * matrixSize }).map((_, index) => (
        isFilled(Math.floor(index / matrixSize), index % matrixSize) ? <rect key={index} x={index % matrixSize} y={Math.floor(index / matrixSize)} width="1" height="1" fill="#17131f" /> : null
      ))}
    </svg>
  );
}
