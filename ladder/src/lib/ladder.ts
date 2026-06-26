export interface Bridge {
  row: number;
  col: number; // connects col to col+1
}

export interface PathStep {
  col: number;
  row: number;
  direction?: "right" | "left" | "down";
}

export interface LadderData {
  players: string[];
  results: string[];
  bridges: Bridge[];
  numRows: number;
  assignments: number[]; // assignments[playerIndex] = resultIndex
}

export function generateBridges(numPlayers: number, numRows: number): Bridge[] {
  const bridges: Bridge[] = [];
  for (let row = 0; row < numRows; row++) {
    const usedCols = new Set<number>();
    for (let col = 0; col < numPlayers - 1; col++) {
      if (usedCols.has(col) || usedCols.has(col - 1)) continue;
      if (Math.random() < 0.45) {
        bridges.push({ row, col });
        usedCols.add(col);
      }
    }
  }
  return bridges;
}

export function tracePath(
  startCol: number,
  numRows: number,
  bridges: Bridge[]
): PathStep[] {
  const steps: PathStep[] = [{ col: startCol, row: -1, direction: "down" }];
  let col = startCol;

  for (let row = 0; row < numRows; row++) {
    // Check if there's a bridge going right
    const rightBridge = bridges.find((b) => b.row === row && b.col === col);
    // Check if there's a bridge going left
    const leftBridge = bridges.find(
      (b) => b.row === row && b.col === col - 1
    );

    if (rightBridge) {
      steps.push({ col, row, direction: "right" });
      col = col + 1;
      steps.push({ col, row, direction: "down" });
    } else if (leftBridge) {
      steps.push({ col, row, direction: "left" });
      col = col - 1;
      steps.push({ col, row, direction: "down" });
    } else {
      steps.push({ col, row, direction: "down" });
    }
  }

  return steps;
}

export function computeAssignments(
  numPlayers: number,
  numRows: number,
  bridges: Bridge[]
): number[] {
  const assignments: number[] = [];
  for (let i = 0; i < numPlayers; i++) {
    const steps = tracePath(i, numRows, bridges);
    const lastStep = steps[steps.length - 1];
    assignments.push(lastStep.col);
  }
  return assignments;
}

export function generateLadder(
  players: string[],
  results: string[]
): LadderData {
  const numPlayers = players.length;
  const numRows = Math.max(6, numPlayers * 2);
  const bridges = generateBridges(numPlayers, numRows);
  const assignments = computeAssignments(numPlayers, numRows, bridges);
  return { players, results, bridges, numRows, assignments };
}

const PLAYER_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F97316", // orange
  "#6366F1", // indigo
];

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
