// Unidades de cada grandeza. Toda conta interna é feita no SI.
// Conversão: SI = (valor + off) × f   |   valor = SI / f − off

export type Unit = { id: string; f: number; off?: number };

export const UNITS = {
  force: [{ id: "N", f: 1 }, { id: "kN", f: 1e3 }, { id: "lbf", f: 4.4482216152605 }],
  angle: [{ id: "graus", f: Math.PI / 180 }, { id: "rad", f: 1 }],
  area: [{ id: "mm²", f: 1e-6 }, { id: "cm²", f: 1e-4 }, { id: "m²", f: 1 }],
  length: [{ id: "mm", f: 1e-3 }, { id: "cm", f: 1e-2 }, { id: "m", f: 1 }],
  modulus: [{ id: "GPa", f: 1e9 }, { id: "MPa", f: 1e6 }],
  torque: [{ id: "N·m", f: 1 }, { id: "N·mm", f: 1e-3 }, { id: "kN·m", f: 1e3 }],
  rotation: [{ id: "RPM", f: (2 * Math.PI) / 60 }, { id: "rad/s", f: 1 }, { id: "Hz", f: 2 * Math.PI }],
  power: [{ id: "kW", f: 1e3 }, { id: "W", f: 1 }, { id: "cv", f: 735.49875 }, { id: "hp", f: 745.699872 }],
  pressure: [
    { id: "kPa", f: 1e3 },
    { id: "Pa", f: 1 },
    { id: "MPa", f: 1e6 },
    { id: "bar", f: 1e5 },
    { id: "atm", f: 101325 },
    { id: "psi", f: 6894.757293168 },
  ],
  volume: [{ id: "m³", f: 1 }, { id: "L", f: 1e-3 }, { id: "cm³", f: 1e-6 }],
  mass: [{ id: "kg", f: 1 }, { id: "g", f: 1e-3 }],
  temp: [{ id: "°C", f: 1, off: 273.15 }, { id: "K", f: 1 }, { id: "°F", f: 5 / 9, off: 459.67 }],
  gasR: [{ id: "J/(kg·K)", f: 1 }, { id: "kJ/(kg·K)", f: 1e3 }],
  energy: [{ id: "kJ", f: 1e3 }, { id: "J", f: 1 }, { id: "MJ", f: 1e6 }, { id: "kWh", f: 3.6e6 }],
  density: [{ id: "kg/m³", f: 1 }, { id: "g/cm³", f: 1e3 }],
  accel: [{ id: "m/s²", f: 1 }],
  velocity: [{ id: "m/s", f: 1 }, { id: "km/h", f: 1 / 3.6 }, { id: "cm/s", f: 1e-2 }],
  viscosity: [{ id: "Pa·s", f: 1 }, { id: "mPa·s", f: 1e-3 }, { id: "cP", f: 1e-3 }, { id: "P", f: 0.1 }],
  conductivity: [{ id: "W/(m·K)", f: 1 }],
  none: [{ id: "adim.", f: 1 }],
} satisfies Record<string, Unit[]>;

export type QtyKey = keyof typeof UNITS;

export function findUnit(qty: QtyKey, id: string): Unit {
  const list: Unit[] = UNITS[qty];
  return list.find((u) => u.id === id) ?? list[0];
}

export function toSI(qty: QtyKey, unitId: string, v: number): number {
  const u = findUnit(qty, unitId);
  return (v + (u.off ?? 0)) * u.f;
}

export function fromSI(qty: QtyKey, unitId: string, si: number): number {
  const u = findUnit(qty, unitId);
  return si / u.f - (u.off ?? 0);
}
