import { useRef } from 'react';
import { useCircuitRenderer } from '@/features/circuit/hooks/useCircuitRenderer';
import { useCircuitStateById } from '@/features/circuit/store/CircuitStoreContext';
import { getMaxDepth } from '@/features/gates/utils';
import type { Project } from '@/stores/projectsStore';

interface CircuitThumbnailProps {
  project: Project;
  className?: string;
}

export function CircuitThumbnail({ project, className = '' }: CircuitThumbnailProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const activeCircuitId = project.activeCircuitId;
  const circuitState = useCircuitStateById(activeCircuitId || '');

  const hasGates = circuitState && circuitState.placedGates.length > 0;
  const maxDepth = hasGates ? getMaxDepth(circuitState.placedGates) + 1 : 3;

  useCircuitRenderer({
    svgRef,
    numQubits: circuitState?.numQubits || 5,
    maxDepth: Math.max(3, maxDepth),
    placedGates: circuitState?.placedGates || [],
    selectedGateIdsKey: '',
    scrollContainerWidth: 300,
    showNestedCircuit: false,
    isExecuting: false,
  });

  // Conditional rendering AFTER all hooks
  if (!hasGates) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="text-muted-foreground text-xs">
          {project.circuits.length > 0
            ? `${project.circuits.length} ${project.circuits.length === 1 ? 'circuit' : 'circuits'}`
            : 'No circuits yet'
          }
        </span>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        transform: 'scale(0.8)',
        transformOrigin: 'center',
      }}
    />
  );
}