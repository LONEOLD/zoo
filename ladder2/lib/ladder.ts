export interface LadderConfig {
  players: string[];
  results: string[];
  rungs: boolean[][];  // rungs[row][col] = true means horizontal bar between col and col+1
}

export interface TraceStep {
  col: number;
  row: number;
  direction: 'down' | 'left' | 'right';
}

export interface TraceResult {
  playerIndex: number;
  resultIndex: number;
  steps: TraceStep[];
}

export function generateLadder(playerCount: number, rowCount = 8): boolean[][] {
  const rungs: boolean[][] = [];
  for (let row = 0; row < rowCount; row++) {
    const rowRungs: boolean[] = new Array(playerCount - 1).fill(false);
    for (let col = 0; col < playerCount - 1; col++) {
      // Don't place rung if adjacent rung already placed (avoids invalid intersections)
      if (col > 0 && rowRungs[col - 1]) continue;
      rowRungs[col] = Math.random() < 0.45;
    }
    rungs.push(rowRungs);
  }
  return rungs;
}

export function tracePath(startCol: number, rungs: boolean[][]): TraceStep[] {
  const steps: TraceStep[] = [];
  let col = startCol;

  for (let row = 0; row < rungs.length; row++) {
    steps.push({ col, row, direction: 'down' });

    // Check left
    if (col > 0 && rungs[row][col - 1]) {
      steps.push({ col: col - 1, row, direction: 'left' });
      col = col - 1;
    }
    // Check right
    else if (col < rungs[row].length && rungs[row][col]) {
      steps.push({ col: col + 1, row, direction: 'right' });
      col = col + 1;
    }
  }

  steps.push({ col, row: rungs.length, direction: 'down' });
  return steps;
}

export function traceAll(config: LadderConfig): TraceResult[] {
  return config.players.map((_, playerIndex) => {
    const steps = tracePath(playerIndex, config.rungs);
    const resultIndex = steps[steps.length - 1].col;
    return { playerIndex, resultIndex, steps };
  });
}

// Pastel color palette for players
export const PLAYER_COLORS = [
  '#818cf8', // indigo
  '#34d399', // emerald
  '#f472b6', // pink
  '#fb923c', // orange
  '#a78bfa', // violet
  '#22d3ee', // cyan
  '#facc15', // yellow
  '#f87171', // red
];
