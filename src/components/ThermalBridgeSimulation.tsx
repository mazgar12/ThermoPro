import React, { useRef, useEffect, useState } from 'react';
import { X, Thermometer, ArrowRight, Compass, Eye, EyeOff } from 'lucide-react';
import { ThermalSimulationResult } from '../utils/femCalculations';

interface ThermalBridgeSimulationProps {
  width: number;
  height: number;
  simulationResult: ThermalSimulationResult | null;
  interiorTemp: number;
  exteriorTemp: number;
  onClose: () => void;
}

export default function ThermalBridgeSimulation({
  width,
  height,
  simulationResult,
  interiorTemp,
  exteriorTemp,
  onClose
}: ThermalBridgeSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showIsotherms, setShowIsotherms] = useState(true);
  const [showFlux, setShowFlux] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  const [colormap, setColormap] = useState<'rainbow' | 'thermal'>('thermal');

  // Fonction pour générer les couleurs en fonction de la température
  const getTemperatureColor = (temp: number): string => {
    if (!simulationResult) return 'rgb(200, 200, 200)';
    
    const { minTemperature, maxTemperature } = simulationResult;
    const range = maxTemperature - minTemperature;
    
    // Normaliser la température entre 0 et 1
    const normalizedTemp = (temp - minTemperature) / range;
    
    if (colormap === 'rainbow') {
      // Palette arc-en-ciel (violet -> bleu -> cyan -> vert -> jaune -> rouge)
      if (normalizedTemp < 0.2) {
        return interpolateColor(normalizedTemp / 0.2, [110, 0, 220], [0, 0, 255]);
      } else if (normalizedTemp < 0.4) {
        return interpolateColor((normalizedTemp - 0.2) / 0.2, [0, 0, 255], [0, 255, 255]);
      } else if (normalizedTemp < 0.6) {
        return interpolateColor((normalizedTemp - 0.4) / 0.2, [0, 255, 255], [0, 255, 0]);
      } else if (normalizedTemp < 0.8) {
        return interpolateColor((normalizedTemp - 0.6) / 0.2, [0, 255, 0], [255, 255, 0]);
      } else {
        return interpolateColor((normalizedTemp - 0.8) / 0.2, [255, 255, 0], [255, 0, 0]);
      }
    } else {
      // Palette thermique (bleu -> cyan -> vert -> jaune -> rouge)
      if (normalizedTemp < 0.25) {
        return interpolateColor(normalizedTemp / 0.25, [0, 0, 255], [0, 255, 255]);
      } else if (normalizedTemp < 0.5) {
        return interpolateColor((normalizedTemp - 0.25) / 0.25, [0, 255, 255], [0, 255, 0]);
      } else if (normalizedTemp < 0.75) {
        return interpolateColor((normalizedTemp - 0.5) / 0.25, [0, 255, 0], [255, 255, 0]);
      } else {
        return interpolateColor((normalizedTemp - 0.75) / 0.25, [255, 255, 0], [255, 0, 0]);
      }
    }
  };
  
  const interpolateColor = (factor: number, color1: number[], color2: number[]): string => {
    const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const drawResults = () => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationResult) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);
    
    // Définir les paramètres de visualisation
    ctx.save();
    ctx.translate(offset.x + width / 2, offset.y + height / 2);
    ctx.scale(zoom, zoom);
    
    // Trouver les limites du modèle pour le centrage
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    simulationResult.nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    });
    
    // Centrer le modèle
    const modelWidth = maxX - minX;
    const modelHeight = maxY - minY;
    const modelCenterX = minX + modelWidth / 2;
    const modelCenterY = minY + modelHeight / 2;
    ctx.translate(-modelCenterX, -modelCenterY);
    
    // Dessiner les éléments triangulaires avec interpolation de couleur
    simulationResult.elements.forEach(element => {
      const [i, j, k] = element.nodes;
      const ni = simulationResult.nodes[i];
      const nj = simulationResult.nodes[j];
      const nk = simulationResult.nodes[k];
      
      ctx.beginPath();
      ctx.moveTo(ni.x, ni.y);
      ctx.lineTo(nj.x, nj.y);
      ctx.lineTo(nk.x, nk.y);
      ctx.closePath();
      
      // Couleur basée sur la température moyenne
      const avgTemp = (ni.temperature + nj.temperature + nk.temperature) / 3;
      ctx.fillStyle = getTemperatureColor(avgTemp);
      ctx.fill();
      
      // Si le maillage est visible, dessiner les contours
      if (showMesh) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });
    
    // Dessiner les isothermes
    if (showIsotherms && simulationResult.isotherms) {
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      
      simulationResult.isotherms.forEach((isotherm, index) => {
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.3 + index * 0.05})`;
        
        // Dessiner l'isotherme en traçant des segments entre les triangles
        simulationResult.elements.forEach(element => {
          const [i, j, k] = element.nodes;
          const ni = simulationResult.nodes[i];
          const nj = simulationResult.nodes[j];
          const nk = simulationResult.nodes[k];
          
          // Vérifier si l'isotherme traverse ce triangle
          const temps = [ni.temperature, nj.temperature, nk.temperature];
          const minTemp = Math.min(...temps);
          const maxTemp = Math.max(...temps);
          
          if (isotherm >= minTemp && isotherm <= maxTemp) {
            // Interpolation linéaire pour trouver les points d'intersection
            const segments = findIsothermSegments(
              [ni.x, ni.y, ni.temperature],
              [nj.x, nj.y, nj.temperature],
              [nk.x, nk.y, nk.temperature],
              isotherm
            );
            
            segments.forEach(segment => {
              ctx.beginPath();
              ctx.moveTo(segment[0], segment[1]);
              ctx.lineTo(segment[2], segment[3]);
              ctx.stroke();
            });
          }
        });
      });
      
      ctx.setLineDash([]);
    }
    
    // Dessiner les flux thermiques
    if (showFlux && simulationResult.fluxValues) {
      ctx.lineWidth = 1;
      
      simulationResult.fluxValues.forEach(flux => {
        // Normaliser la magnitude du flux pour la longueur des flèches
        const maxFlux = Math.max(...simulationResult.fluxValues.map(f => f.magnitude));
        const arrowLength = Math.min(10, 5 + 15 * (flux.magnitude / maxFlux));
        
        // Couleur basée sur l'intensité du flux
        const intensity = Math.min(1, flux.magnitude / maxFlux);
        ctx.strokeStyle = `rgba(255, 0, 0, ${intensity * 0.7})`;
        
        // Dessiner la flèche de flux
        drawArrow(ctx, flux.x, flux.y, arrowLength);
      });
    }
    
    // Légende de température
    drawTemperatureLegend(ctx, simulationResult.minTemperature, simulationResult.maxTemperature);
    
    ctx.restore();
  };
  
  const findIsothermSegments = (
    p1: number[],
    p2: number[],
    p3: number[],
    isotherm: number
  ): number[][] => {
    const segments: number[][] = [];
    
    // Vérifier chaque côté du triangle
    const sides = [
      [p1, p2],
      [p2, p3],
      [p3, p1]
    ];
    
    const intersections: number[][] = [];
    
    sides.forEach(side => {
      const [a, b] = side;
      const t1 = a[2]; // Température au point a
      const t2 = b[2]; // Température au point b
      
      // Si l'isotherme traverse ce côté
      if ((t1 <= isotherm && t2 >= isotherm) || (t1 >= isotherm && t2 <= isotherm)) {
        // Interpolation linéaire
        const factor = (isotherm - t1) / (t2 - t1);
        const x = a[0] + factor * (b[0] - a[0]);
        const y = a[1] + factor * (b[1] - a[1]);
        
        intersections.push([x, y]);
      }
    });
    
    // Si on a trouvé 2 intersections, on dessine un segment
    if (intersections.length === 2) {
      segments.push([
        intersections[0][0],
        intersections[0][1],
        intersections[1][0],
        intersections[1][1]
      ]);
    }
    
    return segments;
  };
  
  const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, length: number) => {
    ctx.beginPath();
    ctx.moveTo(x - length / 2, y);
    ctx.lineTo(x + length / 2, y);
    ctx.stroke();
    
    // Pointe de la flèche
    ctx.beginPath();
    ctx.moveTo(x + length / 2, y);
    ctx.lineTo(x + length / 2 - 3, y - 3);
    ctx.lineTo(x + length / 2 - 3, y + 3);
    ctx.closePath();
    ctx.fill();
  };
  
  const drawTemperatureLegend = (ctx: CanvasRenderingContext2D, minTemp: number, maxTemp: number) => {
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = -legendWidth / 2;
    const legendY = -height / 2 + 30;
    
    // Fond de la légende
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(legendX - 10, legendY - 10, legendWidth + 20, legendHeight + 40);
    
    // Gradient de couleur
    const steps = 50;
    const stepWidth = legendWidth / steps;
    
    for (let i = 0; i < steps; i++) {
      const temp = minTemp + (i / steps) * (maxTemp - minTemp);
      ctx.fillStyle = getTemperatureColor(temp);
      ctx.fillRect(legendX + i * stepWidth, legendY, stepWidth, legendHeight);
    }
    
    // Cadre de la légende
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
    
    // Étiquettes de température
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const numLabels = 5;
    for (let i = 0; i < numLabels; i++) {
      const temp = minTemp + (i / (numLabels - 1)) * (maxTemp - minTemp);
      const x = legendX + (i / (numLabels - 1)) * legendWidth;
      
      ctx.fillText(temp.toFixed(1) + '°C', x, legendY + legendHeight + 5);
    }
    
    // Titre de la légende
    ctx.fillStyle = 'black';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Température (°C)', legendX + legendWidth / 2, legendY - 2);
  };
  
  useEffect(() => {
    drawResults();
  }, [simulationResult, showIsotherms, showFlux, showMesh, zoom, offset, colormap]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setStartDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - startDrag.x,
        y: e.clientY - startDrag.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const delta = e.deltaY < 0 ? zoomSpeed : -zoomSpeed;
    const newZoom = Math.max(0.2, Math.min(5, zoom + delta));
    setZoom(newZoom);
  };

  return (
    <div className="flex flex-col relative">
      <div className="bg-blue-50 p-4 mb-4 rounded-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-blue-600" />
          <span className="font-medium">Résultats de la Simulation</span>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setColormap(colormap === 'thermal' ? 'rainbow' : 'thermal')}
              className="px-2 py-1 bg-white rounded border border-blue-300 text-xs font-medium flex items-center gap-1 hover:bg-blue-50"
            >
              <Compass className="h-3 w-3" />
              {colormap === 'thermal' ? 'Palette: Thermique' : 'Palette: Arc-en-ciel'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIsotherms(!showIsotherms)}
              className={`px-2 py-1 rounded border text-xs font-medium flex items-center gap-1 ${
                showIsotherms 
                  ? 'bg-blue-100 border-blue-300 text-blue-800' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showIsotherms ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Isothermes
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFlux(!showFlux)}
              className={`px-2 py-1 rounded border text-xs font-medium flex items-center gap-1 ${
                showFlux 
                  ? 'bg-blue-100 border-blue-300 text-blue-800' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showFlux ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Flux
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMesh(!showMesh)}
              className={`px-2 py-1 rounded border text-xs font-medium flex items-center gap-1 ${
                showMesh 
                  ? 'bg-blue-100 border-blue-300 text-blue-800' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showMesh ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Maillage
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-red-100 text-red-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          className="bg-white"
        />
        
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={() => setZoom(Math.min(5, zoom + 0.1))}
            className="w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-blue-700 font-bold"
          >
            +
          </button>
          <button
            onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
            className="w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-blue-700 font-bold"
          >
            -
          </button>
        </div>
        
        {simulationResult && (
          <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-md text-sm">
            <div className="font-semibold mb-1">Résultats</div>
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-600">PSI:</span>
                <span className="font-medium">{simulationResult.psiValue.toFixed(3)} W/(m·K)</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-600">fRsi:</span>
                <span className="font-medium">{simulationResult.fRsiValue.toFixed(3)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>
          <span className="font-medium">Aide: </span> 
          Utilisez la molette pour zoomer et cliquez-glissez pour déplacer la vue.
        </p>
      </div>
    </div>
  );
}