import { Point, DrawingElement, MaterialProperties } from '../types/thermal';

// Constantes pour les coefficients d'échange surfacique
export const INTERIOR_HEAT_TRANSFER_COEFFICIENT = 7.7; // W/m²K
export const EXTERIOR_HEAT_TRANSFER_COEFFICIENT = 25.0; // W/m²K

// Interface pour les éléments du maillage
export interface MeshNode {
  id: number;
  x: number;
  y: number;
  temperature: number;
  fixed: boolean; // Indique si c'est un nœud avec température imposée
  isBoundary: boolean;
  boundaryType?: 'interior' | 'exterior' | 'adiabatic';
}

export interface MeshElement {
  id: number;
  nodes: [number, number, number]; // Indices des 3 nœuds du triangle
  material: MaterialProperties;
}

export interface Mesh {
  nodes: MeshNode[];
  elements: MeshElement[];
}

// Structure pour stocker les résultats de simulation
export interface ThermalSimulationResult {
  nodes: MeshNode[];
  elements: MeshElement[];
  minTemperature: number;
  maxTemperature: number;
  isotherms: number[];
  psiValue: number;
  fRsiValue: number;
  fluxValues: { x: number, y: number, magnitude: number }[];
}

// Fonction pour générer un maillage à partir des éléments de dessin
export const generateMesh = (
  drawingElements: DrawingElement[],
  meshSize: number = 3, // Taille de base du maillage en mm
  adaptiveFactor: number = 0.3, // Facteur de raffinement adaptatif
  interiorTemp: number = 20,
  exteriorTemp: number = 0
): Mesh => {
  // Initialisation du maillage
  const nodes: MeshNode[] = [];
  const elements: MeshElement[] = [];
  
  // Détermination des limites du domaine
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  drawingElements.forEach(element => {
    element.points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });
  
  // Agrandissement du domaine pour inclure les conditions aux limites
  const margin = meshSize * 5;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;
  
  // Création d'une grille de nœuds de base
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Nombre de nœuds dans chaque direction
  const nx = Math.ceil(width / meshSize) + 1;
  const ny = Math.ceil(height / meshSize) + 1;
  
  // Création des nœuds de la grille
  let nodeId = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = minX + i * (width / (nx - 1));
      const y = minY + j * (height / (ny - 1));
      
      // Détermination si le nœud est sur une frontière
      const isLeftBoundary = Math.abs(x - minX) < 0.001;
      const isRightBoundary = Math.abs(x - maxX) < 0.001;
      const isBottomBoundary = Math.abs(y - minY) < 0.001;
      const isTopBoundary = Math.abs(y - maxY) < 0.001;
      const isBoundary = isLeftBoundary || isRightBoundary || isBottomBoundary || isTopBoundary;
      
      // Par convention, l'extérieur est à gauche (isLeftBoundary)
      let boundaryType: 'interior' | 'exterior' | 'adiabatic' | undefined;
      let fixed = false;
      let temperature = 0;
      
      if (isLeftBoundary) {
        boundaryType = 'exterior';
        fixed = true;
        temperature = exteriorTemp;
      } else if (isRightBoundary) {
        boundaryType = 'interior';
        fixed = true;
        temperature = interiorTemp;
      } else if (isTopBoundary || isBottomBoundary) {
        boundaryType = 'adiabatic';
      }
      
      nodes.push({
        id: nodeId++,
        x,
        y,
        temperature,
        fixed,
        isBoundary,
        boundaryType
      });
    }
  }
  
  // Raffinement adaptatif près des jonctions
  // On ajoute des nœuds supplémentaires près des intersections entre éléments
  const junctions: Point[] = findJunctions(drawingElements);
  
  junctions.forEach(junction => {
    const junctionX = junction.x;
    const junctionY = junction.y;
    
    // Ajout de nœuds raffinés autour de la jonction
    const refinementRadius = meshSize * 5; // Rayon de la zone de raffinement
    const refinementSize = meshSize * adaptiveFactor; // Taille du maillage raffiné
    
    // Nombre de nœuds raffinés
    const refinementNx = Math.ceil(2 * refinementRadius / refinementSize);
    const refinementNy = Math.ceil(2 * refinementRadius / refinementSize);
    
    for (let j = 0; j <= refinementNy; j++) {
      for (let i = 0; i <= refinementNx; i++) {
        const x = junctionX - refinementRadius + i * refinementSize;
        const y = junctionY - refinementRadius + j * refinementSize;
        
        // Vérifier si le nœud est dans le domaine
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          // Vérifier qu'il n'est pas trop proche d'un nœud existant
          const tooClose = nodes.some(node => 
            Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)) < refinementSize / 2
          );
          
          if (!tooClose) {
            nodes.push({
              id: nodeId++,
              x,
              y,
              temperature: 0,
              fixed: false,
              isBoundary: false
            });
          }
        }
      }
    }
  });
  
  // Création des éléments triangulaires par triangulation de Delaunay
  // Pour simplifier, on utilise une approche basée sur la triangulation d'une grille
  // En production, on utiliserait une bibliothèque de triangulation comme Delaunator
  
  // Création des éléments pour chaque carré de la grille
  let elementId = 0;
  
  // Pour simplifier, nous allons créer des triangles simples basés sur la grille
  // Dans une implémentation complète, une vraie triangulation de Delaunay serait utilisée
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const bottomLeft = j * nx + i;
      const bottomRight = j * nx + i + 1;
      const topLeft = (j + 1) * nx + i;
      const topRight = (j + 1) * nx + i + 1;
      
      // Déterminer le matériau à ce point
      // Pour simplifier, on utilise le matériau du premier élément qui contient ce point
      // Dans une implémentation réelle, on ferait une analyse plus précise
      const centerX = (nodes[bottomLeft].x + nodes[topRight].x) / 2;
      const centerY = (nodes[bottomLeft].y + nodes[topRight].y) / 2;
      
      const material = findMaterialAtPoint(drawingElements, { x: centerX, y: centerY }) || {
        name: 'Air',
        thermalConductivity: 0.025,
        defaultThickness: 0,
        color: '#FFFFFF'
      };
      
      // Création des deux triangles qui forment le carré
      elements.push({
        id: elementId++,
        nodes: [bottomLeft, bottomRight, topRight],
        material
      });
      
      elements.push({
        id: elementId++,
        nodes: [bottomLeft, topRight, topLeft],
        material
      });
    }
  }
  
  return { nodes, elements };
};

