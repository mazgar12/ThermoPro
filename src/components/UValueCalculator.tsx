import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BuildingMaterial } from '../types/thermal';
import { calculateUValue } from '../utils/calculations';

const materialCategories = [
  {
    name: 'Maçonnerie',
    materials: [
      { name: 'Brique Pleine', thermalConductivity: 1.0, thickness: 0.2 },
      { name: 'Brique Creuse', thermalConductivity: 0.4, thickness: 0.2 },
      { name: 'Bloc Béton Plein', thermalConductivity: 1.65, thickness: 0.2 },
      { name: 'Bloc Béton Creux', thermalConductivity: 0.74, thickness: 0.2 },
      { name: 'Béton Armé', thermalConductivity: 2.3, thickness: 0.2 },
      { name: 'Béton Cellulaire', thermalConductivity: 0.11, thickness: 0.2 },
      { name: 'Pierre Calcaire', thermalConductivity: 1.7, thickness: 0.3 },
    ]
  },
  {
    name: 'Isolants',
    materials: [
      { name: 'Laine de Verre', thermalConductivity: 0.035, thickness: 0.1 },
      { name: 'Laine de Roche', thermalConductivity: 0.036, thickness: 0.1 },
      { name: 'Polystyrène Expansé', thermalConductivity: 0.038, thickness: 0.1 },
      { name: 'Polystyrène Extrudé', thermalConductivity: 0.032, thickness: 0.1 },
      { name: 'Polyuréthane', thermalConductivity: 0.025, thickness: 0.1 },
      { name: 'Liège Expansé', thermalConductivity: 0.04, thickness: 0.08 },
      { name: 'Fibre de Bois', thermalConductivity: 0.042, thickness: 0.1 },
    ]
  },
  {
    name: 'Bois et Dérivés',
    materials: [
      { name: 'Bois Massif', thermalConductivity: 0.13, thickness: 0.02 },
      { name: 'Contreplaqué', thermalConductivity: 0.15, thickness: 0.02 },
      { name: 'OSB', thermalConductivity: 0.13, thickness: 0.015 },
      { name: 'Panneau de Particules', thermalConductivity: 0.12, thickness: 0.02 },
    ]
  },
  {
    name: 'Revêtements',
    materials: [
      { name: 'Plaque de Plâtre', thermalConductivity: 0.25, thickness: 0.013 },
      { name: 'Enduit Plâtre', thermalConductivity: 0.43, thickness: 0.015 },
      { name: 'Enduit Ciment', thermalConductivity: 1.15, thickness: 0.02 },
      { name: 'Carrelage', thermalConductivity: 1.7, thickness: 0.01 },
      { name: 'Bardage Métallique', thermalConductivity: 50, thickness: 0.001 },
    ]
  },
  {
    name: 'Menuiseries',
    materials: [
      { name: 'Double Vitrage 4/16/4', thermalConductivity: 2.9, thickness: 0.024 },
      { name: 'Triple Vitrage 4/16/4/16/4', thermalConductivity: 1.8, thickness: 0.044 },
      { name: 'Cadre PVC', thermalConductivity: 0.17, thickness: 0.06 },
      { name: 'Cadre Aluminium', thermalConductivity: 230, thickness: 0.06 },
    ]
  }
];

export default function UValueCalculator() {
  const [materials, setMaterials] = useState<BuildingMaterial[]>([]);
  const [uValue, setUValue] = useState<number | null>(null);

  const addMaterial = (material: BuildingMaterial) => {
    setMaterials([...materials, { ...material }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, updates: Partial<BuildingMaterial>) => {
    setMaterials(
      materials.map((material, i) =>
        i === index ? { ...material, ...updates } : material
      )
    );
  };

  const calculateResult = () => {
    if (materials.length === 0) return;
    const result = calculateUValue(materials);
    setUValue(result);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Calculateur de Coefficient U
      </h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ajouter un Matériau
        </label>
        <div className="space-y-6">
          {materialCategories.map((category) => (
            <div key={category.name}>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {category.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.materials.map((material) => (
                  <button
                    key={material.name}
                    onClick={() => addMaterial(material)}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <div>
                      <span className="block">{material.name}</span>
                      <span className="text-sm text-gray-500">
                        λ = {material.thermalConductivity} W/m·K
                      </span>
                    </div>
                    <Plus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {materials.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Couches de Matériaux
          </h3>
          <div className="space-y-3">
            {materials.map((material, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{material.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500">
                        Épaisseur (m)
                      </label>
                      <input
                        type="number"
                        value={material.thickness}
                        onChange={(e) =>
                          updateMaterial(index, {
                            thickness: parseFloat(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
                        step="0.001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">
                        λ (W/m·K)
                      </label>
                      <input
                        type="number"
                        value={material.thermalConductivity}
                        onChange={(e) =>
                          updateMaterial(index, {
                            thermalConductivity: parseFloat(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeMaterial(index)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={calculateResult}
          disabled={materials.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Calculer le Coefficient U
        </button>
        {uValue !== null && (
          <div className="text-lg">
            <span className="font-medium">Coefficient U :</span>{' '}
            <span className="text-blue-600 font-bold">{uValue.toFixed(3)}</span>{' '}
            <span className="text-sm text-gray-500">W/m²·K</span>
          </div>
        )}
      </div>
    </div>
  );
}