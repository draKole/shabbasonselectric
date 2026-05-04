// Common electrical service templates for quick estimates
export type EstimateTemplate = {
  id: string;
  label: string;
  scope: string;
  total: number;
  deposit: number;
  materials: string;
};

export const ESTIMATE_TEMPLATES: EstimateTemplate[] = [
  {
    id: "service_call",
    label: "Service Call / Diagnostic",
    scope: "Diagnose electrical issue\nTest circuits and breakers\nProvide written findings and quote",
    total: 125,
    deposit: 0,
    materials: "Included",
  },
  {
    id: "outlet_replace",
    label: "Outlet Replacement (1)",
    scope: "Remove old outlet\nInstall new tamper-resistant outlet\nTest and verify",
    total: 175,
    deposit: 0,
    materials: "Included",
  },
  {
    id: "gfci_install",
    label: "GFCI Outlet Install",
    scope: "Install code-compliant GFCI outlet\nTest trip function\nLabel as required",
    total: 225,
    deposit: 0,
    materials: "Included",
  },
  {
    id: "ceiling_fan",
    label: "Ceiling Fan Install",
    scope: "Mount fan-rated box if needed\nAssemble and hang ceiling fan\nWire switch and test operation",
    total: 285,
    deposit: 0,
    materials: "Provided by customer (fan)",
  },
  {
    id: "panel_swap_200",
    label: "200A Panel Swap",
    scope: "Coordinate power shutoff\nRemove existing panel\nInstall new 200A main breaker panel\nLabel circuits and test\nPermit + inspection coordination",
    total: 2800,
    deposit: 1000,
    materials: "Included",
  },
  {
    id: "ev_charger",
    label: "EV Charger 240V Circuit",
    scope: "Run dedicated 240V circuit (up to 50ft)\nInstall 50A breaker\nMount and connect customer-supplied charger\nTest operation",
    total: 950,
    deposit: 300,
    materials: "Included (wire/breaker); EVSE by customer",
  },
  {
    id: "whole_home_surge",
    label: "Whole-Home Surge Protector",
    scope: "Install whole-home surge protector at main panel\nVerify proper grounding\nTest and label",
    total: 425,
    deposit: 0,
    materials: "Included",
  },
  {
    id: "troubleshoot_hour",
    label: "Troubleshoot (per hour)",
    scope: "Hourly troubleshooting and repair\nMinimum 1 hour\nMaterials billed separately",
    total: 125,
    deposit: 0,
    materials: "Billed separately",
  },
];