// Fonction pour trouver les jonctions entre éléments de dessin
const findJunctions = (elements: DrawingElement[]): Point[] => {
  const junctions: Point[] = [];
  const tolerance = 0.5; // Tolérance pour considérer des points comme coïncidents
  
  // Pour chaque paire d'éléments
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const element1 = elements[i];
      const element2 = elements[j];
      
      // Vérifier chaque paire de points
      for (const point1 of element1.points) {
        for (const point2 of element2.points) {
          const distance = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
          
          if (distance < tolerance) {
            // Vérifier si ce point n'est pas déjà dans la liste des jonctions
            const isNew = !junctions.some(junction => 
              Math.sqrt(Math.pow(junction.x - point1.x, 2) + Math.pow(junction.y - point1.y, 2)) < tolerance
            );
            
            if (isNew) {
              junctions.push({ x: point1.x, y: point1.y });
            }
          }
        }
      }
    }
  }
  
  return junctions;
};

// Fonction pour déterminer le matériau à un point donné
const findMaterialAtPoint = (elements: DrawingElement[], point: Point): MaterialProperties | null => {
  for (const element of elements) {
    if (element.type === 'rectangle' && element.properties.material) {
      // Vérifier si le point est à l'intérieur du rectangle
      const [p1, p2] = element.points;
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      
      if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
        return element.properties.material;
      }
    }
  }
  
  return null;
};

