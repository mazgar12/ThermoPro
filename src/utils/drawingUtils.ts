import { Point, DrawingElement, Viewport, ValidationResult } from '../types/thermal';

export const snapToGrid = (point: Point, gridSize: number): Point => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
};

export const screenToWorld = (point: Point, viewport: Viewport): Point => {
  return {
    x: (point.x - viewport.offset.x) / viewport.scale,
    y: (point.y - viewport.offset.y) / viewport.scale
  };
};

export const worldToScreen = (point: Point, viewport: Viewport): Point => {
  return {
    x: point.x * viewport.scale + viewport.offset.x,
    y: point.y * viewport.scale + viewport.offset.y
  };
};

export const calculateDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const validateDrawing = (elements: DrawingElement[]): ValidationResult => {
  const errors: ValidationResult['errors'] = [];

  elements.forEach(element => {
    // Validate geometry
    if (element.points.length < 2) {
      errors.push({
        elementId: element.id,
        message: 'Element must have at least 2 points',
        type: 'error'
      });
    }

    // Validate material properties
    if (element.type === 'wall' || element.type === 'insulation') {
      if (!element.properties.material) {
        errors.push({
          elementId: element.id,
          message: 'Material must be specified',
          type: 'error'
        });
      }
      if (!element.properties.thickness || element.properties.thickness <= 0) {
        errors.push({
          elementId: element.id,
          message: 'Invalid thickness value',
          type: 'error'
        });
      }
      if (!element.properties.thermalConductivity || element.properties.thermalConductivity <= 0) {
        errors.push({
          elementId: element.id,
          message: 'Invalid thermal conductivity value',
          type: 'error'
        });
      }
    }

    // Validate connections
    if (element.type === 'wall' || element.type === 'insulation') {
      const connections = findConnections(element, elements);
      if (connections.length === 0) {
        errors.push({
          elementId: element.id,
          message: 'Element is not connected to any other element',
          type: 'warning'
        });
      }
    }
  });

  return {
    isValid: errors.filter(e => e.type === 'error').length === 0,
    errors
  };
};

export const findConnections = (
  element: DrawingElement,
  allElements: DrawingElement[]
): DrawingElement[] => {
  const connections: DrawingElement[] = [];
  const tolerance = 0.1; // Connection tolerance in world units

  allElements.forEach(other => {
    if (other.id === element.id) return;

    // Check if any points are close enough to be considered connected
    element.points.forEach(p1 => {
      other.points.forEach(p2 => {
        if (calculateDistance(p1, p2) <= tolerance) {
          connections.push(other);
        }
      });
    });
  });

  return connections;
};

export const exportDrawing = (elements: DrawingElement[]): string => {
  const drawingData = {
    version: '1.0',
    elements: elements.map(element => ({
      ...element,
      points: element.points.map(p => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 }))
    }))
  };

  return JSON.stringify(drawingData, null, 2);
};

export const importDrawing = (data: string): DrawingElement[] => {
  try {
    const parsed = JSON.parse(data);
    if (!parsed.elements || !Array.isArray(parsed.elements)) {
      throw new Error('Invalid drawing data format');
    }
    return parsed.elements;
  } catch (error) {
    console.error('Failed to import drawing:', error);
    return [];
  }
};