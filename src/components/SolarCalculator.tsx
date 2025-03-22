import React, { useState } from 'react';
import { Sun, Battery, Compass, Calendar, Zap } from 'lucide-react';

interface SolarCalculation {
  puissanceRequise: number;
  nombrePanneaux: number;
  surfaceNecessaire: number;
  productionAnnuelle: number;
  rentabilite: number;
}

interface PanneauSolaire {
  puissance: number; // Wc
  rendement: number; // %
  surface: number; // m²
  prix: number; // €
  marque: string;
  modele: string;
  type: 'monocristallin' | 'polycristallin' | 'bifacial';
}

const panneauxDisponibles: PanneauSolaire[] = [
  { 
    marque: 'Meyer Burger',
    modele: 'White',
    type: 'monocristallin',
    puissance: 400,
    rendement: 21.8,
    surface: 1.87,
    prix: 450
  },
  {
    marque: 'Meyer Burger',
    modele: 'Black',
    type: 'monocristallin',
    puissance: 390,
    rendement: 21.3,
    surface: 1.87,
    prix: 440
  },
  {
    marque: 'Megasol',
    modele: 'M400',
    type: 'monocristallin',
    puissance: 400,
    rendement: 21.5,
    surface: 1.92,
    prix: 420
  },
  {
    marque: 'LONGi',
    modele: 'Hi-MO5',
    type: 'bifacial',
    puissance: 540,
    rendement: 21.3,
    surface: 2.56,
    prix: 580
  },
  {
    marque: 'JA Solar',
    modele: 'JAM72S30',
    type: 'monocristallin',
    puissance: 535,
    rendement: 21.0,
    surface: 2.55,
    prix: 560
  }
];

