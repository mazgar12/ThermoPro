import React, { useState } from 'react';
import { Building } from '../types/thermal';
import { Building2, MapPin, Ruler, ThermometerSun } from 'lucide-react';

export default function BuildingData() {
  const [building, setBuilding] = useState<Partial<Building>>({
    nom: '',
    localisation: {
      latitude: 48.8566,
      longitude: 2.3522,
      altitude: 0,
      zoneClimatique: 'H1a'
    },
    dimensions: {
      surfaceHabitable: 0,
      volume: 0,
      hauteurSousPLafond: 2.5
    }
  });

  const zonesClimatiques = [
    { id: 'H1a', name: 'H1a - Nord de la France' },
    { id: 'H1b', name: 'H1b - Est de la France' },
    { id: 'H1c', name: 'H1c - Région parisienne' },
    { id: 'H2a', name: 'H2a - Bretagne' },
    { id: 'H2b', name: 'H2b - Centre de la France' },
    { id: 'H2c', name: 'H2c - Sud-Ouest' },
    { id: 'H2d', name: 'H2d - Sud-Est méditerranéen' },
    { id: 'H3', name: 'H3 - Méditerranée' }
  ];

  const updateBuilding = (path: string[], value: any) => {
    setBuilding(prev => {
      const newBuilding = { ...prev };
      let current: any = newBuilding;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newBuilding;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Building2 className="h-6 w-6 text-blue-600" />
        Données du Bâtiment
      </h2>

      <div className="space-y-8">
        {/* Informations Générales */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Informations Générales
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom du Projet
              </label>
              <input
                type="text"
                value={building.nom}
                onChange={(e) => updateBuilding(['nom'], e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Nom du projet"
              />
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Localisation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Latitude
              </label>
              <input
                type="number"
                value={building.localisation?.latitude}
                onChange={(e) => updateBuilding(['localisation', 'latitude'], parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                step="0.0001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Longitude
              </label>
              <input
                type="number"
                value={building.localisation?.longitude}
                onChange={(e) => updateBuilding(['localisation', 'longitude'], parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                step="0.0001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Altitude (m)
              </label>
              <input
                type="number"
                value={building.localisation?.altitude}
                onChange={(e) => updateBuilding(['localisation', 'altitude'], parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Zone Climatique
              </label>
              <select
                value={building.localisation?.zoneClimatique}
                onChange={(e) => updateBuilding(['localisation', 'zoneClimatique'], e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {zonesClimatiques.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Ruler className="h-5 w-5 text-blue-600" />
            Dimensions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Surface Habitable (m²)
              </label>
              <input
                type="number"
                value={building.dimensions?.surfaceHabitable}
                onChange={(e) => updateBuilding(['dimensions', 'surfaceHabitable'], parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Volume (m³)
              </label>
              <input
                type="number"
                value={building.dimensions?.volume}
                onChange={(e) => updateBuilding(['dimensions', 'volume'], parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hauteur sous Plafond (m)
              </label>
              <input
                type="number"
                value={building.dimensions?.hauteurSousPLafond}
                onChange={(e) => updateBuilding(['dimensions', 'hauteurSousPLafond'], parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Résumé */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
            <ThermometerSun className="h-4 w-4" />
            Résumé des Caractéristiques
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p>Surface: {building.dimensions?.surfaceHabitable} m²</p>
              <p>Volume: {building.dimensions?.volume} m³</p>
            </div>
            <div>
              <p>Zone: {zonesClimatiques.find(z => z.id === building.localisation?.zoneClimatique)?.name}</p>
              <p>Altitude: {building.localisation?.altitude} m</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}