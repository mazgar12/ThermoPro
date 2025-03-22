import React from 'react';
import { useState } from 'react';
import { Calculator, Building, Thermometer, Sun } from 'lucide-react';
import UValueCalculator from './components/UValueCalculator';
import BuildingData from './components/BuildingData';
import HVACCalculator from './components/HVACCalculator';
import SolarCalculator from './components/SolarCalculator';
import ThermalBridgeCalculator from './components/ThermalBridgeCalculator';

type Page = 'building' | 'thermal' | 'bridges' | 'hvac' | 'solar';

const pages = [
  { id: 'building', name: 'Données Bâtiment', icon: Building },
  { id: 'thermal', name: 'Analyse Thermique', icon: Thermometer },
  { id: 'bridges', name: 'Ponts Thermiques', icon: Calculator },
  { id: 'hvac', name: 'Calculs CVC', icon: Calculator },
  { id: 'solar', name: 'Photovoltaïque', icon: Sun },
];

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('building');

  const renderPage = () => {
    switch (currentPage) {
      case 'building':
        return (
          <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Données du Bâtiment</h1>
            <BuildingData />
          </div>
        );
      case 'thermal':
        return (
          <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Analyse Thermique</h1>
            <UValueCalculator />
          </div>
        );
      case 'bridges':
        return (
          <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Calcul des Ponts Thermiques</h1>
            <ThermalBridgeCalculator />
          </div>
        );
      case 'hvac':
        return (
          <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Calculs CVC</h1>
            <HVACCalculator />
          </div>
        );
      case 'solar':
        return (
          <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Dimensionnement Photovoltaïque</h1>
            <SolarCalculator />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Thermometer className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  Thermo Pro
                </span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {pages.map((page) => (
                  <a
                    key={page.id}
                    href="#"
                    onClick={() => setCurrentPage(page.id as Page)}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      currentPage === page.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <page.icon className="h-5 w-5 mr-2" />
                    {page.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-8 sm:px-0">
          <div className="bg-white rounded-lg shadow-xl p-6">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;