// Fonction pour résoudre le problème thermique par la méthode des éléments finis
export const solveHeatTransfer = (mesh: Mesh, maxIterations: number = 1000, tolerance: number = 1e-6): ThermalSimulationResult => {
  const { nodes, elements } = mesh;
  const n = nodes.length;
  
  // Matrice de conductance globale (sparse)
  const K: { [key: string]: number } = {};
  
  // Vecteur des seconds membres
  const F = new Array(n).fill(0);
  
  // Assemblage de la matrice de conductance et du vecteur des seconds membres
  for (const element of elements) {
    const [i, j, k] = element.nodes;
    const ni = nodes[i];
    const nj = nodes[j];
    const nk = nodes[k];
    
    // Calcul de l'aire du triangle
    const area = 0.5 * Math.abs((nj.x - ni.x) * (nk.y - ni.y) - (nk.x - ni.x) * (nj.y - ni.y));
    
    // Matrice de conductance élémentaire
    const conductivity = element.material.thermalConductivity;
    
    // Gradients des fonctions de forme
    const bi = nj.y - nk.y;
    const bj = nk.y - ni.y;
    const bk = ni.y - nj.y;
    
    const ci = nk.x - nj.x;
    const cj = ni.x - nk.x;
    const ck = nj.x - ni.x;
    
    // Construction de la matrice élémentaire
    const factor = conductivity / (4 * area);
    
    // Ajout à la matrice globale (format sparse)
    addToSparseMatrix(K, i, i, factor * (bi * bi + ci * ci));
    addToSparseMatrix(K, i, j, factor * (bi * bj + ci * cj));
    addToSparseMatrix(K, i, k, factor * (bi * bk + ci * ck));
    
    addToSparseMatrix(K, j, i, factor * (bj * bi + cj * ci));
    addToSparseMatrix(K, j, j, factor * (bj * bj + cj * cj));
    addToSparseMatrix(K, j, k, factor * (bj * bk + cj * ck));
    
    addToSparseMatrix(K, k, i, factor * (bk * bi + ck * ci));
    addToSparseMatrix(K, k, j, factor * (bk * bj + ck * cj));
    addToSparseMatrix(K, k, k, factor * (bk * bk + ck * ck));
  }
  
  // Prise en compte des conditions aux limites
  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    
    if (node.fixed) {
      // Conditions de Dirichlet (température imposée)
      // Remise à zéro de la ligne et de la colonne
      for (let j = 0; j < n; j++) {
        deleteFromSparseMatrix(K, i, j);
        deleteFromSparseMatrix(K, j, i);
      }
      
      // Mise à 1 de la diagonale
      addToSparseMatrix(K, i, i, 1.0);
      F[i] = node.temperature;
    } else if (node.isBoundary) {
      // Conditions de Neumann (flux imposé) ou Robin (échange convectif)
      if (node.boundaryType === 'interior') {
        // Condition de Robin pour l'intérieur
        addToSparseMatrix(K, i, i, INTERIOR_HEAT_TRANSFER_COEFFICIENT);
        F[i] += INTERIOR_HEAT_TRANSFER_COEFFICIENT * 20; // Température intérieure
      } else if (node.boundaryType === 'exterior') {
        // Condition de Robin pour l'extérieur
        addToSparseMatrix(K, i, i, EXTERIOR_HEAT_TRANSFER_COEFFICIENT);
        F[i] += EXTERIOR_HEAT_TRANSFER_COEFFICIENT * 0; // Température extérieure
      }
      // Pour les conditions adiabatiques, rien à faire (flux nul par défaut)
    }
  }
  
  // Résolution par méthode itérative de Gauss-Seidel
  let iteration = 0;
  let error = tolerance + 1;
  const T = nodes.map(node => node.temperature);
  
  while (iteration < maxIterations && error > tolerance) {
    error = 0;
    
    for (let i = 0; i < n; i++) {
      if (!nodes[i].fixed) {
        let sum = F[i];
        
        // Somme des contributions des autres nœuds
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const key = `${i}-${j}`;
            if (K[key]) {
              sum -= K[key] * T[j];
            }
          }
        }
        
        // Mise à jour de la température
        const newT = sum / K[`${i}-${i}`];
        error = Math.max(error, Math.abs(newT - T[i]));
        T[i] = newT;
      }
    }
    
    iteration++;
  }
  
  // Mise à jour des températures dans les nœuds
  for (let i = 0; i < n; i++) {
    nodes[i].temperature = T[i];
  }
  
  // Calcul des isothermes
  const minTemperature = Math.min(...T);
  const maxTemperature = Math.max(...T);
  const range = maxTemperature - minTemperature;
  const isotherms = Array.from({ length: 9 }, (_, i) => minTemperature + (i + 1) * range / 10);
  
  // Calcul du PSI (coefficient de pont thermique linéique)
  const psiValue = calculatePsiValue(mesh, minTemperature, maxTemperature);
  
  // Calcul du facteur fRsi (facteur de température de surface)
  const fRsiValue = calculateFRsiValue(mesh, minTemperature, maxTemperature);
  
  // Calcul des flux thermiques locaux
  const fluxValues = calculateHeatFlux(mesh);
  
  return {
    nodes,
    elements,
    minTemperature,
    maxTemperature,
    isotherms,
    psiValue,
    fRsiValue,
    fluxValues
  };
};

// Fonctions utilitaires pour la matrice sparse
const addToSparseMatrix = (matrix: { [key: string]: number }, i: number, j: number, value: number) => {
  const key = `${i}-${j}`;
  matrix[key] = (matrix[key] || 0) + value;
};

