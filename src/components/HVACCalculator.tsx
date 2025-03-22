import React, { useState } from 'react';
import { Fan, Flame, Snowflake, Sun } from 'lucide-react';
import { calculateHeatingNeeds, calculateCoolingNeeds } from '../utils/calculations';
import { Building } from '../types/thermal';

interface HVACCalculatorProps {
  building?: Partial<Building>;
}

export default function HVACCalculator({ building }: HVACCalculatorProps) {
  const [climateData, setClimateData] = useState({
    exteriorTemp: 0,
    solarGains: 0,
  });

  const [results, setResults] = useState<{
    heating?: {
      transmissionLoss: number;
      ventilationLoss: number;
      internalGains: number;
      totalHeatingPower: number;
    };
    cooling?: {
      transmissionGain: number;
      ventilationGain: number;
      internalGains: number;
      solarGains: number;
      totalCoolingPower: number;
    };
  }>({});

  const calculateNeeds = () => {
    if (!building?.dimensions || !building.enveloppe) return;

    const walls = [
      ...(building.enveloppe.murs || []),
      ...(building.enveloppe.planchers || []),
      ...(building.enveloppe.toiture || []),
      ...(building.enveloppe.menuiseries || []),
    ];

    const heatingResults = calculateHeatingNeeds(
      walls,
      building.dimensions.volume,
      building.ventilation?.airFlow || 0,
      building.occupation?.occupants || 1,
      building.dimensions.surfaceHabitable,
      climateData.exteriorTemp
    );

    const coolingResults = calculateCoolingNeeds(
      walls,
      building.dimensions.volume,
      building.ventilation?.airFlow || 0,
      building.occupation?.occupants || 1,
      building.dimensions.surfaceHabitable,
      climateData.exteriorTemp,
      climateData.solarGains
    );

    setResults({
      heating: heatingResults,
      cooling: coolingResults,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Calcul des Besoins CVC
      </h2>

      <div className="space-y-8">
        {/* Données Climatiques */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Sun className="h-5 w-5 text-blue-600" />
            Données Climatiques
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Température Extérieure (°C)
              </label>
              <input
                type="number"
                value={climateData.exteriorTemp}
                onChange={(e) =>
                  setClimateData((prev) => ({
                    ...prev,
                    exteriorTemp: parseFloat(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Apports Solaires (W/m²)
              </label>
              <input
                type="number"
                value={climateData.solarGains}
                onChange={(e) =>
                  setClimateData((prev) => ({
                    ...prev,
                    solarGains: parseFloat(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                step="1"
              />
            </div>
          </div>
        </div>

        <button
          onClick={calculateNeeds}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Calculer les Besoins
        </button>

        {/* Résultats */}
        {(results.heating || results.cooling) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chauffage */}
            {results.heating && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-orange-900 mb-3 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-600" />
                  Besoins en Chauffage
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span>Pertes par Transmission:</span>
                    <span className="font-medium">{Math.round(results.heating.transmissionLoss)} W</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Pertes par Ventilation:</span>
                    <span className="font-medium">{Math.round(results.heating.ventilationLoss)} W</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Apports Internes:</span>
                    <span className="font-medium">{Math.round(results.heating.internalGains)} W</span>
                  </p>
                  <div className="border-t border-orange-200 pt-2 mt-2">
                    <p className="flex justify-between text-base font-semibold">
                      <span>Puissance Totale:</span>
                      <span className="text-orange-600">{Math.round(results.heating.totalHeatingPower)} W</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Climatisation */}
            {results.cooling && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Snowflake className="h-5 w-5 text-blue-600" />
                  Besoins en Climatisation
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span>Gains par Transmission:</span>
                    <span className="font-medium">{Math.round(results.cooling.transmissionGain)} W</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Gains par Ventilation:</span>
                    <span className="font-medium">{Math.round(results.cooling.ventilationGain)} W</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Apports Internes:</span>
                    <span className="font-medium">{Math.round(results.cooling.internalGains)} W</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Apports Solaires:</span>
                    <span className="font-medium">{Math.round(results.cooling.solarGains)} W</span>
                  </p>
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <p className="flex justify-between text-base font-semibold">
                      <span>Puissance Totale:</span>
                      <span className="text-blue-600">{Math.round(results.cooling.totalCoolingPower)} W</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}