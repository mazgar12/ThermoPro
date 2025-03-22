// Types for thermal and HVAC calculations

export interface Point {
  x: number;
  y: number;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export interface MaterialProperties {
  name: string;
  thermalConductivity: number;
  defaultThickness: number;
  color: string;
}

export interface DrawingElement {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'wall' | 'insulation' | 'dimension' | 'text';
  layerId: string;
  points: Point[];
  properties: {
    material?: MaterialProperties;
    thickness?: number;
    thermalConductivity?: number;
    temperature?: number;
  };
  style: {
    color: string;
    lineWidth: number;
    fillColor?: string;
  };
  isClosed?: boolean; // New property to track if element forms a closed shape
}

export interface Viewport {
  scale: number;
  offset: Point;
}

export interface DrawingState {
  elements: DrawingElement[];
  layers: Layer[];
  selectedIds: string[];
  activeLayer: string;
  viewport: Viewport;
}

export interface ThermalBridgeData {
  geometry: DrawingElement[];
  materials: MaterialProperties[];
  calculations: {
    psiValue: number;
    fRsi: number;
    temperatureField: number[][];
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    elementId: string;
    message: string;
    type: 'error' | 'warning';
  }[];
}

export interface ClimateData {
  exteriorTemperature: number;
  humidity: number;
  solarRadiation: number;
  windSpeed: number;
  windDirection: number;
}

export interface BuildingMaterial {
  name: string;
  thermalConductivity: number; // λ (W/m·K)
  thickness: number; // meters
  thermalResistance?: number; // R-value (m²·K/W),
  surfaceResistance?: {
    interior: number; // Rsi (m²·K/W)
    exterior: number; // Rse (m²·K/W)
  }
}

export interface Wall {
  area: number; // m²
  materials: BuildingMaterial[];
  orientation: 'nord' | 'sud' | 'est' | 'ouest';
  type: 'mur' | 'plancher' | 'toit' | 'fenêtre' | 'porte';
  inclinaison?: number; // degrés
  masqueSolaire?: {
    angle: number; // degrés
    distance: number; // mètres
  };
  pontsThermiques?: {
    type: 'linéaire' | 'ponctuel';
    valeur: number; // W/K pour linéaire, W/K pour ponctuel
    longueur?: number; // mètres (pour linéaire)
  }[];
}

export interface Building {
  nom: string;
  localisation: {
    latitude: number;
    longitude: number;
    altitude: number;
    zoneClimatique: 'H1a' | 'H1b' | 'H1c' | 'H2a' | 'H2b' | 'H2c' | 'H2d' | 'H3';
  };
  dimensions: {
    surfaceHabitable: number; // m²
    volume: number; // m³
    hauteurSousPLafond: number; // m
  };
  enveloppe: {
    murs: Wall[];
    planchers: Wall[];
    toiture: Wall[];
    menuiseries: Wall[];
  };
  ventilation: VentilationSystem;
  occupation: OccupancyData;
  equipements: {
    chauffage: {
      type: 'gaz' | 'électrique' | 'pompeAChaleur' | 'biomasse';
      puissance: number; // kW
      rendement: number; // %
    };
    eauChaudeSanitaire: {
      type: 'instantané' | 'accumulation';
      volume?: number; // litres
      puissance: number; // kW
    };
    climatisation?: {
      puissance: number; // kW
      seer: number; // coefficient d'efficacité énergétique saisonnière
    };
  };
}

export interface ThermalCalculation {
  calculateUValue: (materials: BuildingMaterial[]) => number;
  calculateHeatLoss: (uValue: number, area: number, tempDiff: number) => number;
}

export interface VentilationSystem {
  type: 'single-flow' | 'double-flow' | 'natural' | 'mechanical';
  airFlow: number; // m³/h
  heatRecoveryEfficiency?: number; // for double-flow systems
}

export interface OccupancyData {
  occupants: number;
  schedule: {
    start: string;
    end: string;
  }[];
  internalHeatGains: number; // W/m²
}