const deleteFromSparseMatrix = (matrix: { [key: string]: number }, i: number, j: number) => {
  const key = `${i}-${j}`;
  delete matrix[key];
};

// Calcul du coefficient PSI (pont thermique linéique)
const calculatePsiValue = (mesh: Mesh, minTemp: number, maxTemp: number): number => {
  // Dans une simulation 2D, le coefficient PSI est calculé comme la différence entre
  // le flux thermique total simulé et la somme des flux thermiques 1D à travers les parois
  
  // Pour une implémentation simplifiée, nous allons estimer le PSI à partir de 
  // la distribution de température et des propriétés des matériaux
  
  // Estimation du flux thermique total
  const totalHeatFlow = estimateTotalHeatFlow(mesh);
  
  // Estimation des flux thermiques 1D
  const oneDimensionalHeatFlow = estimateOneDimensionalHeatFlow(mesh, minTemp, maxTemp);
  
  // Calcul du PSI (W/m·K)
  // Pour un pont thermique de 1 mètre de profondeur
  return totalHeatFlow - oneDimensionalHeatFlow;
};

// Calcul du facteur fRsi (facteur de température de surface)
const calculateFRsiValue = (mesh: Mesh, minTemp: number, maxTemp: number): number => {
  // Le facteur fRsi est défini comme: fRsi = (Tsi - Te) / (Ti - Te)
  // où Tsi est la température de surface intérieure minimale
  // Ti est la température intérieure
  // Te est la température extérieure
  
  // Recherche de la température de surface intérieure minimale
  let minSurfaceTemp = maxTemp;
  
  mesh.nodes.forEach(node => {
    if (node.isBoundary && node.boundaryType === 'interior') {
      minSurfaceTemp = Math.min(minSurfaceTemp, node.temperature);
    }
  });
  
  // Calcul du facteur fRsi
  return (minSurfaceTemp - minTemp) / (maxTemp - minTemp);
};

// Calcul des flux thermiques
const calculateHeatFlux = (mesh: Mesh) => {
  const { nodes, elements } = mesh;
  const fluxValues: { x: number, y: number, magnitude: number }[] = [];
  
  // Calcul du flux thermique pour chaque élément
  elements.forEach(element => {
    const [i, j, k] = element.nodes;
    const ni = nodes[i];
    const nj = nodes[j];
    const nk = nodes[k];
    
    // Aire du triangle
    const area = 0.5 * Math.abs((nj.x - ni.x) * (nk.y - ni.y) - (nk.x - ni.x) * (nj.y - ni.y));
    
    // Gradients des fonctions de forme
    const bi = nj.y - nk.y;
    const bj = nk.y - ni.y;
    const bk = ni.y - nj.y;
    
    const ci = nk.x - nj.x;
    const cj = ni.x - nk.x;
    const ck = nj.x - ni.x;
    
    // Gradient de température
    const gradTx = (bi * ni.temperature + bj * nj.temperature + bk * nk.temperature) / (2 * area);
    const gradTy = (ci * ni.temperature + cj * nj.temperature + ck * nk.temperature) / (2 * area);
    
    // Flux thermique (q = -k * grad T)
    const conductivity = element.material.thermalConductivity;
    const qx = -conductivity * gradTx;
    const qy = -conductivity * gradTy;
    const magnitude = Math.sqrt(qx * qx + qy * qy);
    
    // Centre de l'élément
    const centerX = (ni.x + nj.x + nk.x) / 3;
    const centerY = (ni.y + nj.y + nk.y) / 3;
    
    fluxValues.push({
      x: centerX,
      y: centerY,
      magnitude
    });
  });
  
  return fluxValues;
};

// Estimation du flux thermique total
const estimateTotalHeatFlow = (mesh: Mesh): number => {
  let totalFlow = 0;
  
  // Calcul du flux à travers la frontière intérieure
  mesh.nodes.forEach(node => {
    if (node.isBoundary && node.boundaryType === 'interior') {
      // Trouver tous les éléments connectés à ce nœud
      const connectedElements = mesh.elements.filter(element => 
        element.nodes.includes(node.id)
      );
      
      // Estimation du flux sortant
      let localFlow = 0;
      
      connectedElements.forEach(element => {
        const [i, j, k] = element.nodes;
        const ni = mesh.nodes[i];
        const nj = mesh.nodes[j];
        const nk = mesh.nodes[k];
        
        // Aire du triangle
        const area = 0.5 * Math.abs((nj.x - ni.x) * (nk.y - ni.y) - (nk.x - ni.x) * (nj.y - ni.y));
        
        // Gradient approximatif
        const dT = Math.abs(node.temperature - (ni.temperature + nj.temperature + nk.temperature) / 3);
        const dx = Math.sqrt(area); // Distance caractéristique
        
        // Flux local
        const conductivity = element.material.thermalConductivity;
        localFlow += conductivity * (dT / dx) * Math.sqrt(area);
      });
      
      totalFlow += localFlow;
    }
  });
  
  return totalFlow;
};

