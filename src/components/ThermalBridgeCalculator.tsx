import React, { useState, useEffect } from 'react';
import { Calculator, Ruler, ThermometerSun, ArrowRight, Droplets, Activity } from 'lucide-react';
import ThermalBridgeDrawing from './ThermalBridgeDrawing';
import ThermalBridgeSimulation from './ThermalBridgeSimulation';
import { DrawingElement, ValidationResult } from '../types/thermal';
import { generateMesh, solveHeatTransfer, ThermalSimulationResult } from '../utils/femCalculations';

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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<ThermalSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [meshSize, setMeshSize] = useState(3); // Taille de maillage par défaut en mm
  const [adaptiveFactor, setAdaptiveFactor] = useState(0.3); // Facteur de raffinement adaptatif
  const [maxIterations, setMaxIterations] = useState(1000); // Nombre maximal d'itérations

  const handleDrawingChange = (elements: DrawingElement[]) => {
    setDrawingElements(elements);
    setSimulationResult(null); // Réinitialiser les résultats de simulation quand le dessin change
  };

  const handleValidationChange = (validation: ValidationResult) => {
    setValidationResult(validation);
  };

  const dewPoint = calculateDewPoint(newBridge.tempInt, newBridge.humidity);
  
  const runSimulation = () => {
    setIsSimulating(true);
    
    // Lancer la simulation dans un timeout pour permettre à l'UI de se mettre à jour
    setTimeout(() => {
      try {
        // Générer le maillage
        const mesh = generateMesh(
          drawingElements,
          meshSize,
          adaptiveFactor,
          newBridge.tempInt,
          newBridge.tempExt
        );
        
        // Résoudre le problème thermique
        const result = solveHeatTransfer(mesh, maxIterations);
        
        // Mettre à jour les résultats
        setSimulationResult(result);
        
        // Mettre à jour le PSI et le fRsi dans le pont thermique
        setNewBridge({
          ...newBridge,
          psiValue: result.psiValue,
          fRsi: result.fRsiValue
        });
        
        // Afficher la simulation
        setShowSimulation(true);
      } catch (error) {
        console.error('Erreur lors de la simulation :', error);
        alert('Une erreur est survenue lors de la simulation. Veuillez vérifier votre dessin.');
      } finally {
        setIsSimulating(false);
      }
    }, 100);
  };

  const minSurfaceTemp = simulationResult 
    ? newBridge.tempExt + simulationResult.fRsiValue * (newBridge.tempInt - newBridge.tempExt)
    : newBridge.tempExt + newBridge.fRsi * (newBridge.tempInt - newBridge.tempExt);
    
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
            {!showSimulation ? (
              <ThermalBridgeDrawing
                width={800}
                height={600}
                onDrawingChange={handleDrawingChange}
                onValidationChange={handleValidationChange}
              />
            ) : (
              <ThermalBridgeSimulation
                width={800}
                height={600}
                simulationResult={simulationResult}
                interiorTemp={newBridge.tempInt}
                exteriorTemp={newBridge.tempExt}
                onClose={() => setShowSimulation(false)}
              />
            )}
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

              <div className="bg-blue-50 p-4 rounded-lg mt-6">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Configuration de la simulation
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-blue-700">
                      Taille de maillage (mm)
                    </label>
                    <input
                      type="number"
                      value={meshSize}
                      onChange={(e) => setMeshSize(parseFloat(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs"
                      min="1"
                      max="10"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700">
                      Facteur adaptatif
                    </label>
                    <input
                      type="number"
                      value={adaptiveFactor}
                      onChange={(e) => setAdaptiveFactor(parseFloat(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs"
                      min="0.1"
                      max="1"
                      step="0.1"
                    />
                  </div>
                </div>

                <button
                  onClick={runSimulation}
                  disabled={isSimulating || drawingElements.length === 0}
                  className={`mt-4 w-full py-2 px-4 rounded-md text-white font-medium flex items-center justify-center gap-2 
                    ${isSimulating ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSimulating ? (
                    <>
                      <Activity className="h-4 w-4 animate-spin" />
                      Simulation en cours...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Lancer la simulation
                    </>
                  )}
                </button>
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

            {simulationResult && (
              <div className="mt-4 p-6 rounded-lg bg-indigo-50">
                <h4 className="text-base font-medium mb-4 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Résultats de la Simulation
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Valeur PSI (pont thermique):</span>
                    <span className="font-medium">{simulationResult.psiValue.toFixed(3)} W/(m·K)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Facteur fRsi:</span>
                    <span className="font-medium">{simulationResult.fRsiValue.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Température min / max:</span>
                    <span className="font-medium">
                      {simulationResult.minTemperature.toFixed(1)}°C / {simulationResult.maxTemperature.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="border-t border-indigo-200 pt-2 mt-2 text-center">
                    <button
                      onClick={() => setShowSimulation(true)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      Visualiser les résultats
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}