export default function SolarCalculator() {
  const [customPanel, setCustomPanel] = useState<PanneauSolaire>({
    marque: '',
    modele: '',
    type: 'monocristallin',
    puissance: 0,
    rendement: 0,
    surface: 0,
    prix: 0
  });

  const [parameters, setParameters] = useState({
    consommationAnnuelle: 0, // kWh/an
    orientation: 'sud',
    inclinaison: 30, // degrés
    latitude: 46.9480, // Bern par défaut
    longitude: 7.4474,
    ombrages: 0, // % de pertes
    panneauChoisi: panneauxDisponibles[0],
    tarifElectricite: 0.25, // CHF/kWh
    useCustomPanel: false
  });

  const [results, setResults] = useState<SolarCalculation | null>(null);

  const calculateSolarNeeds = () => {
    // Facteurs de correction
    const orientationFactors: { [key: string]: number } = {
      sud: 1,
      sudEst: 0.95,
      sudOuest: 0.95,
      est: 0.85,
      ouest: 0.85,
      nord: 0.65,
    };

    // Irradiation solaire moyenne en Suisse (kWh/m²/an)
    const baseIrradiation = 1100;
    
    // Facteur d'inclinaison optimal (30-35° en Suisse)
    const inclinaisonFactor = Math.cos((Math.abs(parameters.inclinaison - 33) * Math.PI) / 180);
    
    // Calcul de la production
    const productionParWc = baseIrradiation * 
      orientationFactors[parameters.orientation] * 
      inclinaisonFactor * 
      (1 - parameters.ombrages / 100) * 
      (parameters.panneauChoisi.rendement / 100);

    // Puissance crête nécessaire (Wc)
    const puissanceRequise = (parameters.consommationAnnuelle * 1000) / productionParWc;
    
    // Nombre de panneaux nécessaires
    const nombrePanneaux = Math.ceil(puissanceRequise / parameters.panneauChoisi.puissance);
    
    // Surface totale nécessaire
    const surfaceNecessaire = nombrePanneaux * parameters.panneauChoisi.surface;
    
    // Production annuelle estimée
    const productionAnnuelle = nombrePanneaux * 
      parameters.panneauChoisi.puissance * 
      productionParWc / 1000; // kWh/an

    // Calcul de rentabilité
    const coutInstallation = nombrePanneaux * parameters.panneauChoisi.prix * 1.5; // +50% pour l'installation
    const economiesAnnuelles = productionAnnuelle * parameters.tarifElectricite;
    const rentabilite = coutInstallation / economiesAnnuelles; // années

    setResults({
      puissanceRequise,
      nombrePanneaux,
      surfaceNecessaire,
      productionAnnuelle,
      rentabilite,
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Consommation */}
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Consommation Électrique
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consommation Annuelle (kWh/an)
              </label>
              <input
                type="number"
                value={parameters.consommationAnnuelle}
                onChange={(e) => setParameters(prev => ({
                  ...prev,
                  consommationAnnuelle: parseFloat(e.target.value)
                }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif Électricité (€/kWh)
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif Électricité (CHF/kWh)
              </label>
              <input
                type="number"
                value={parameters.tarifElectricite}
                onChange={(e) => setParameters(prev => ({
                  ...prev,
                  tarifElectricite: parseFloat(e.target.value)
                }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                step="0.0001"
              />
            </div>
          </div>
        </div>

        {/* Installation */}
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Configuration Installation
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Orientation
              </label>
              <select
                value={parameters.orientation}
                onChange={(e) => setParameters(prev => ({
                  ...prev,
                  orientation: e.target.value
                }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              >
                <option value="sud">Sud</option>
                <option value="sudEst">Sud-Est</option>
                <option value="sudOuest">Sud-Ouest</option>
                <option value="est">Est</option>
                <option value="ouest">Ouest</option>
                <option value="nord">Nord</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inclinaison (degrés)
              </label>
              <input
                type="number"
                value={parameters.inclinaison}
                onChange={(e) => setParameters(prev => ({
                  ...prev,
                  inclinaison: parseFloat(e.target.value)
                }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pertes par Ombrage (%)
              </label>
              <input
                type="number"
                value={parameters.ombrages}
                onChange={(e) => setParameters(prev => ({
                  ...prev,
                  ombrages: parseFloat(e.target.value)
                }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Choix des Panneaux */}
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Battery className="h-5 w-5 text-amber-500" />
            Choix du Panneau
          </h3>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={!parameters.useCustomPanel}
                  onChange={() => setParameters(prev => ({ ...prev, useCustomPanel: false }))}
                  className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-gray-300"
                />
                <span className="ml-2">Panneaux du marché</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={parameters.useCustomPanel}
                  onChange={() => setParameters(prev => ({ ...prev, useCustomPanel: true }))}
                  className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-gray-300"
                />
                <span className="ml-2">Panneau personnalisé</span>
              </label>
            </div>

            {parameters.useCustomPanel ? (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marque</label>
                    <input
                      type="text"
                      value={customPanel.marque}
                      onChange={(e) => setCustomPanel(prev => ({ ...prev, marque: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Modèle</label>
                    <input
                      type="text"
                      value={customPanel.modele}
                      onChange={(e) => setCustomPanel(prev => ({ ...prev, modele: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={customPanel.type}
                      onChange={(e) => setCustomPanel(prev => ({ ...prev, type: e.target.value as any }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    >
                      <option value="monocristallin">Monocristallin</option>
                      <option value="polycristallin">Polycristallin</option>
                      <option value="bifacial">Bifacial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Puissance (Wc)</label>
                    <input
                      type="number"
                      value={customPanel.puissance}
                      onChange={(e) => setCustomPanel(prev => ({ ...prev, puissance: parseFloat(e.target.value) }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rendement (%)</label>
                    <input
                      type="number"
                      value={customPanel.rendement}
                      onChange={(e) => setCustomPanel(prev => ({ ...prev, rendement: parseFloat(e.target.value) }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Surface (m²)</label>
                    <input
                      type="number"
                      value={customPanel.surface}
                      onChange={(e) => setCustomPanel(prev => ({ ...prev, surface: parseFloat(e.target.value) }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prix (CHF)</label>
                  <input
  type="number"
  value={customPanel.prix}
  onChange={(e) => {
    setCustomPanel(prev => ({
      ...prev, 
      prix: parseFloat(e.target.value)
    }));
  }}
  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
/>
                </div>
              </div>
            ) : (
              <div>
                {panneauxDisponibles.map((panneau, index) => (
                  <div key={index} className="flex items-center">
                    <input
                      type="radio"
                      id={`panneau-${index}`}
                      name="panneau"
                      checked={parameters.panneauChoisi === panneau}
                      onChange={() => setParameters(prev => ({
                        ...prev,
                        panneauChoisi: panneau
                      }))}
                      className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-gray-300"
                    />
                    <label htmlFor={`panneau-${index}`} className="ml-3 block text-sm text-gray-700">
                      <span className="font-medium">{panneau.marque} {panneau.modele}</span>
                      <span className="block text-sm text-gray-500">
                        {panneau.puissance}Wc - {panneau.type} -
                        Rendement: {panneau.rendement}% -
                        Surface: {panneau.surface}m² -
                        Prix: {panneau.prix} CHF
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-500" />
            Localisation
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                value={parameters.latitude}
                onChange={(e) => setParameters(prev => ({
                  ...prev,
                  latitude: parseFloat(e.target.value)
                }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                step="0.0001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                value={parameters.longitude}
                onChange={(e) => setParameters(prev => ({
                  ...prev,
                  longitude: parseFloat(e.target.value)
                }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                step="0.0001"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={calculateSolarNeeds}
          className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
        >
          Calculer le Dimensionnement
        </button>
      </div>

      {results && (
        <div className="bg-amber-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-medium text-amber-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Résultats du Dimensionnement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-500">Puissance Crête Requise</p>
              <p className="text-2xl font-bold text-amber-600">
                {Math.round(results.puissanceRequise)} Wc
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-500">Nombre de Panneaux</p>
              <p className="text-2xl font-bold text-amber-600">
                {results.nombrePanneaux}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-500">Surface Nécessaire</p>
              <p className="text-2xl font-bold text-amber-600">
                {results.surfaceNecessaire.toFixed(1)} m²
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-500">Production Annuelle Estimée</p>
              <p className="text-2xl font-bold text-amber-600">
                {Math.round(results.productionAnnuelle)} kWh/an
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-500">Retour sur Investissement</p>
              <p className="text-2xl font-bold text-amber-600">
                {results.rentabilite.toFixed(1)} années
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}