import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  MousePointer,
  Move,
  Square,
  Settings,
  Trash2
} from 'lucide-react';
import {
  Point,
  DrawingElement,
  Layer,
  Viewport,
  DrawingState,
  MaterialProperties,
  ValidationResult
} from '../types/thermal';
import {
  snapToGrid,
  screenToWorld,
  worldToScreen,
  validateDrawing
} from '../utils/drawingUtils';

interface ThermalBridgeDrawingProps {
  width: number;
  height: number;
  onDrawingChange?: (elements: DrawingElement[]) => void;
  onValidationChange?: (validation: ValidationResult) => void;
}

const defaultMaterials: MaterialProperties[] = [
  { name: 'Béton', thermalConductivity: 2.3, defaultThickness: 200, color: '#808080' },
  { name: 'Isolation', thermalConductivity: 0.035, defaultThickness: 100, color: '#FFE4B5' },
  { name: 'Brique', thermalConductivity: 0.84, defaultThickness: 200, color: '#CD5C5C' },
  { name: 'Acier', thermalConductivity: 50, defaultThickness: 5, color: '#B8B8B8' },
];

const defaultLayers: Layer[] = [
  { id: 'construction', name: 'Construction', color: '#000000', visible: true, locked: false }
];

export default function ThermalBridgeDrawing({
  width,
  height,
  onDrawingChange,
  onValidationChange
}: ThermalBridgeDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformComponentRef = useRef(null);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    elements: [],
    layers: defaultLayers,
    selectedIds: [],
    activeLayer: 'construction',
    viewport: { scale: 1, offset: { x: 0, y: 0 } }
  });
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [gridSize, setGridSize] = useState(20);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Sélectionner' },
    { id: 'move', icon: Move, label: 'Déplacer' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' }
  ];

  const calculateDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const assignMaterial = useCallback((elementId: string, material: MaterialProperties) => {
    setDrawingState(prev => {
      const newElements = prev.elements.map(element => {
        if (element.id === elementId) {
          return {
            ...element,
            properties: {
              ...element.properties,
              material,
              thickness: material.defaultThickness,
              thermalConductivity: material.thermalConductivity
            },
            style: {
              ...element.style,
              fillColor: material.color + '80',
              color: material.color
            }
          };
        }
        return element;
      });

      if (onDrawingChange) {
        onDrawingChange(newElements);
      }

      return {
        ...prev,
        elements: newElements
      };
    });
  }, [onDrawingChange]);

  const updateSelectedElementMaterial = useCallback((updates: Partial<MaterialProperties>) => {
    if (drawingState.selectedIds.length === 0) return;

    const elementId = drawingState.selectedIds[0];
    const element = drawingState.elements.find(e => e.id === elementId);
    if (!element || !element.properties.material) return;

    const updatedMaterial = {
      ...element.properties.material,
      ...updates
    };

    assignMaterial(elementId, updatedMaterial);
  }, [drawingState.selectedIds, drawingState.elements, assignMaterial]);

  const startDrawing = useCallback((point: Point) => {
    if (!canvasRef.current || currentTool !== 'rectangle') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const worldPoint = screenToWorld(
      { x: point.x - rect.left, y: point.y - rect.top },
      drawingState.viewport
    );
    const snappedPoint = snapEnabled ? snapToGrid(worldPoint, gridSize) : worldPoint;

    const newElement: DrawingElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'rectangle',
      layerId: drawingState.activeLayer,
      points: [snappedPoint, snappedPoint],
      properties: {},
      style: {
        color: '#000000',
        lineWidth: 2
      }
    };

    setCurrentElement(newElement);
    setIsDrawing(true);
  }, [currentTool, drawingState.activeLayer, drawingState.viewport, gridSize, snapEnabled]);

  const continueDrawing = useCallback((point: Point) => {
    if (!isDrawing || !currentElement || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const worldPoint = screenToWorld(
      { x: point.x - rect.left, y: point.y - rect.top },
      drawingState.viewport
    );
    const snappedPoint = snapEnabled ? snapToGrid(worldPoint, gridSize) : worldPoint;

    setCurrentElement(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [prev.points[0], snappedPoint]
      };
    });
  }, [currentElement, drawingState.viewport, gridSize, isDrawing, snapEnabled]);

  const finishDrawing = useCallback(() => {
    if (!currentElement || !currentElement.points[0] || !currentElement.points[1]) return;

    const width = Math.abs(currentElement.points[1].x - currentElement.points[0].x);
    const height = Math.abs(currentElement.points[1].y - currentElement.points[0].y);

    if (width > 0 && height > 0) {
      const finalElement = {
        ...currentElement,
        isClosed: true
      };

      setDrawingState(prev => {
        const newElements = [...prev.elements, finalElement];
        if (onDrawingChange) {
          onDrawingChange(newElements);
        }
        return {
          ...prev,
          elements: newElements,
          selectedIds: [finalElement.id]
        };
      });

      const validation = validateDrawing([...drawingState.elements, finalElement]);
      if (onValidationChange) {
        onValidationChange(validation);
      }
    }

    setCurrentElement(null);
    setIsDrawing(false);
  }, [currentElement, drawingState.elements, onDrawingChange, onValidationChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isPanning || currentTool === 'move') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX,
      y: e.clientY
    };

    if (currentTool === 'select') {
      const worldPoint = screenToWorld(
        { x: point.x - rect.left, y: point.y - rect.top },
        drawingState.viewport
      );
      const clickedElement = findElementAtPoint(worldPoint, drawingState.elements);
      
      if (clickedElement) {
        setDrawingState(prev => ({
          ...prev,
          selectedIds: [clickedElement.id]
        }));
      } else {
        setDrawingState(prev => ({
          ...prev,
          selectedIds: []
        }));
      }
    } else if (currentTool === 'rectangle') {
      e.preventDefault();
      startDrawing(point);
    }
  }, [currentTool, drawingState.viewport, drawingState.elements, isPanning, startDrawing]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isPanning || currentTool === 'move') return;

    if (isDrawing) {
      e.preventDefault();
      continueDrawing({ x: e.clientX, y: e.clientY });
    }
  }, [isDrawing, continueDrawing, isPanning, currentTool]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      e.preventDefault();
      finishDrawing();
    }
  }, [isDrawing, finishDrawing]);

  const findElementAtPoint = (point: Point, elements: DrawingElement[]): DrawingElement | null => {
    return elements.find(element => {
      if (element.points.length !== 2) return false;

      const [p1, p2] = element.points;
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);

      return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
    }) || null;
  };

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const { scale, offset } = drawingState.viewport;
    
    ctx.beginPath();
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 0.5;

    const startX = Math.floor(-offset.x / (gridSize * scale)) * gridSize;
    const startY = Math.floor(-offset.y / (gridSize * scale)) * gridSize;
    const endX = Math.ceil((width - offset.x) / (gridSize * scale)) * gridSize;
    const endY = Math.ceil((height - offset.y) / (gridSize * scale)) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = x * scale + offset.x;
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, height);
    }

    for (let y = startY; y <= endY; y += gridSize) {
      const screenY = y * scale + offset.y;
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
    }

    ctx.stroke();
  }, [drawingState.viewport, gridSize, width, height]);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (element.type !== 'rectangle') return;

    const [p1, p2] = element.points.map(p => worldToScreen(p, drawingState.viewport));
    
    ctx.beginPath();
    ctx.strokeStyle = element.style.color;
    ctx.lineWidth = element.style.lineWidth;

    const width = p2.x - p1.x;
    const height = p2.y - p1.y;

    if (element.style.fillColor) {
      ctx.fillStyle = element.style.fillColor;
      ctx.fillRect(p1.x, p1.y, width, height);
    }

    ctx.strokeRect(p1.x, p1.y, width, height);

    // Draw dimensions
    const widthInMm = Math.abs(element.points[1].x - element.points[0].x);
    const heightInMm = Math.abs(element.points[1].y - element.points[0].y);

    // Draw width dimension
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#2563EB';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.round(widthInMm)} mm`,
      p1.x + width / 2,
      p1.y - 5
    );

    // Draw height dimension
    ctx.fillText(
      `${Math.round(heightInMm)} mm`,
      p1.x - 5,
      p1.y + height / 2
    );

    // Draw material info if present
    if (element.properties.material) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${element.properties.material.name}`,
        p1.x + width / 2,
        p1.y + height / 2 - 10
      );
      ctx.fillText(
        `λ=${element.properties.material.thermalConductivity} W/m·K`,
        p1.x + width / 2,
        p1.y + height / 2 + 10
      );
    }
  }, [drawingState.viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    drawGrid(ctx);

    drawingState.elements.forEach(element => {
      drawElement(ctx, element);
    });

    if (currentElement) {
      drawElement(ctx, currentElement);
    }

    drawingState.selectedIds.forEach(id => {
      const element = drawingState.elements.find(e => e.id === id);
      if (element) {
        const [p1, p2] = element.points.map(p => worldToScreen(p, drawingState.viewport));
        ctx.strokeStyle = '#FCD34D';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        ctx.setLineDash([]);
      }
    });
  }, [drawingState, currentElement, width, height, drawGrid, drawElement]);

  const selectedElement = drawingState.selectedIds.length > 0
    ? drawingState.elements.find(e => e.id === drawingState.selectedIds[0])
    : null;

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id)}
                className={`p-2 rounded ${
                  currentTool === tool.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
                title={tool.label}
              >
                <tool.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        {drawingState.selectedIds.length > 0 && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Supprimer les éléments sélectionnés"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-gray-500 mb-6">
              Êtes-vous sûr de vouloir supprimer {drawingState.selectedIds.length} élément(s) ?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const newElements = drawingState.elements.filter(
                    element => !drawingState.selectedIds.includes(element.id)
                  );
                  setDrawingState(prev => ({
                    ...prev,
                    elements: newElements,
                    selectedIds: []
                  }));
                  if (onDrawingChange) {
                    onDrawingChange(newElements);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="relative border rounded-lg overflow-hidden flex-grow">
          <TransformWrapper
            ref={transformComponentRef}
            initialScale={1}
            minScale={0.1}
            maxScale={5}
            disabled={isDrawing || currentTool !== 'move'}
            onPanning={() => setIsPanning(true)}
            onPanningStop={() => setIsPanning(false)}
            onZoom={({ state }) => {
              setDrawingState(prev => ({
                ...prev,
                viewport: {
                  ...prev.viewport,
                  scale: state.scale
                }
              }));
            }}
          >
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%'
              }}
            >
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="bg-white"
                style={{ touchAction: 'none' }}
              />
            </TransformComponent>
          </TransformWrapper>
        </div>

        {selectedElement && selectedElement.isClosed && (
          <div className="w-80 bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-medium">Propriétés du Matériau</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du Matériau
                </label>
                <input
                  type="text"
                  value={selectedElement.properties.material?.name || ''}
                  onChange={(e) => updateSelectedElementMaterial({ name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ex: Béton, Isolation..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conductivité Thermique (λ)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={selectedElement.properties.material?.thermalConductivity || 0}
                    onChange={(e) => updateSelectedElementMaterial({ thermalConductivity: parseFloat(e.target.value) })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    step="0.001"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">W/m·K</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Épaisseur
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={selectedElement.properties.material?.defaultThickness || 0}
                    onChange={(e) => updateSelectedElementMaterial({ defaultThickness: parseFloat(e.target.value) })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    step="1"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">mm</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Couleur
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedElement.properties.material?.color || '#808080'}
                    onChange={(e) => updateSelectedElementMaterial({ color: e.target.value })}
                    className="h-10 w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">
                    {selectedElement.properties.material?.color || '#808080'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Matériaux Prédéfinis</h4>
              <div className="grid grid-cols-2 gap-2">
                {defaultMaterials.map((material) => (
                  <button
                    key={material.name}
                    onClick={() => {
                      drawingState.selectedIds.forEach(id => {
                        assignMaterial(id, material);
                      });
                    }}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 border border-gray-200"
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: material.color }}
                    />
                    <span className="text-sm">{material.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}