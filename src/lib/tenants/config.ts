/**
 * Tenants (prefeituras) suportados.
 *
 * Em produção, isso virá do banco de dados (tabela `tenants`).
 * Aqui é hard-coded para acelerar Fase 0 e permitir testes de white-label
 * sem depender de DB.
 */

export type TenantId = "alfenas" | "pousoalegre" | "varginha";

export interface Tenant {
  id: TenantId;
  name: string;
  short: string;
  uf: string;
  subdomain: string;
  monogram: string;
  tutorName: string;
  tutorFull: string;
  population: string;
  students: number;
  teachers: number;
  schools: number;

  // Brand tokens — sobrescrevem CSS vars do design system
  primary: string;
  primaryHover: string;
  primaryFg: string;
  primarySoft: string;
  primaryBorder: string;
  secondary: string;
  secondarySoft: string;
  secondaryFg: string;
}

export const TENANTS: Record<TenantId, Tenant> = {
  alfenas: {
    id: "alfenas",
    name: "Prefeitura Municipal de Alfenas",
    short: "Alfenas",
    uf: "MG",
    subdomain: "alfenas",
    monogram: "PMA",
    tutorName: "Profe Mari",
    tutorFull: "Profe Mari de Alfenas",
    population: "78.130 hab.",
    students: 9420,
    teachers: 612,
    schools: 38,
    primary: "#1E40AF",
    primaryHover: "#1A368C",
    primaryFg: "#FFFFFF",
    primarySoft: "#EBF0FB",
    primaryBorder: "#C7D3F0",
    secondary: "#F59E0B",
    secondarySoft: "#FEF6E4",
    secondaryFg: "#1F1300",
  },
  pousoalegre: {
    id: "pousoalegre",
    name: "Prefeitura Municipal de Pouso Alegre",
    short: "Pouso Alegre",
    uf: "MG",
    subdomain: "pousoalegre",
    monogram: "PMP",
    tutorName: "Tuca",
    tutorFull: "Tuca, do Pouso",
    population: "152.549 hab.",
    students: 17840,
    teachers: 1108,
    schools: 64,
    primary: "#15803D",
    primaryHover: "#126C33",
    primaryFg: "#FFFFFF",
    primarySoft: "#E8F3EC",
    primaryBorder: "#C2DECB",
    secondary: "#475569",
    secondarySoft: "#EEF0F3",
    secondaryFg: "#FFFFFF",
  },
  varginha: {
    id: "varginha",
    name: "Prefeitura Municipal de Varginha",
    short: "Varginha",
    uf: "MG",
    subdomain: "varginha",
    monogram: "PMV",
    tutorName: "Dico",
    tutorFull: "Dico de Varginha",
    population: "136.110 hab.",
    students: 16210,
    teachers: 1042,
    schools: 58,
    primary: "#B91C1C",
    primaryHover: "#9F1818",
    primaryFg: "#FFFFFF",
    primarySoft: "#FBE9E9",
    primaryBorder: "#EDC7C7",
    secondary: "#B08D57",
    secondarySoft: "#F4ECDD",
    secondaryFg: "#1F1300",
  },
};

export const DEFAULT_TENANT_ID: TenantId = "alfenas";

export const ALL_TENANTS = Object.values(TENANTS);

export function getTenant(id: string | undefined | null): Tenant {
  if (id && id in TENANTS) return TENANTS[id as TenantId];
  return TENANTS[DEFAULT_TENANT_ID];
}

export function isTenantId(value: string): value is TenantId {
  return value in TENANTS;
}