// Estimation des flux thermiques 1D
const estimateOneDimensionalHeatFlow = (mesh: Mesh, minTemp: number, maxTemp: number): number => {
  let oneDFlow = 0;
  
  // Identification des parois principales
  // Pour simplifier, on considère que les parties extérieures du maillage représentent les parois
  
  // Regroupement des nœuds par position y pour identifier les parois horizontales
  const tolerance = 5; // Tolérance en mm pour regrouper les nœuds
  const horizontalWalls: { y: number, nodes: MeshNode[] }[] = [];
  
  // Trouver toutes les parois horizontales
  mesh.nodes.forEach(node => {
    if (node.isBoundary) {
      // Chercher si une paroi existe déjà à cette position y
      const existingWall = horizontalWalls.find(wall => 
        Math.abs(wall.y - node.y) < tolerance
      );
      
      if (existingWall) {
        existingWall.nodes.push(node);
      } else {
        horizontalWalls.push({
          y: node.y,
          nodes: [node]
        });
      }
    }
  });
  
  // Calcul du flux 1D pour chaque paroi
  horizontalWalls.forEach(wall => {
    // Trier les nœuds par position x
    const sortedNodes = [...wall.nodes].sort((a, b) => a.x - b.x);
    
    // Trouver les nœuds extérieurs et intérieurs
    const exteriorNodes = sortedNodes.filter(node => node.boundaryType === 'exterior');
    const interiorNodes = sortedNodes.filter(node => node.boundaryType === 'interior');
    
    if (exteriorNodes.length > 0 && interiorNodes.length > 0) {
      // Distance entre parois
      const avgExteriorX = exteriorNodes.reduce((sum, node) => sum + node.x, 0) / exteriorNodes.length;
      const avgInteriorX = interiorNodes.reduce((sum, node) => sum + node.x, 0) / interiorNodes.length;
      const wallThickness = Math.abs(avgInteriorX - avgExteriorX);
      
      // Identifer les matériaux traversés
      const elementsInWall = findElementsInRegion(
        mesh,
        Math.min(avgExteriorX, avgInteriorX),
        wall.y - tolerance,
        Math.max(avgExteriorX, avgInteriorX),
        wall.y + tolerance
      );
      
      // Résistance thermique équivalente
      const materials = elementsInWall.map(element => element.material);
      const uniqueMaterials = materials.filter((material, index, self) => 
        index === self.findIndex(m => m.name === material.name)
      );
      
      let equivalentR = 0;
      
      uniqueMaterials.forEach(material => {
        // Estimation de l'épaisseur de ce matériau dans la paroi
        const materialElements = elementsInWall.filter(element => 
          element.material.name === material.name
        );
        
        const materialThickness = wallThickness * (materialElements.length / elementsInWall.length);
        equivalentR += materialThickness / material.thermalConductivity;
      });
      
      // Ajout des résistances superficielles
      equivalentR += 1 / INTERIOR_HEAT_TRANSFER_COEFFICIENT + 1 / EXTERIOR_HEAT_TRANSFER_COEFFICIENT;
      
      // Coefficient U équivalent
      const uValue = 1 / equivalentR;
      
      // Longueur de la paroi
      const wallLength = sortedNodes.length * tolerance; // Approximation
      
      // Flux thermique 1D
      const tempDiff = maxTemp - minTemp;
      oneDFlow += uValue * wallLength * tempDiff;
    }
  });
  
  return oneDFlow;
};

// Fonction pour trouver les éléments dans une région rectangulaire
const findElementsInRegion = (
  mesh: Mesh,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): MeshElement[] => {
  // Un élément est considéré dans la région si son centre est dans la région
  return mesh.elements.filter(element => {
    const [i, j, k] = element.nodes;
    const ni = mesh.nodes[i];
    const nj = mesh.nodes[j];
    const nk = mesh.nodes[k];
    
    const centerX = (ni.x + nj.x + nk.x) / 3;
    const centerY = (ni.y + nj.y + nk.y) / 3;
    
    return centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY;
  });
};