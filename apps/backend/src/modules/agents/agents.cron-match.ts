/**
 * Matcher 5-field cron (min hour dom month dow) para o dispatcher de routines.
 * Sem dependência extra — node-cron valida; este módulo decide "casa agora?".
 */

const FIELD_BOUNDS = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week (0/7 = Sunday)
] as const;

function expandField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const rangePart = stepMatch ? stepMatch[1] : part;
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`Step inválido em cron: ${field}`);
    }
    let start = min;
    let end = max;
    if (rangePart === "*") {
      start = min;
      end = max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-").map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        throw new Error(`Range inválido em cron: ${field}`);
      }
      start = a;
      end = b;
    } else {
      const n = Number(rangePart);
      if (!Number.isInteger(n)) throw new Error(`Valor inválido em cron: ${field}`);
      start = n;
      end = n;
    }
    if (start < min || end > max || start > end) {
      throw new Error(`Fora dos limites em cron: ${field}`);
    }
    for (let i = start; i <= end; i += step) values.add(i);
  }
  return values;
}

/** Valida expressão 5-field (sem segundos). */
export function isValidFiveFieldCron(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  try {
    parts.forEach((part, idx) => {
      const [min, max] = FIELD_BOUNDS[idx];
      expandField(part, min, max);
    });
    return true;
  } catch {
    return false;
  }
}

export function cronMatchesAt(
  expression: string,
  date: Date = new Date(),
): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  try {
    const minute = expandField(parts[0], 0, 59);
    const hour = expandField(parts[1], 0, 23);
    const dom = expandField(parts[2], 1, 31);
    const month = expandField(parts[3], 1, 12);
    const dow = expandField(parts[4], 0, 7);

    const dMinute = date.getUTCMinutes();
    const dHour = date.getUTCHours();
    const dDom = date.getUTCDate();
    const dMonth = date.getUTCMonth() + 1;
    let dDow = date.getUTCDay(); // 0=Sun
    // Expressões com 7 tratam domingo também
    const dowOk = dow.has(dDow) || (dDow === 0 && dow.has(7));

    return (
      minute.has(dMinute) &&
      hour.has(dHour) &&
      dom.has(dDom) &&
      month.has(dMonth) &&
      dowOk
    );
  } catch {
    return false;
  }
}
