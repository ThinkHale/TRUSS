/**
 * The trades a company can say it performs, at onboarding and in Settings.
 *
 * These are stored on org_settings.trades and read by knowledge retrieval, so
 * every label here is one the retrieval step recognizes and maps to a trade
 * pack in the TRUSS knowledge base — except Solar, which the knowledge base
 * covers only through its general doctrine and one practice scenario, not a
 * pack of its own. Grouped the way the knowledge base splits its packs.
 * Client-safe.
 */

export interface TradeGroup {
  en: string;
  es: string;
  trades: { value: string; en: string; es: string }[];
}

export const TRADE_GROUPS: TradeGroup[] = [
  {
    en: 'Roofing and exteriors',
    es: 'Techos y exteriores',
    trades: [
      { value: 'Roofing', en: 'Roofing', es: 'Techos' },
      { value: 'Siding', en: 'Siding', es: 'Revestimiento' },
      { value: 'Gutters', en: 'Gutters', es: 'Canaletas' },
      { value: 'Windows', en: 'Windows', es: 'Ventanas' },
      { value: 'Restoration', en: 'Storm and water restoration', es: 'Restauración' },
      { value: 'Solar', en: 'Solar', es: 'Solar' },
    ],
  },
  {
    en: 'Home services',
    es: 'Servicios para el hogar',
    trades: [
      { value: 'HVAC', en: 'HVAC', es: 'Climatización (HVAC)' },
      { value: 'Plumbing', en: 'Plumbing', es: 'Plomería' },
      { value: 'Electrical', en: 'Electrical', es: 'Electricidad' },
    ],
  },
  {
    en: 'Remodeling and building',
    es: 'Remodelación y construcción',
    trades: [
      { value: 'Remodeling', en: 'Remodeling', es: 'Remodelación' },
      { value: 'General contracting', en: 'General contracting', es: 'Contratista general' },
      { value: 'Painting', en: 'Painting', es: 'Pintura' },
    ],
  },
  {
    en: 'Recurring services',
    es: 'Servicios recurrentes',
    trades: [
      { value: 'Pest control', en: 'Pest control', es: 'Control de plagas' },
      { value: 'Landscaping', en: 'Landscaping', es: 'Paisajismo' },
      { value: 'Lawn care', en: 'Lawn care', es: 'Cuidado del césped' },
      { value: 'Cleaning', en: 'Cleaning', es: 'Limpieza' },
      { value: 'Pool service', en: 'Pool service', es: 'Mantenimiento de piscinas' },
    ],
  },
  {
    en: 'Commercial',
    es: 'Comercial',
    trades: [{ value: 'Commercial contracting', en: 'Commercial contracting', es: 'Contratación comercial' }],
  },
];

export const TRADE_VALUES = TRADE_GROUPS.flatMap((g) => g.trades.map((t) => t.value));
