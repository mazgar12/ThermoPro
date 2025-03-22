import React, { useState } from 'react';
import { Calculator, Ruler, ThermometerSun, ArrowRight, Droplets } from 'lucide-react';
import ThermalBridgeDrawing from './ThermalBridgeDrawing';
import { DrawingElement, ValidationResult } from '../types/thermal';

interface ThermalBridgeConfig {
  type: 'linéaire' | 'ponctuel';
  position: 'plancher' | 'mur' | 'toiture' | 'menuiserie';
  configuration: string;
  length?: number;
  tempInt: number;
  tempExt: number;
  psiValue: number;
  chiValue?: number;
  humidity: number;
  fRsi: number;
  materials: {
    name: string;
    thickness: number;
    conductivity: number;
  }[];
}

const defaultConfigurations = {
  plancher: [
    { 
      name: 'Plancher intermédiaire',
      psiDefault: 0.65,
      fRsiDefault: 0.75,
      materials: [
        { name: 'Dalle béton', thickness: 200, conductivity: 2.3 },
        { name: 'Isolation', thickness: 100, conductivity: 0.035 }
      ]
    },
    { 
      name: 'Plancher bas sur terre-plein',
      psiDefault: 0.45,
      fRsiDefault: 0.80,
      materials: [
        { name: 'Dalle béton', thickness: 200, conductivity: 2.3 },
        { name: 'Isolation', thickness: 120, conductivity: 0.035 }
      ]
    }
  ],
  mur: [
    {
      name: 'Angle sortant',
      psiDefault: 0.15,
      fRsiDefault: 0.85,
      materials: [
        { name: 'Béton', thickness: 200, conductivity: 2.3 },
        { name: 'Isolation', thickness: 120, conductivity: 0.035 }
      ]
    }
  ],
  menuiserie: [
    {
      name: 'Appui de fenêtre',
      psiDefault: 0.35,
      fRsiDefault: 0.70,
      materials: [
        { name: 'Menuiserie PVC', thickness: 70, conductivity: 0.17 },
        { name: 'Double vitrage', thickness: 24, conductivity: 1.0 }
      ]
    }
  ],
  toiture: [
    {
      name: 'Acrotère',
      psiDefault: 0.80,
      fRsiDefault: 0.65,
      materials: [
        { name: 'Béton', thickness: 200, conductivity: 2.3 },
        { name: 'Isolation', thickness: 160, conductivity: 0.035 }
      ]
    }
  ]
};

const calculateDewPoint = (temperature: number, humidity: number) => {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
};

export default function ThermalBridgeCalculator() {
  const [bridges, setBridges] = useState<ThermalBridgeConfig[]>([]);
  const [newBridge, setNewBridge] = useState<ThermalBridgeConfig>({
    type: 'linéaire',
    position: 'mur',
    configuration: '',
    length: 1,
    tempInt: 20,
    tempExt: 0,
    psiValue: 0,
    humidity: 50,
    fRsi: 0.75,
    materials: []
  });
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);

  const handleDrawingChange = (elements: DrawingElement[]) => {
    console.log('Drawing updated:', elements);
    setDrawingElements(elements);
  };

  const handleValidationChange = (validation: ValidationResult) => {
    console.log('Validation results:', validation);
  };

  const dewPoint = calculateDewPoint(newBridge.tempInt, newBridge.humidity);
  const minSurfaceTemp = newBridge.tempExt + newBridge.fRsi * (newBridge.tempInt - newBridge.tempExt);
  const condensationRisk = minSurfaceTemp < dewPoint;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          Pont Thermique
        </h2>

        {/* Drawing Area */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Dessin du Pont Thermique
          </h3>
          <div className="border rounded-lg p-4">
            <ThermalBridgeDrawing
              width={800}
              height={600}
              onDrawingChange={handleDrawingChange}
              onValidationChange={handleValidationChange}
            />
          </div>
        </div>

        {/* Thermal Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Analyse Thermique
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Température Intérieure (°C)
                </label>
                <input
                  type="number"
                  value={newBridge.tempInt}
                  onChange={(e) => setNewBridge({ ...newBridge, tempInt: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Température Extérieure (°C)
                </label>
                <input
                  type="number"
                  value={newBridge.tempExt}
                  onChange={(e) => setNewBridge({ ...newBridge, tempExt: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Humidité Relative (%)
                </label>
                <input
                  type="number"
                  value={newBridge.humidity}
                  onChange={(e) => setNewBridge({ ...newBridge, humidity: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Facteur fRsi
                </label>
                <input
                  type="number"
                  value={newBridge.fRsi}
                  onChange={(e) => setNewBridge({ ...newBridge, fRsi: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Résultats
            </h3>
            <div className={`p-6 rounded-lg ${condensationRisk ? 'bg-red-50' : 'bg-green-50'}`}>
              <h4 className="text-base font-medium mb-4 flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Analyse du Risque de Condensation
              </h4>
              <div className="space-y-2">
                <p className="flex justify-between">
                  <span>Point de rosée:</span>
                  <span className="font-medium">{dewPoint.toFixed(1)}°C</span>
                </p>
                <p className="flex justify-between">
                  <span>Température de surface minimale:</span>
                  <span className="font-medium">{minSurfaceTemp.toFixed(1)}°C</span>
                </p>
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <p className={`font-medium ${condensationRisk ? 'text-red-700' : 'text-green-700'}`}>
                    {condensationRisk 
                      ? 'Risque de condensation !' 
                      : 'Pas de risque de condensation'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}