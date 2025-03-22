// Thermal calculations utility functions

import { BuildingMaterial, Wall } from '../types/thermal';

// Constantes thermiques
const TEMPERATURE_CONFORT_HIVER = 19; // °C
const TEMPERATURE_CONFORT_ETE = 26; // °C
const CHALEUR_SPECIFIQUE_AIR = 1005; // J/kg·K
const DENSITE_AIR = 1.2; // kg/m³
const APPORT_CHALEUR_OCCUPANT = 80; // W/personne
const APPORT_CHALEUR_EQUIPEMENT = 5; // W/m²

export const calculateThermalResistance = (material: BuildingMaterial): number => {
  return material.thickness / material.thermalConductivity;
};

export const calculateUValue = (materials: BuildingMaterial[]): number => {
  const totalResistance = materials.reduce(
    (sum, material) => sum + calculateThermalResistance(material),
    0
  );
  return 1 / totalResistance;
};

export const calculateHeatLoss = (
  uValue: number,
  area: number,
  tempDiff: number
): number => {
  return uValue * area * tempDiff;
};

export const calculateVentilationHeatLoss = (
  airFlow: number, // m³/h
  tempDiff: number,
  airDensity: number = 1.2, // kg/m³
  specificHeatCapacity: number = 1005 // J/kg·K
): number => {
  // Convert airFlow from m³/h to m³/s
  const airFlowPerSecond = airFlow / 3600;
  // Calculate heat loss in Watts
  return airFlowPerSecond * airDensity * specificHeatCapacity * tempDiff;
};

export const calculateHeatingNeeds = (
  walls: Wall[],
  volume: number,
  airFlow: number,
  occupants: number,
  surfaceHabitable: number,
  exteriorTemp: number
): {
  transmissionLoss: number;
  ventilationLoss: number;
  internalGains: number;
  totalHeatingPower: number;
} => {
  // Pertes par transmission
  const transmissionLoss = walls.reduce((total, wall) => {
    const uValue = calculateUValue(wall.materials);
    return total + calculateHeatLoss(uValue, wall.area, TEMPERATURE_CONFORT_HIVER - exteriorTemp);
  }, 0);

  // Pertes par ventilation
  const ventilationLoss = calculateVentilationHeatLoss(
    airFlow,
    TEMPERATURE_CONFORT_HIVER - exteriorTemp,
    DENSITE_AIR,
    CHALEUR_SPECIFIQUE_AIR
  );

  // Apports internes
  const internalGains = 
    occupants * APPORT_CHALEUR_OCCUPANT + 
    surfaceHabitable * APPORT_CHALEUR_EQUIPEMENT;

  // Puissance totale de chauffage nécessaire
  const totalHeatingPower = transmissionLoss + ventilationLoss - internalGains;

  return {
    transmissionLoss,
    ventilationLoss,
    internalGains,
    totalHeatingPower
  };
};

export const calculateCoolingNeeds = (
  walls: Wall[],
  volume: number,
  airFlow: number,
  occupants: number,
  surfaceHabitable: number,
  exteriorTemp: number,
  solarGains: number
): {
  transmissionGain: number;
  ventilationGain: number;
  internalGains: number;
  solarGains: number;
  totalCoolingPower: number;
} => {
  // Gains par transmission
  const transmissionGain = walls.reduce((total, wall) => {
    const uValue = calculateUValue(wall.materials);
    return total + calculateHeatLoss(uValue, wall.area, exteriorTemp - TEMPERATURE_CONFORT_ETE);
  }, 0);

  // Gains par ventilation
  const ventilationGain = calculateVentilationHeatLoss(
    airFlow,
    exteriorTemp - TEMPERATURE_CONFORT_ETE,
    DENSITE_AIR,
    CHALEUR_SPECIFIQUE_AIR
  );

  // Apports internes
  const internalGains = 
    occupants * APPORT_CHALEUR_OCCUPANT + 
    surfaceHabitable * APPORT_CHALEUR_EQUIPEMENT;

  // Puissance totale de refroidissement nécessaire
  const totalCoolingPower = transmissionGain + ventilationGain + internalGains + solarGains;

  return {
    transmissionGain,
    ventilationGain,
    internalGains,
    solarGains,
    totalCoolingPower
  };
};
export const calculateTotalHeatLoss = (
  walls: Wall[],
  interiorTemp: number,
  exteriorTemp: number
): number => {
  return walls.reduce((total, wall) => {
    const uValue = calculateUValue(wall.materials);
    const heatLoss = calculateHeatLoss(uValue, wall.area, interiorTemp - exteriorTemp);
    return total + heatLoss;
  }, 0);
};